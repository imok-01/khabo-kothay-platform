import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent
SOURCES = {
    "restaurants": ROOT / "Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx",
    "menus": ROOT / "KK_Actual_Menu_Extraction_FINAL_206.xlsx",
}


def describe(path: Path) -> dict:
    book = pd.ExcelFile(path)
    result = {"path": str(path), "sheets": {}}
    for sheet in book.sheet_names:
        frame = pd.read_excel(path, sheet_name=sheet)
        result["sheets"][sheet] = {
            "rows": len(frame),
            "columns": list(frame.columns),
            "preview": frame.head(5).where(frame.notna(), None).to_dict(orient="records"),
        }
    return result


print(json.dumps({name: describe(path) for name, path in SOURCES.items()}, ensure_ascii=False, indent=2, default=str))
