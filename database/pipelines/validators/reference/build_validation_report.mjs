import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "C:\\Users\\USER\\Documents\\Codex\\2026-08-16\\supabase-version";
const validation = JSON.parse(await fs.readFile(`${root}\\work\\pilot_validation.json`, "utf8"));
const outputDir = `${root}\\outputs\\KHABO_KOTHAY_PILOT_IMPORT_v1`;
const outputPath = `${outputDir}\\10_import_validation_report.xlsx`;

const workbook = Workbook.create();
const colors = {
  navy: "#17324D",
  teal: "#0F766E",
  paleTeal: "#DDF3F0",
  paleYellow: "#FEF3C7",
  paleRed: "#FEE2E2",
  grey: "#F3F4F6",
  border: "#D1D5DB",
  white: "#FFFFFF",
};

function applyHeader(range, fill = colors.navy) {
  range.format = {
    fill,
    font: { bold: true, color: colors.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: colors.border },
  };
}

function writeTable(sheet, startRow, headers, rows, widths = []) {
  const lastColumn = String.fromCharCode(64 + headers.length);
  const headerRange = sheet.getRange(`A${startRow}:${lastColumn}${startRow}`);
  headerRange.values = [headers];
  applyHeader(headerRange, colors.teal);
  if (rows.length) {
    const dataRange = sheet.getRange(`A${startRow + 1}:${lastColumn}${startRow + rows.length}`);
    dataRange.values = rows;
    dataRange.format = {
      verticalAlignment: "top",
      wrapText: true,
      borders: { preset: "inside", style: "thin", color: colors.border },
    };
  }
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, Math.max(startRow + rows.length, 1), 1).format.columnWidth = width;
  });
  sheet.freezePanes.freezeRows(startRow);
}

function addTitle(sheet, title, subtitle) {
  sheet.showGridLines = false;
  sheet.getRange("A1:E1").merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white, size: 16 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  sheet.getRange("A1").format.rowHeight = 28;
  sheet.getRange("A2:E2").merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format = {
    fill: colors.grey,
    font: { italic: true, color: "#374151" },
    wrapText: true,
  };
}

const summary = workbook.worksheets.add("Summary");
addTitle(summary, "KHABO KOTHAY — Pilot Import Validation", "Package: KHABO_KOTHAY_PILOT_IMPORT_v1 | Preparation only — no Supabase import executed");
summary.getRange("A4:B4").values = [["Import readiness", validation.readiness_status]];
summary.getRange("A4:B4").format = {
  fill: colors.paleRed,
  font: { bold: true, color: "#991B1B" },
  borders: { preset: "outside", style: "thin", color: colors.border },
};
summary.getRange("A5:B5").values = [["Reason", validation.readiness_reason]];
summary.getRange("A5:B5").format = { fill: colors.paleYellow, wrapText: true };
summary.getRange("A7:B7").values = [["Approved source", "Location"]];
applyHeader(summary.getRange("A7:B7"));
summary.getRange("A8:B9").values = [
  ["Restaurant identity source", validation.source_files[0]],
  ["Menu extraction source", validation.source_files[1]],
];
summary.getRange("A8:B9").format = { wrapText: true, verticalAlignment: "top" };
summary.getRange("A11:B11").values = [["Human decision required", "Detail"]];
applyHeader(summary.getRange("A11:B11"));
summary.getRange(`A12:B${11 + validation.blocking_issues.length}`).values = validation.blocking_issues.map((issue, index) => [`Issue ${index + 1}`, issue]);
summary.getRange(`A12:B${11 + validation.blocking_issues.length}`).format = { fill: colors.paleYellow, wrapText: true, verticalAlignment: "top" };
summary.getRange("A1:A30").format.columnWidth = 27;
summary.getRange("B1:B30").format.columnWidth = 90;

const counts = workbook.worksheets.add("Record Counts");
addTitle(counts, "Record Counts", "Preview-file row counts generated from the approved 10-restaurant pilot scope.");
writeTable(counts, 4, ["Preview file", "Records"], validation.record_counts.map(x => [x.file, x.records]), [44, 14]);

const pilots = workbook.worksheets.add("Pilot Restaurants");
addTitle(pilots, "Approved Pilot Restaurants", "Resolved uniquely from the restaurant identity workbook; no automatic merges were performed.");
writeTable(pilots, 4, ["#", "Restaurant name"], validation.pilot_restaurants.map((name, index) => [index + 1, name]), [8, 48]);

