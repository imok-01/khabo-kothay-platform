import csv
import json
import math
import re
import shutil
import uuid
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent
RESTAURANTS_SOURCE = ROOT / "Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx"
MENUS_SOURCE = ROOT / "KK_Actual_Menu_Extraction_FINAL_206.xlsx"
OUTPUT_DIR = ROOT / "KHABO_KOTHAY_PILOT_IMPORT_v1"
VALIDATION_JSON = ROOT / "pilot_validation.json"

PILOT_NAMES = [
    "Kiva Han",
    "Handi (Gulshan Branch)",
    "Chilis",
    "Waza",
    "Cheong Shing Restaurant, Dhaka.",
    "Bukhara Restaurant",
    "Premium Sweets",
    "Baan Busaba",
    "Ajo Idea Space",
    "Bar.B.Q Tonight",
]

NAMESPACE = uuid.UUID("ce5cb46e-302f-4e0c-b938-1a7faf364718")


def is_blank(value):
    return value is None or (isinstance(value, float) and math.isnan(value)) or str(value).strip() == ""


def clean(value):
    if is_blank(value):
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def number_or_none(value):
    if is_blank(value):
        return None
    return float(value)


def normalize_name(value):
    return re.sub(r"[^a-z0-9]", "", clean(value).lower()) if clean(value) else ""


def stable_id(kind, key):
    return str(uuid.uuid5(NAMESPACE, f"khabo-kothay-pilot-v1/{kind}/{key}"))


def parse_price(value):
    raw = clean(value)
    if raw is None:
        return None, None
    matches = re.findall(r"\d+(?:,\d{3})*(?:\.\d+)?", raw)
    if len(matches) != 1:
        return None, raw
    try:
        parsed = Decimal(matches[0].replace(",", ""))
    except InvalidOperation:
        return None, raw
    if parsed < 0:
        return None, raw
    return str(parsed.normalize()), None


