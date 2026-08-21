# DISCOVERY FACTS — FINAL DATA OWNERSHIP AUDIT

**Date:** 2026-08-19
**Scope:** `database/pipelines/discovery-facts/final_approved_dataset.json` (founder-approved) vs live `restaurants` table
**Status:** PASS with 4 flagged content issues awaiting founder decision (no wording changed during this audit)

---

## 1. Dataset Status (post founder-decisions)

| Metric | Value |
|---|---|
| Restaurant entries | 206 |
| Total facts | 281 |
| APPROVED | 259 |
| MODIFIED | 19 |
| REMOVED | 3 |
| HOLD | 0 |
| **Publishable facts** | **278** |
| Unique restaurants with publishable facts | 159 |
| Restaurant final status: APPROVED / MODIFIED / REMOVED_OR_ABSTAIN | 144 / 15 / 47 |

Fact types (278 publishable): HISTORY 92 · EXPERIENCE 50 · CONCEPT 66 · IDENTITY 23 · LOCATION 10 · OTHER 37
Confidence: HIGH 133 · MEDIUM 143 · LOW 2

Removed facts (3): Fish & Co. (Gulshan 1) "earlier 2014 outlet / relaunch" · Galito's "Tamim Iqbal inauguration" · Woodhouse Grill Gulshan "Bay's 23 / 2017 format" (incomplete wording — kept out of scope).

---

## 2. Audit 1 — Restaurant → Fact Ownership

**Method:** All 206 `restaurant_id`s in the dataset were looked up in the live `restaurants` table (read-only, anon key). Each fact is checked as correctly attached to its own restaurant row.

**Result: PASS**

- 206/206 `restaurant_id`s resolve to existing rows in live DB.
- 206/206 dataset names match live DB `name` exactly. **0 mismatches.**
- **0 wrong-attachment** issues (no fact belongs to a different restaurant row).

One **internal-content contradiction** was found (attachment is correct, wording conflicts with another approved fact on the same entry) — see §7 R1 (The White Canary Café).

---

## 3. Audit 2 — Brand vs Branch Duplication

Classified every brand that has more than one dataset entry.

**Class A — identical brand-level fact duplicated across sibling branch entries (content duplication):**

| Brand | Entries | Duplicated fact(s) |
|---|---|---|
| American Burger | Gulshan 2 [7] · Banani [8] | 1× HISTORY: "American Burger is one of the older local burger chains in Dhaka, operating before the gourmet-burger wave (Takeout, Madchef) of the 2010s." |
| Mezzan Haile Aiun | Dhaka [118] · Gulshan [119] | 2× IDENTITY + HISTORY: name-translation ("come if you want to eat Mezban") and Barcode Restaurant Group origin / wood-stove fact, both on each branch |
| Chef's Table | Gulshan 1 [40] · Gulshan 2 [41] | Near-duplicate + conflict: G1 carries "the brand's first outlet opened in Gulshan in July 2018" while G2 carries "Gulshan 2 is the brand's original outlet" — see §7 R4 |

These are **row-level duplicates** only (same `(restaurant_id, fact_text)` is still unique because `restaurant_id` differs), so they do not violate the DB constraint — but the content is duplicated across branches.

**Class B — brand-level fact placed on a single (canonical) entry; acceptable:** BFC [19], C House Milano [35], Cielo Rooftop Banani [50], Herfy Banani [81], Handi Gulshan [78], Kacchi Bhai [90], Khao San [97], Bar.B.Q Tonight [16], Barcode Cafe [17], Cafe Mango [37], Ginza [69], Yum Cha District [203], Kiva Han [102].

**Class C — correctly branch-scoped, complementary facts (no duplication):** Herfy Gulshan [82] (first BD branch), Beyond Buffet Gulshan [18], Chef's Table Gulshan 1 food-court residents [40], Madchef Gulshan 1 / Madchef Banani [85/—], Burger King, Pizza Inn, Takeout, Woodhouse siblings — all reviewed, facts are distinct and complementary. **KEEP.**

---

## 4. Audit 3 — Cross-Restaurant References

30 cross-reference mentions were detected and reviewed. **All KEEP — 0 FLAG.**

Validated group/sibling references (correct, non-confusing):
- Baan Busaba [13] → Ruen Busaba (sibling venture, same founder)
- Emerald Group: Thai Emerald [175] ↔ Fools Diner [65] (consistent both directions)
- Chef's Table food court: Gulshan 1 [40] → Chillox / Yum Cha District / Cheez; Utshob Gulshan [194] → Chef's Table (correct — Utshob is inside the food court)
- Barcode Group: Mezzan [118/119], Barcode Cafe [17] (Chattogram origin, correct)
- Herfy [81/82], Handi [78], Khao San [97] → Munch Station, BFC [19] (brand/origin references, correct)
- C House Milano [35] "first store in Asia", Beyond Buffet [18] Gulshan branch, Cielo [50] Paribag history — all correctly scoped.

No confusing sibling/group cross-attachments were found.

---

## 5. Audit 4 — Duplicate Content

- **Exact duplicates:** 2 groups, both Class A from §3 — American Burger pair and Mezzan pair. No other exact-duplicate wording across the 278 facts.
- **Near duplicates (jaccard ≥ 0.7):** only the Chef's Table Gulshan 1 / Gulshan 2 origin pair (conflict, §7 R4). Nothing else.
- All remaining 274 publishable facts are unique in wording.

