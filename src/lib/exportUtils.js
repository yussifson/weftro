/**
 * Utility to export data as CSV or JSON file download.
 * CSV format is Excel-compatible (UTF-8 BOM included).
 */

export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const header = keys.map(k => `"${k}"`).join(",");
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k] ?? "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  // BOM for Excel UTF-8 compatibility
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function exportToJSON(data, filename) {
  if (!data || data.length === 0) return;
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, "application/json");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}