const missing = workbook.worksheets.add("Missing Values");
addTitle(missing, "Missing Values", "Only fields needed by the preparation checks are listed. Blank source values are preserved as NULL in preview files.");
const missingRows = validation.missing_values.length ? validation.missing_values.map(x => [x.restaurant_name, x.field, x.source_value]) : [["No missing values found in checked fields", "", ""]];
writeTable(missing, 4, ["Restaurant", "Field", "Source value"], missingRows, [42, 28, 24]);

const duplicates = workbook.worksheets.add("Duplicate Candidates");
addTitle(duplicates, "Duplicate Candidates", "Candidates are flagged for human review only; none were merged or removed.");
const duplicateRows = validation.duplicate_candidates.length ? validation.duplicate_candidates.map(x => [x.candidate_type, x.candidate, x.count]) : [["No duplicate candidates", "", ""]];
writeTable(duplicates, 4, ["Candidate type", "Candidate", "Count"], duplicateRows, [28, 75, 12]);

const menuIssues = workbook.worksheets.add("Menu Issues");
addTitle(menuIssues, "Menu Validation Issues", "Prices are normalized only when the source contains one unambiguous numeric value. No price was guessed.");
const issueRows = [
  ...validation.unmatched_menu_restaurants.map(x => ["Unmatched menu restaurant", x.restaurant_name, x.issue]),
  ...validation.invalid_prices.map(x => ["Invalid / ambiguous price", `${x.restaurant_name} — ${x.dish_name}`, x.raw_price]),
  ...validation.missing_dishes.map(x => ["Missing dish name", x.restaurant_name, `Category: ${x.category ?? "NULL"}; raw price: ${x.raw_price ?? "NULL"}`]),
];
writeTable(menuIssues, 4, ["Issue", "Restaurant / dish", "Source value or detail"], issueRows.length ? issueRows : [["No menu validation issues", "", ""]], [28, 48, 38]);

const relationships = workbook.worksheets.add("Relationship Checks");
addTitle(relationships, "Relationship Checks", "All generated IDs are deterministic package identifiers used only to preserve import relationships.");
writeTable(relationships, 4, ["Relationship", "Broken records"], validation.relationship_checks.map(x => [x.relationship, x.broken_count]), [68, 18]);

const readiness = workbook.worksheets.add("Import Readiness");
addTitle(readiness, "Import Readiness", "Supabase import must remain blocked until every decision below has human approval.");
writeTable(readiness, 4, ["Check", "Status", "Detail"], [
  ["Pilot restaurant scope", "PASS", "10 restaurants resolved uniquely."],
  ["Relationship integrity", "PASS", "All generated foreign-key relationships resolve within preview files."],
  ["Price normalization", "REVIEW", "One ambiguous price remains NULL; human decision required."],
  ["Review samples", "BLOCKED", "No review samples are present in the approved source datasets."],
  ["Overall package", validation.readiness_status, validation.readiness_reason],
], [30, 16, 76]);
readiness.getRange("B5:B9").conditionalFormats.add("containsText", { text: "PASS", format: { fill: colors.paleTeal, font: { color: "#065F46", bold: true } } });
readiness.getRange("B5:B9").conditionalFormats.add("containsText", { text: "REVIEW", format: { fill: colors.paleYellow, font: { color: "#92400E", bold: true } } });
readiness.getRange("B5:B9").conditionalFormats.add("containsText", { text: "BLOCKED", format: { fill: colors.paleRed, font: { color: "#991B1B", bold: true } } });
readiness.getRange("B5:B9").conditionalFormats.add("containsText", { text: "NOT READY", format: { fill: colors.paleRed, font: { color: "#991B1B", bold: true } } });

await fs.mkdir(outputDir, { recursive: true });
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);

for (const sheetName of ["Summary", "Record Counts", "Menu Issues", "Import Readiness"]) {
  const image = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${root}\\work\\${sheetName.replaceAll(" ", "_")}_preview.png`, new Uint8Array(await image.arrayBuffer()));
}

const inspected = await workbook.inspect({ kind: "table", range: "Summary!A1:B14", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 4 });
console.log(inspected.ndjson);
console.log(JSON.stringify({ outputPath }));
