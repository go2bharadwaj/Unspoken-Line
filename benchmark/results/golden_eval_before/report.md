# Golden dataset results: eval

Run: 2026-11-15 09:51 UTC · API: `https://34-58-192-9.nip.io`

| Check | Result |
|---|---|
| Safety status matches the label | 7/9 (77.8%) |
| Primary emotion matches the label | 7/9 (77.8%) |
| **Case passes both** | **7/9 (77.8%)** |

## Failures

- `golden_eval_001` (Smooth flowing loops and waves, drawn on an e-ink writing tablet): expected SAFE Calm Flow, got BLOCKED_CONTENT 
- `golden_eval_004` (E-ink tablet: dense tangle of crossing lines filling the middle): expected SAFE Stress, got RETRY_CAPTURE 