def write_csv(path, fieldnames, rows):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    restaurant_df = pd.read_excel(RESTAURANTS_SOURCE, sheet_name="Restaurants")
    menu_df = pd.read_excel(MENUS_SOURCE, sheet_name="Actual_Menu")
    restaurant_df = restaurant_df.where(pd.notna(restaurant_df), None)
    menu_df = menu_df.where(pd.notna(menu_df), None)

    restaurant_matches = defaultdict(list)
    for index, row in restaurant_df.iterrows():
        restaurant_matches[normalize_name(row["Restaurant name"])].append((index, row))

    selected = []
    unmatched_pilot_names = []
    duplicate_pilot_candidates = []
    for pilot_name in PILOT_NAMES:
        candidates = restaurant_matches[normalize_name(pilot_name)]
        if len(candidates) == 1:
            selected.append((pilot_name, candidates[0][0], candidates[0][1]))
        elif len(candidates) == 0:
            unmatched_pilot_names.append(pilot_name)
        else:
            duplicate_pilot_candidates.append({"pilot_name": pilot_name, "candidate_count": len(candidates)})

    selected_names = {normalize_name(row["Restaurant name"]): (pilot_name, index, row) for pilot_name, index, row in selected}
    restaurants_rows = []
    sources_rows = []
    attributes_rows = []
    review_signals_rows = []
    image_rows = []
    restaurant_ids = {}
    source_ids = {}
    missing_values = []

    for pilot_name, _, row in selected:
        source_name = clean(row["Restaurant name"])
        restaurant_id = stable_id("restaurant", source_name)
        restaurant_ids[normalize_name(source_name)] = restaurant_id
        restaurants_rows.append({
            "id": restaurant_id,
            "name": source_name,
            "address": clean(row["Address"]),
            "latitude": number_or_none(row["Latitude"]),
            "longitude": number_or_none(row["Longitude"]),
        })
        for field, value in [("address", row["Address"]), ("latitude", row["Latitude"]), ("longitude", row["Longitude"]), ("google_place_id", row["Google Place ID"]), ("google_maps_link", row["Google Maps link"]), ("google_rating", row["Google rating"]), ("google_review_count", row["Google review count"]), ("google_photo_link", row["Google photo link"])]:
            if is_blank(value):
                missing_values.append({"restaurant_name": source_name, "field": field, "source_value": None})

        place_id = clean(row["Google Place ID"])
        maps_link = clean(row["Google Maps link"])
        source_id = stable_id("restaurant_source", restaurant_id)
        source_ids[restaurant_id] = source_id
        sources_rows.append({
            "id": source_id,
            "restaurant_id": restaurant_id,
            "source_type": "GOOGLE_PLACES",
            "source_identifier": place_id,
            "source_url": maps_link,
        })

        attribute_mappings = [
            ("category", row["Category"]),
            ("opening_hours", row["Opening status / hours"]),
            ("service_options", row["Service options"]),
            ("price_range", row["Price range"]),
        ]
        for attribute_key, raw_value in attribute_mappings:
            value = clean(raw_value)
            if value is not None:
                attributes_rows.append({
                    "id": stable_id("attribute", f"{restaurant_id}/{attribute_key}"),
                    "restaurant_id": restaurant_id,
                    "attribute_key": attribute_key,
                    "attribute_value": json.dumps(value, ensure_ascii=False),
                })

        rating = number_or_none(row["Google rating"])
        review_count = number_or_none(row["Google review count"])
        if rating is not None or review_count is not None:
            review_signals_rows.append({
                "id": stable_id("review_signal", restaurant_id),
                "restaurant_id": restaurant_id,
                "source": "GOOGLE",
                "rating": rating,
                "review_count": int(review_count) if review_count is not None else None,
            })

        image_url = clean(row["Google photo link"])
        if image_url is not None:
            image_rows.append({
                "id": stable_id("image_reference", restaurant_id),
                "restaurant_id": restaurant_id,
                "image_url": image_url,
                "source": "GOOGLE",
                "status": "PENDING",
            })

    menu_groups = defaultdict(list)
    for _, row in menu_df.iterrows():
        source_restaurant = clean(row["Restaurant Name"])
        normalized = normalize_name(source_restaurant)
        if normalized in selected_names:
            menu_groups[normalized].append(row)

    menus_rows = []
    menu_items_rows = []
    price_rows = []
    invalid_prices = []
    missing_dishes = []
    unmatched_menu_restaurants = []
    for normalized, (pilot_name, _, restaurant_row) in selected_names.items():
        restaurant_name = clean(restaurant_row["Restaurant name"])
        restaurant_id = restaurant_ids[normalized]
        menu_id = stable_id("menu", restaurant_id)
        menus_rows.append({
            "id": menu_id,
            "restaurant_id": restaurant_id,
            "title": None,
            "status": "ACTIVE",
            "source_id": None,
        })
        menu_rows = menu_groups.get(normalized, [])
        if not menu_rows:
            unmatched_menu_restaurants.append({"restaurant_name": restaurant_name, "issue": "No matching menu rows"})
        for position, menu_row in enumerate(menu_rows, start=1):
            dish_name = clean(menu_row["Dish Name"])
            category = clean(menu_row["Category Name"])
            raw_price = clean(menu_row["Price"])
            if dish_name is None:
                missing_dishes.append({
                    "restaurant_name": restaurant_name, "category": category, "raw_price": raw_price})
                continue
            menu_item_id = stable_id("menu_item", f"{menu_id}/{position}/{dish_name}")
            menu_items_rows.append({
                "id": menu_item_id,
                "menu_id": menu_id,
                "item_name": dish_name,
                "category": category,
            })
            parsed_price, invalid_raw_price = parse_price(raw_price)
            price_rows.append({
                "id": stable_id("price_observation", menu_item_id),
                "menu_item_id": menu_item_id,
                "price": parsed_price,
                "currency": "BDT",
                "source_id": None,
                "observed_at": None,
            })
            if invalid_raw_price is not None:
                invalid_prices.append({
                    "restaurant_name": restaurant_name, "dish_name": dish_name, "raw_price": invalid_raw_price})

    # Duplicate candidates are reported, never merged.
    restaurant_name_counts = Counter(clean(row["Restaurant name"]) for _, _, row in selected)
    menu_item_duplicates = Counter((row["menu_id"], normalize_name(row["item_name"]), row["category"] or "") for row in menu_items_rows)
    duplicate_candidates = []
    duplicate_candidates.extend({"candidate_type": "restaurant_name", "candidate": name, "count": count} for name, count in restaurant_name_counts.items() if count > 1)
    duplicate_candidates.extend({"candidate_type": "menu_item_within_menu", "candidate": f"{menu_id} | {item_name} | {category}", "count": count} for (menu_id, item_name, category), count in menu_item_duplicates.items() if count > 1)
    duplicate_candidates.extend({"candidate_type": "pilot_name_resolution", "candidate": item["pilot_name"], "count": item["candidate_count"]} for item in duplicate_pilot_candidates)

    relationship_checks = [
        {"relationship": "restaurant_sources.restaurant_id -> restaurants.id", "broken_count": sum(row["restaurant_id"] not in {item["id"] for item in restaurants_rows} for row in sources_rows)},
        {"relationship": "restaurant_attributes.restaurant_id -> restaurants.id", "broken_count": sum(row["restaurant_id"] not in {item["id"] for item in restaurants_rows} for row in attributes_rows)},
        {"relationship": "review_signals.restaurant_id -> restaurants.id", "broken_count": sum(row["restaurant_id"] not in {item["id"] for item in restaurants_rows} for row in review_signals_rows)},
        {"relationship": "menus.restaurant_id -> restaurants.id", "broken_count": sum(row["restaurant_id"] not in {item["id"] for item in restaurants_rows} for row in menus_rows)},
        {"relationship": "menu_items.menu_id -> menus.id", "broken_count": sum(row["menu_id"] not in {item["id"] for item in menus_rows} for row in menu_items_rows)},
        {"relationship": "price_observations.menu_item_id -> menu_items.id", "broken_count": sum(row["menu_item_id"] not in {item["id"] for item in menu_items_rows} for row in price_rows)},
        {"relationship": "image_references.restaurant_id -> restaurants.id", "broken_count": sum(row["restaurant_id"] not in {item["id"] for item in restaurants_rows} for row in image_rows)},
    ]

    write_csv(OUTPUT_DIR / "01_restaurants_preview.csv", ["id", "name", "address", "latitude", "longitude"], restaurants_rows)
    write_csv(OUTPUT_DIR / "02_restaurant_sources_preview.csv", ["id", "restaurant_id", "source_type", "source_identifier", "source_url"], sources_rows)
    write_csv(OUTPUT_DIR / "03_restaurant_attributes_preview.csv", ["id", "restaurant_id", "attribute_key", "attribute_value"], attributes_rows)
    write_csv(OUTPUT_DIR / "04_review_signals_preview.csv", ["id", "restaurant_id", "source", "rating", "review_count"], review_signals_rows)
    write_csv(OUTPUT_DIR / "05_menus_preview.csv", ["id", "restaurant_id", "title", "status", "source_id"], menus_rows)
    write_csv(OUTPUT_DIR / "06_menu_items_preview.csv", ["id", "menu_id", "item_name", "category"], menu_items_rows)
    write_csv(OUTPUT_DIR / "07_price_observations_preview.csv", ["id", "menu_item_id", "price", "currency", "source_id", "observed_at"], price_rows)
    write_csv(OUTPUT_DIR / "08_image_references_preview.csv", ["id", "restaurant_id", "image_url", "source", "status"], image_rows)
    write_csv(OUTPUT_DIR / "09_review_samples_preview.csv", ["restaurant_id", "source", "source_url", "review_text", "attribution", "observed_at"], [])

    record_counts = [
        {"file": "01_restaurants_preview.csv", "records": len(restaurants_rows)},
        {"file": "02_restaurant_sources_preview.csv", "records": len(sources_rows)},
        {"file": "03_restaurant_attributes_preview.csv", "records": len(attributes_rows)},
        {"file": "04_review_signals_preview.csv", "records": len(review_signals_rows)},
        {"file": "05_menus_preview.csv", "records": len(menus_rows)},
        {"file": "06_menu_items_preview.csv", "records": len(menu_items_rows)},
        {"file": "07_price_observations_preview.csv", "records": len(price_rows)},
        {"file": "08_image_references_preview.csv", "records": len(image_rows)},
        {"file": "09_review_samples_preview.csv", "records": 0},
    ]
    blocking_issues = []
    if len(restaurants_rows) != 10:
        blocking_issues.append("Pilot selection did not resolve to exactly 10 restaurant records.")
    if unmatched_pilot_names:
        blocking_issues.append("One or more approved pilot restaurant names did not resolve uniquely in the restaurant source.")
    if duplicate_pilot_candidates:
        blocking_issues.append("One or more approved pilot restaurant names resolved to multiple source rows.")
    if unmatched_menu_restaurants:
        blocking_issues.append("One or more pilot restaurants have no matched menu rows.")
    if missing_dishes:
        blocking_issues.append("Menu rows with blank dish names were excluded because menu_items.item_name is required.")
    if invalid_prices:
        blocking_issues.append("One or more price values could not be normalized without guessing and remain NULL.")
    if any(item["broken_count"] for item in relationship_checks):
        blocking_issues.append("One or more generated relationships are broken.")
    blocking_issues.append("Review sample source data is unavailable; 09_review_samples_preview.csv is header-only.")

    validation = {
        "package_name": "KHABO_KOTHAY_PILOT_IMPORT_v1",
        "readiness_status": "NOT READY",
        "readiness_reason": "Human review is required and no review samples are available in the approved source files.",
        "source_files": [str(RESTAURANTS_SOURCE), str(MENUS_SOURCE)],
        "pilot_restaurants": [clean(row["Restaurant name"]) for _, _, row in selected],
        "record_counts": record_counts,
        "missing_values": missing_values,
        "duplicate_candidates": duplicate_candidates,
        "unmatched_pilot_names": unmatched_pilot_names,
        "unmatched_menu_restaurants": unmatched_menu_restaurants,
        "invalid_prices": invalid_prices,
        "missing_dishes": missing_dishes,
        "relationship_checks": relationship_checks,
        "blocking_issues": blocking_issues,
    }
    VALIDATION_JSON.write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output_dir": str(OUTPUT_DIR), "validation_json": str(VALIDATION_JSON), "record_counts": record_counts, "blocking_issues": blocking_issues}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