---

## 6. Data Completeness / Validation (import-ready)

Validated on `DISCOVERY_FACTS_IMPORT_READY.json` (278 facts):

| Check | Result |
|---|---|
| Duplicate `(restaurant_id, fact_text)` rows | 0 |
| Invalid `fact_type` | 0 |
| Invalid `confidence` | 0 |
| Missing `source_reference` | 0 |
| Missing `evidence_note` | 0 |
| Source types | press 125 · directory 59 · review-platform 31 · official-site 31 · delivery-platform 10 · linkedin 10 · facebook 9 · instagram 2 · event-listing 1 |

Low-confidence (LOW) facts carried into import (both publishable, flagged for future review): Koyla sheermal; Turkish Bazaar complimentary Turkish tea.

---

## 7. Flagged Content Issues — Recommended Fixes (PENDING FOUNDER DECISION)

Per founder instruction, **approved wording was NOT changed during this audit.** The following are verified issues with recommended wording fixes; apply only on founder approval. (Each requires re-running `generate_import_ready.js` after the dataset edit.)

### R1 — The White Canary Café [184]: wrong area "Banani" (MODIFY recommended)
- Fact: "Operates as a brunch cafe in **Banani** with a menu of breakfast and brunch items served through the day"
- Conflicts with its own approved fact: "Rooftop café with garden seating beside **Justice Shahabuddin Park in Gulshan**."
- **Verified:** Official Shanta Multiverse site — "Main Cafe: House 12/A, Road 86, Besides Shahabuddin Park, Gulshan-2"; moumachi lists "The White Canary Cafe – Gulshan 2"; Wikipedia confirms Justice Shahabuddin Ahmed Park is in Gulshan 2 (23.798°N 90.415°E), matching DB coords 23.7994169 / 90.4155821.
- **Recommend:** change "in Banani" → "in Gulshan".

### R2 — TRIBE Rooftop Lounge [188]: wrong area "Gulshan" (MODIFY recommended)
- Fact: "Rooftop lounge at the top of the Platinum Grand hotel **in Gulshan**, overlooking Gulshan Lake and the Banani skyline"
- **Verified:** Official platinumhotels.com.bd — "Platinum Grand, Banani · House-52, Road-11, Block-F, Banani, Dhaka-1213"; DB address "Block F, 52 Rd No. 11", coords 23.7907678 / 90.4035116 = Banani (not Gulshan).
- **Recommend:** change "in Gulshan" → "in Banani" (hotel and lounge are in Banani; the view over Gulshan Lake/Banani skyline is still accurate).

### R3 — Ruen Busaba [146]: founder name spelling (MODIFY recommended)
- Fact: "...under **Sadman Hossain**, the restaurateur also behind Haze and Ole."
- **Verified:** The Business Standard (17 Aug 2023) uses "**Saadman** Hossain"; the sibling Baan Busaba fact [13] also uses "Saadman Hossain". Dhaka Tribune (27 Jul 2023) uses "Sadman". Press is split; TBS is the more detailed/authoritative source.
- **Recommend:** unify to "Saadman Hossain" for internal consistency.

### R4 — Chef's Table Gulshan 1 [40]: brand-origin fact could mislead (MODIFY recommended)
- G1: "Chef's Table is operated by Unimart, a sister concern of United Group, and **the brand's first outlet opened in Gulshan in July 2018**."
- G2 [41]: "Chef's Table Gulshan 2 is **the brand's original outlet**: it opened in July 2018..."
- **Issue:** the G1 fact, attached to the Gulshan 1 entry, can read as if Gulshan 1 were the first outlet. The original outlet is Gulshan 2.
- **Recommend:** drop the "first outlet" clause from the G1 fact (keep "Chef's Table is operated by Unimart, a sister concern of United Group, and the brand's first outlet opened in Gulshan in July 2018" → scoped to brand level: "…operated by Unimart, a sister concern of United Group") or reword to explicitly point to Gulshan 2.

### R5 — Class A content duplicates (KEEP decision required)
- American Burger (Gulshan 2 / Banani) and Mezzan Haile Aiun (Dhaka / Gulshan) carry identical brand-level facts on both branches. Truthful, but duplicated content.
- **Options:** (a) KEEP on both (no change, acceptable), or (b) retain on the flagship/original branch and replace the sibling's copy with a branch-scoped fact in the next content pass (requires new research/wording — out of scope for this audit).

---

## 8. Conclusion

- **Ownership integrity: PASS** — every fact is attached to the correct restaurant; 206/206 ids and names match the live DB.
- **Cross-references: PASS** — all 30 are valid KEEP.
- **Data completeness: PASS** — 278 publishable facts, all validated for import; 0 missing fields, 0 invalid enums, 0 duplicate rows.
- **Pending founder decisions:** R1, R2, R3, R4 (small verified wording fixes) and R5 (content-duplication policy).

**`DISCOVERY_FACTS_IMPORT_READY.json` is import-ready as-is (278 facts).** If the founder approves any of R1–R4, apply the wording edits to `final_approved_dataset.json`, re-run `generate_import_ready.js`, and re-verify before import. No Supabase import was performed.