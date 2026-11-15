import base64
import binascii
import io
import json
import math
import re
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from schemas import Activity, EmotionScores, Telemetry

Image.MAX_IMAGE_PIXELS = 40_000_000
MAX_DECODED_BYTES = 8 * 1024 * 1024

FORBIDDEN_RE = re.compile(
    r"\b(diagnos\w*|disorder\w*|depress\w*|ptsd|bipolar|ocd|adhd|illness\w*|medicat\w*|prescri\w*)\b",
    re.I,
)


class GateRejection(Exception):
    def __init__(self, message: str, telemetry: Telemetry | None = None):
        super().__init__(message)
        self.message = message
        self.telemetry = telemetry


def decode_image(image_base64: str) -> Image.Image:
    """Decodes raw base64 string, validates size and dimensions, and returns clean RGB PIL Image."""
    try:
        raw_bytes = base64.b64decode(image_base64, validate=True)
    except (binascii.Error, ValueError) as err:
        raise GateRejection("We couldn't read that photo—could you try snapping it again?") from err

    if len(raw_bytes) > MAX_DECODED_BYTES:
        raise GateRejection("We couldn't read that photo—could you try snapping it again?")

    try:
        # Verify integrity first
        verify_img = Image.open(io.BytesIO(raw_bytes))
        verify_img.verify()

        # Reopen for actual processing (verify closes/invalidates the image stream)
        img = Image.open(io.BytesIO(raw_bytes))
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Exception) as err:
        raise GateRejection("We couldn't read that photo—could you try snapping it again?") from err

    if img.width < 32 or img.height < 32:
        raise GateRejection("We couldn't read that photo—could you try snapping it again?")

    return img


def clean_jpeg_bytes(img: Image.Image) -> bytes:
    """Re-encodes image to JPEG quality 90 in RAM without EXIF metadata."""
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def ink_mask_of(gray: np.ndarray) -> np.ndarray:
    """Marks that stand out from the page: darker ink on paper, or light lines on a dark tablet, chalkboard or card."""
    return np.abs(gray - float(np.median(gray))) > 40.0


def compute_telemetry(img: Image.Image, timer_duration_sec: int) -> tuple[Telemetry, np.ndarray]:
    """Computes grayscale brightness, contrast std dev, and ink density ratio."""
    gray = np.asarray(img.convert("L"), dtype=np.float32)
    mean_lum = float(round(float(gray.mean()), 1))
    contrast_std = float(round(float(gray.std()), 1))

    ink_mask = ink_mask_of(gray)
    ink_density_ratio = float(round(float(ink_mask.mean()), 3))

    telemetry = Telemetry(
        mean_luminance=mean_lum,
        contrast_std=contrast_std,
        ink_density_ratio=ink_density_ratio,
        timer_duration_sec=timer_duration_sec,
    )
    return telemetry, gray


def check_quality(t: Telemetry) -> str | None:
    """SPEC §5 Layer 1 input gate checks. Checked in order: dark, glare, blank."""
    # Dark check: mean luminance < 15
    if t.mean_luminance < 15.0:
        return "The lighting is a bit dim—could you snap your paper in slightly brighter light?"

    # Glare check: mean > 250 and std < 5
    if t.mean_luminance > 250.0 and t.contrast_std < 5.0:
        return "There's a lot of glare on the page—could you tilt it slightly away from the light?"

    # Blank check: ink density < 0.003
    if t.ink_density_ratio < 0.003:
        return "We couldn't find your lines yet—could you move a little closer to your sketch?"

    return None


