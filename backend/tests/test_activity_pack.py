import json
from pathlib import Path

from gate import ACTIVITIES

ROOT = Path(__file__).resolve().parents[2]
ORIGINAL_FIRST_IDS = {
    "Stress": ["stress_pendulum", "stress_breath_478", "stress_shoulder_drop"],
    "Anxiety": ["anxiety_box_breath", "anxiety_grounding_54321", "anxiety_binaural"],
    "Mental Fatigue": ["fatigue_micro_rest", "fatigue_horizon_gaze", "fatigue_rising_pulse"],
    "Calm Flow": ["calm_anchor_lock", "calm_harmonic_pad", "calm_continuum"],
    "Radiant Joy": ["joy_golden_capsule", "joy_ripple_share", "joy_breath_celebration"],
}
PACK_COUNTS = {"Stress": 10, "Anxiety": 9, "Mental Fatigue": 8, "Calm Flow": 8, "Radiant Joy": 8}
# From the pack's never_suggest_activity_ids; none may ever be offered.
NEVER_SUGGEST = {
    "acquire_pet", "cold_water_immersion", "dampening_positive", "drawing_to_vent",
    "dwelling_on_feelings", "passive_scrolling", "sad_music_listening", "venting", "vigorous_exercise",
}


def test_original_three_stay_on_top_then_pack_in_order():
    for cls, original in ORIGINAL_FIRST_IDS.items():
        ids = [a.id for a in ACTIVITIES[cls]]
        assert ids[:3] == original
        assert len(ids) == 3 + PACK_COUNTS[cls]


def test_pack_entries_are_complete_and_safe():
    for cls, acts in ACTIVITIES.items():
        for a in acts[3:]:
            assert a.steps and a.grade in {"A", "B", "C"} and a.citation, a.id
            assert 0 < a.duration_sec <= 1200, a.id
            assert not any(bad in a.id for bad in NEVER_SUGGEST), a.id
            if a.interaction_type == "BREATH_PACER":
                assert a.pacer and a.pacer["inhale_s"] > 0 and a.pacer["exhale_s"] > 0, a.id


def test_frontend_copy_matches_backend():
    backend = (ROOT / "backend" / "activity_pack.json").read_text(encoding="utf-8")
    frontend = (ROOT / "frontend" / "src" / "lib" / "activityPack.json").read_text(encoding="utf-8")
    assert json.loads(backend) == json.loads(frontend)
