# KHABO KOTHAY — INTERNAL TEST PLAN

Internal human workflow validation for the three roles. Fill the PASS/FAIL, Notes, and Confusion columns during testing.

> Prerequisites (set up by deployer, not tester):
> - Internal preview URL deployed from the verified source commit.
> - Supabase configured (URL + anon key); `VITE_DEV_AUTH_MOCK` false/unset.
> - `VITE_ENABLE_OFFERS=false`, `VITE_ENABLE_ANALYTICS=true`.
> - Test accounts provisioned (see Test Account Requirements).
> - Migration `PROPOSED_1_13_pilot_infra.sql` applied (for report/analytics persistence).

---

## Normal User Test

| # | Step | PASS/FAIL | Notes | Confusion points |
|---|------|-----------|-------|------------------|
| 1 | Open website (preview URL) | | | |
| 2 | Search for a restaurant (e.g. "Seasonal Tastes") | | | |
| 3 | Apply a filter (cuisine / area / price) | | | |
| 4 | Open a restaurant profile | | | |
| 5 | View the menu | | | |
| 6 | Save / favorite the restaurant | | | |
| 7 | Return later — confirm it appears in Saved | | | |
| 8 | Share the restaurant (copy link / share sheet) | | | |
| 9 | Report incorrect information (trigger + submit) | | | |

Record qualitatively:
- Confusion (anything unclear)
- Broken flow (dead ends, errors)
- Missing information (expected but absent)
- Trust issues (e.g. "Reservations coming soon", no live offers, "Your notes" device-only)

---

## Restaurant Admin Test

| # | Step | PASS/FAIL | Notes | Confusion points |
|---|------|-----------|-------|------------------|
| 1 | Login with restaurant-admin account | | | |
| 2 | Open dashboard (`/manage`) | | | |
| 3 | Confirm ONLY the assigned restaurant is visible (e.g. Seasonal Tastes) | | | |
| 4 | Open the menu editor | | | |
| 5 | Edit a dish (name / description) | | | |
| 6 | Change a price | | | |
| 7 | Save draft | | | |
| 8 | Submit for review | | | |
| 9 | Observe status change (draft → pending → approved/published) | | | |

Record qualitatively:
- Usability issues
- Unclear actions (where is status shown? how to know KK acted?)
- Missing information

---

## KK Admin Test

| # | Step | PASS/FAIL | Notes | Confusion points |
|---|------|-----------|-------|------------------|
| 1 | Login with executive account | | | |
| 2 | Open the review queue | | | |
| 3 | View a submission (from the Restaurant Admin test) | | | |
| 4 | Compare changes (diff vs current published menu) | | | |
| 5 | Approve / Reject | | | |
| 6 | Confirm the public update appears on the consumer restaurant page | | | |

Record qualitatively:
- Operational problems
- Missing controls (e.g. cannot see owner identity, no bulk actions)
- Verify RLS: admin cannot directly edit owner data

---

## Cross-role checks
- Restaurant Admin submits → KK Admin sees it in queue (within same preview).
- KK Admin approves → consumer (Normal User) sees the update.
- Normal User report → KK Admin sees the report in the flags/reports view (requires `PROPOSED_1_13` applied).

Screenshots optional — attach to findings.
