# ENRICHMENT DIFF REPORT

**Generated:** 2026-08-18T10:56:27.878Z · **Mode:** DRY-RUN (no writes)

## Summary

| Metric | Count |
|---|---|
| Restaurants affected (attributes or restaurant fields) | 2 |
| Attributes to add | 2 |
| Attributes skipped (already present / no evidence) | 317 |
| Restaurant field updates (area/city) | 0 |
| Menu category changes | 1715 |
| Provenance records to create | 2 |

## Attributes to add

- **mealTypes**: 1
- **signatureDishes**: 1

## Attributes skipped

- no cuisine evidence (Category="Restaurant"): 89
- no cuisine evidence (Category="Family-friendly"): 2
- already present: 210
- no cuisine evidence (Category="Buffet"): 6
- no cuisine evidence (Category="Food court"): 1
- no cuisine evidence (Category="Continental resta"): 1
- no cuisine evidence (Category="Cafe"): 2
- no cuisine evidence (Category="Takeout restaura"): 2
- no cuisine evidence (Category="Coffee shop"): 2
- no cuisine evidence (Category="Dessert shop"): 1
- no cuisine evidence (Category="4-star hotel"): 1

## Menu category changes (top 25 by count)

- Appetizer → Appetizers: 114 items
- Starters → Appetizers: 40 items
- Curry → Curries: 36 items
- Most Popular → Popular: 29 items
- Platter → Combos: 28 items
- Traditional Sweets → Desserts: 27 items
- Kebab → Kebabs: 26 items
- Starter → Appetizers: 25 items
- Fish → Seafood: 24 items
- Kashmiri Curry → Curries: 24 items
- Gourmet Burger → Burgers: 20 items
- Chowmein → Noodles: 20 items
- Kebab & Tikkas (From The Clay Oven) → Kebabs: 19 items
- New in Hut → Popular: 19 items
- Non-Vegetarian Dim Sums → Dim Sum: 17 items
- Coffee → Beverages: 17 items
- Rice Meal → Rice: 17 items
- Prime Cuts → Steak: 17 items
- Umai Special Maki & Rolls → Sushi: 16 items
- Chicken Curry → Chicken: 15 items
- Noodles & Dumpling → Noodles: 15 items
- Main / Featured → Mains: 15 items
- Mocktail → Beverages: 15 items
- Vegetable → Vegetables: 14 items
- Dumplings → Dim Sum: 14 items

## Restaurant field updates


## Provenance records

- mealTypes (MENU_EXTRACTION): 1
- signatureDishes (MENU_EXTRACTION): 1

## Examples — 20 restaurant changes

| Restaurant | Change |
|---|---|
| KHAZANA | mealTypes: [Dessert] |
| Baan Busaba | signatureDishes: [Mongolian Glazed Beef Tenderloin, Mala Fried Sea Bass, XO Beef Baked Noodles, Grilled Chicken Thighs, Charcoal Chicken Skewers, Thai Heritage Grilled Beef, Glazed Prawn] |

## ⚠️ DECISION REQUIRED BEFORE --apply

1. **verification_status enum:** The approved status `SOURCE_CONFIRMED` is **NOT in the live enum** (live values: UNKNOWN, SOURCE_VERIFIED, RESTAURANT_CONFIRMED, KK_VERIFIED, STALE, CONFLICTING, UNVERIFIED, NEEDS_REVIEW). Options: (a) add `SOURCE_CONFIRMED` to the enum via migration, or (b) use `SOURCE_VERIFIED` instead. Pipeline is parameterized via `VERIFICATION_STATUS` constant.
2. Cuisine mapping derived from Google `Category` values (list above in attrInserts).
3. `city=Dhaka` backfill for 0 rows (dataset is Dhaka-scoped).
4. Signature-dish rule: only items under sections explicitly named Popular/Signature/Chef's special.