def stroke_scores(
    gray: np.ndarray,
    ink_mask: np.ndarray | None = None,
    timer_duration_sec: int = 30,
) -> tuple[EmotionScores, list[str]]:
    """Deterministic heuristics using NumPy stroke geometry and rate calculations."""
    if ink_mask is None:
        ink_mask = ink_mask_of(gray)

    total_pixels = gray.size
    ink_pixels = int(ink_mask.sum())
    density = float(ink_pixels / max(total_pixels, 1))
    timer = max(timer_duration_sec, 1)
    density_per_sec = density / timer

    # 1. Angularity: mean of absolute second difference of gradient direction on ink pixels
    if ink_pixels > 0 and gray.shape[0] >= 4 and gray.shape[1] >= 4:
        gy, gx = np.gradient(gray)
        grad_dir = np.arctan2(gy, gx)
        d2y, _ = np.gradient(np.gradient(grad_dir)[0])
        _, d2x = np.gradient(np.gradient(grad_dir)[1])
        second_diff = np.abs(d2y) + np.abs(d2x)
        raw_ang = float(second_diff[ink_mask].mean())
        ang_norm = float(np.clip(raw_ang / 1.2, 0.0, 1.0))
    else:
        ang_norm = 0.0

    # 2. Center concentration: ink share inside the central 50% box
    h, w = gray.shape
    r_start, r_end = h // 4, 3 * h // 4
    c_start, c_end = w // 4, 3 * w // 4
    if ink_pixels > 0:
        center_ink = int(ink_mask[r_start:r_end, c_start:c_end].sum())
        center_conc = float(center_ink / ink_pixels)
    else:
        center_conc = 0.0

    # 3. Coverage spread: fraction of a 4x4 grid cells containing ink
    r_step = max(h // 4, 1)
    c_step = max(w // 4, 1)
    active_cells = 0
    for i in range(4):
        for j in range(4):
            sub = ink_mask[i * r_step : (i + 1) * r_step, j * c_step : (j + 1) * c_step]
            if sub.any():
                active_cells += 1
    coverage_spread = float(active_cells / 16.0)

    # Linear score mappings (clipped to [0.0, 1.0]):
    # stress: linear blend of stroke rate, absolute ink coverage, and central pressure concentration
    stress_val = float(np.clip(0.45 * min(density_per_sec * 60.0, 1.0) + 0.30 * min(density * 4.0, 1.0) + 0.25 * center_conc, 0.0, 1.0))
    # anxiety: linear blend of gradient angularity, dispersed corner placements, and fragmented coverage
    anxiety_val = float(np.clip(0.50 * ang_norm + 0.30 * (1.0 - center_conc) + 0.20 * (1.0 - coverage_spread), 0.0, 1.0))
    # mental_fatigue: inverse ink density ratio combined with sparse grid cell occupancy
    fatigue_val = float(np.clip(0.60 * (1.0 - min(density * 8.0, 1.0)) + 0.40 * (1.0 - coverage_spread), 0.0, 1.0))
    # calm_flow: broad spatial grid coverage combined with low angularity and relaxed center balance
    flow_val = float(np.clip(0.50 * coverage_spread + 0.30 * (1.0 - ang_norm) + 0.20 * (1.0 - abs(center_conc - 0.35)), 0.0, 1.0))
    # radiant_joy: expansive page spread, moderate steady ink density, and balanced rhythmic curvature
    joy_val = float(np.clip(0.50 * coverage_spread + 0.30 * min(density * 3.5, 1.0) + 0.20 * (1.0 - abs(ang_norm - 0.35)), 0.0, 1.0))

    scores = EmotionScores(
        stress=round(stress_val, 2),
        anxiety=round(anxiety_val, 2),
        mental_fatigue=round(fatigue_val, 2),
        calm_flow=round(flow_val, 2),
        radiant_joy=round(joy_val, 2),
    )

    ink_pct = int(round(density * 100))
    spread_pct = int(round(coverage_spread * 100))
    bullets = [
        f"Ink covers {ink_pct}% of the page in {timer_duration_sec}s",
        f"Stroke distribution spans {spread_pct}% of quadrants with {round(center_conc * 100, 1)}% central concentration",
        f"Line curvature rhythm reflects an angularity index of {round(ang_norm, 2)}",
    ]
    return scores, bullets


def scrub_clinical(text: str) -> str:
    """SPEC §5 Layer 3: Replaces clinical and diagnostic words with 'elevated visual tension'."""
    return FORBIDDEN_RE.sub("elevated visual tension", text)


def merge_scores(jev: EmotionScores, flash: EmotionScores) -> EmotionScores:
    """SPEC §2: Merges scores with 0.55 * jev + 0.45 * flash, rounded to 2 decimals."""
    return EmotionScores(
        stress=round(0.55 * jev.stress + 0.45 * flash.stress, 2),
        anxiety=round(0.55 * jev.anxiety + 0.45 * flash.anxiety, 2),
        mental_fatigue=round(0.55 * jev.mental_fatigue + 0.45 * flash.mental_fatigue, 2),
        calm_flow=round(0.55 * jev.calm_flow + 0.45 * flash.calm_flow, 2),
        radiant_joy=round(0.55 * jev.radiant_joy + 0.45 * flash.radiant_joy, 2),
    )


ORDERED_CLASSES = [
    ("stress", "Stress"),
    ("anxiety", "Anxiety"),
    ("mental_fatigue", "Mental Fatigue"),
    ("calm_flow", "Calm Flow"),
    ("radiant_joy", "Radiant Joy"),
]


def primary_class(scores: EmotionScores) -> str:
    """Returns display name of highest score; ties broken by SPEC §3 order."""
    best_key, best_display = ORDERED_CLASSES[0]
    best_val = getattr(scores, best_key)

    for key, display in ORDERED_CLASSES[1:]:
        val = getattr(scores, key)
        if val > best_val:
            best_val = val
            best_key, best_display = key, display

    return best_display


def confidence(jev_result: Any, flash_scores: EmotionScores, jev_is_real: bool) -> float:
    """Calculates confidence score: Jev confidence if real, else 1 - mean(|jev - flash|)."""
    if jev_is_real:
        return round(float(jev_result.confidence), 2)

    keys = ["stress", "anxiety", "mental_fatigue", "calm_flow", "radiant_joy"]
    diffs = [abs(getattr(jev_result.scores, k) - getattr(flash_scores, k)) for k in keys]
    mean_diff = sum(diffs) / len(diffs)
    conf = max(0.0, min(1.0, 1.0 - mean_diff))
    return round(float(conf), 2)


TREND_TEMPLATES: dict[tuple[str, str], str] = {
    # Stress
    ("Stress", "rise"): "Compared to your recent baseline, today's {timer}-second sketch shows a {delta_str} rise in stress-shaped line tension—a gentle cue to pause and release your shoulders.",
    ("Stress", "fall"): "Compared to your recent baseline, today's {timer}-second sketch reveals a {delta_str} softening in line pressure, showing that physical tension is easing from your hand.",
    ("Stress", "steady"): "Today's {timer}-second sketch continues with a steady level of deliberate line density, holding an even and grounded presence.",

    # Anxiety
    ("Anxiety", "rise"): "Compared to your recent baseline, today's {timer}-second sketch reflects a {delta_str} increase in angular line shifts—an invitation to take one slow, anchoring breath.",
    ("Anxiety", "fall"): "Compared to your recent baseline, today's {timer}-second sketch shows a {delta_str} settling of jagged edges into more continuous, tranquil rhythms.",
    ("Anxiety", "steady"): "Your line velocity in today's {timer}-second sketch remains consistent with your recent baseline, maintaining an attentive yet familiar tempo.",

    # Mental Fatigue
    ("Mental Fatigue", "rise"): "Compared to your recent baseline, today's {timer}-second sketch shows a {delta_str} shift toward quieter, more sparse strokes—a quiet signal that rest would be restorative.",
    ("Mental Fatigue", "fall"): "Compared to your recent baseline, today's {timer}-second sketch reflects a {delta_str} renewal in stroke presence and page engagement.",
    ("Mental Fatigue", "steady"): "Today's {timer}-second sketch displays a steady, gentle economy of line, holding space without demanding extra effort.",

    # Calm Flow
    ("Calm Flow", "rise"): "Compared to your recent baseline, today's {timer}-second sketch shows a {delta_str} expansion in rhythmic, unbroken curves—a lovely blossoming of effortless flow.",
    ("Calm Flow", "fall"): "Compared to your recent baseline, today's {timer}-second sketch shows a subtle {delta_str} transition toward more varied mark-making.",
    ("Calm Flow", "steady"): "Your continuous, rhythmic stroke flow in today's {timer}-second sketch remains beautifully in sync with your recent baseline.",

    # Radiant Joy
    ("Radiant Joy", "rise"): "Compared to your recent baseline, today's {timer}-second sketch shows a {delta_str} leap in expansive spirals and celebratory openness.",
    ("Radiant Joy", "fall"): "Compared to your recent baseline, today's {timer}-second sketch settles into a quieter, slightly more reflective expressive space.",
    ("Radiant Joy", "steady"): "Today's {timer}-second sketch maintains its playful, open spirit, steady alongside your baseline rhythm.",
}


def trend_text(
    merged: EmotionScores,
    baseline: EmotionScores | None,
    timer: int,
) -> str:
    """Generates thoughtful trend reflection text comparing current scores to baseline."""
    if baseline is None:
        return "This is your first reflection—it quietly becomes your baseline."

    prim = primary_class(merged)
    # Find matching key for the primary class
    key = next(k for k, disp in ORDERED_CLASSES if disp == prim)
    curr_score = getattr(merged, key)
    base_score = getattr(baseline, key)

    if base_score <= 0.001:
        # Guard baseline 0: use absolute percentage points
        diff_pts = int(round(curr_score * 100))
        if diff_pts >= 5:
            direction = "rise"
            delta_str = f"+{diff_pts}%"
        elif diff_pts <= -5:
            direction = "fall"
            delta_str = f"{diff_pts}%"
        else:
            direction = "steady"
            delta_str = f"+{diff_pts}%"
    else:
        pct_change = ((curr_score - base_score) / base_score) * 100.0
        if abs(pct_change) < 5.0:
            direction = "steady"
            delta_str = f"{pct_change:+.0f}%"
        elif pct_change >= 5.0:
            direction = "rise"
            delta_str = f"+{pct_change:.0f}%"
        else:
            direction = "fall"
            delta_str = f"{pct_change:.0f}%"

    template = TREND_TEMPLATES.get(
        (prim, direction),
        "Today's {timer}-second sketch offers a gentle reflection of your ongoing rhythm.",
    )
    return template.format(timer=timer, delta_str=delta_str)


ACTIVITIES: dict[str, list[Activity]] = {
    "Stress": [
        Activity(
            id="stress_pendulum",
            title="Somatic Pendulum Release",
            subtitle="Slow visual rhythm to unwind tight wrist & jaw tension",
            duration_sec=60,
            interaction_type="PENDULUM_PACER",
        ),
        Activity(
            id="stress_breath_478",
            title="4-7-8 Amber Breath Orb",
            subtitle="Warm expanding glow with resonant singing-bowl cues",
            duration_sec=90,
            interaction_type="BREATH_ORB_478",
        ),
        Activity(
            id="stress_shoulder_drop",
            title="Pen-Down Shoulder Drop",
            subtitle="Wordless physical release sequence for hands and neck",
            duration_sec=60,
            interaction_type="SOMATIC_GUIDE",
        ),
    ],
    "Anxiety": [
        Activity(
            id="anxiety_box_breath",
            title="Box Breathing Sanctuary",
            subtitle="Four-phase amber square trace to restore steady inner breath",
            duration_sec=60,
            interaction_type="BOX_BREATH",
        ),
        Activity(
            id="anxiety_grounding_54321",
            title="5-4-3-2-1 Silent Visual Grounding",
            subtitle="Five paper pebbles tapped softly to anchor present awareness",
            duration_sec=90,
            interaction_type="GROUNDING_PEBBLES",
        ),
        Activity(
            id="anxiety_binaural",
            title="Binaural Warmth Reset",
            subtitle="Subtle harmonic stereo wave to soften acute nervous tension",
            duration_sec=90,
            interaction_type="BINAURAL_DRONE",
        ),
    ],
    "Mental Fatigue": [
        Activity(
            id="fatigue_micro_rest",
            title="Sunlit Micro-Rest",
            subtitle="Soft amber screen wash with gentle bowl chime for closing eyes",
            duration_sec=60,
            interaction_type="MICRO_REST",
        ),
        Activity(
            id="fatigue_horizon_gaze",
            title="Gentle Horizon Gaze",
            subtitle="Unfocus gaze toward a distant point to rest tired eye muscles",
            duration_sec=60,
            interaction_type="HORIZON_GAZE",
        ),
        Activity(
            id="fatigue_rising_pulse",
            title="Rising Warmth Pulse",
            subtitle="Upward golden particles guiding restorative deep breaths",
            duration_sec=60,
            interaction_type="RISING_PULSE",
        ),
    ],
    "Calm Flow": [
        Activity(
            id="calm_anchor_lock",
            title="Flow-State Anchor Lock",
            subtitle="Three gratitude breaths sealing this present state in memory",
            duration_sec=45,
            interaction_type="ANCHOR_LOCK",
        ),
        Activity(
            id="calm_harmonic_pad",
            title="Harmonic Resonance Listen",
            subtitle="Touch layered resonant tones to deepen inner stillness",
            duration_sec=60,
            interaction_type="HARMONIC_PAD",
        ),
        Activity(
            id="calm_continuum",
            title="Mindful Continuum",
            subtitle="Unhurried ribbon tracing to maintain relaxed momentum",
            duration_sec=60,
            interaction_type="INFINITY_TRACER",
        ),
    ],
    "Radiant Joy": [
        Activity(
            id="joy_golden_capsule",
            title="Golden Moment Capsule",
            subtitle="Tag this moment with a wordless color aura to revisit later",
            duration_sec=45,
            interaction_type="GOLDEN_CAPSULE",
        ),
        Activity(
            id="joy_ripple_share",
            title="Warmth Ripple Share",
            subtitle="Generate an abstract watercolor keepsake from your stroke balance",
            duration_sec=60,
            interaction_type="WATERCOLOR_BLOOM",
        ),
        Activity(
            id="joy_breath_celebration",
            title="Expansive Breath Celebration",
            subtitle="Sunlit blooming radial animation celebrating creative vitality",
            duration_sec=60,
            interaction_type="RADIAL_BLOOM",
        ),
    ],
}

# Evidence-backed pack (activity_pack.json) goes after the original three per class, in pack order.
# frontend/src/lib/activityPack.json must stay identical (enforced by tests/test_activity_pack.py).
for _cls, _rows in json.loads((Path(__file__).parent / "activity_pack.json").read_text(encoding="utf-8")).items():
    ACTIVITIES[_cls] += [Activity(**r) for r in _rows]

CRISIS_MESSAGE = (
    "Please know that whatever you are carrying right now, you do not have to hold it alone. "
    "If you are in distress or need gentle support, please call or text 988 to reach the Suicide & Crisis Lifeline (US/Canada), "
    "or visit findahelpline.com for confidential, free support worldwide. There are compassionate people ready to listen."
)

BLOCKED_MESSAGES: dict[str, str] = {
    "ADVERSARIAL_INJECTION": "We couldn't analyze this drawing—please photograph only your paper or whiteboard sketch.",
    "NSFW_BLOCKED": "This content cannot be processed—please photograph only pen-and-paper sketch lines.",
    "NON_SKETCH_REJECTED": "This looks like something other than a sketch—try photographing your paper drawing.",
    "TEXT_MESSAGE_REJECTED": "This looks like writing. Unspoken Lines reads drawings only and doesn't follow or reply to written words—please photograph a drawing.",
}


def get_blocked_message(flag: str) -> str:
    """Returns user-facing explanation for blocked non-crisis content."""
    return BLOCKED_MESSAGES.get(
        flag,
        "This looks like something other than a sketch—try photographing your paper drawing.",
    )
