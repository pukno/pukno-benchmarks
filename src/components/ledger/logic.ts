import type { Row } from "@/data/types";

export const FIT_COLUMN = "Fits Hardware Profile";
export const STATUS_COLUMN = "Local Status";

export function num(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Unified machines list the same number for system RAM and accelerator memory. */
export function fitsProfile(model: Row, profile: Row): "Yes" | "No" | "Unknown" {
  const ram = num(profile["System RAM (GB)"]);
  const mem = num(profile["VRAM / Unified Memory (GB)"]);
  const minRam = num(model["Minimum RAM (GB)"]);
  const unified = ram != null && mem != null && ram === mem;
  const need = unified
    ? (num(model["Minimum Unified Memory (GB)"]) ??
      num(model["Minimum VRAM (GB)"]) ??
      num(model["Recommended Model Size (GB)"]))
    : (num(model["Minimum VRAM (GB)"]) ?? num(model["Recommended Model Size (GB)"]));

  if (minRam == null && need == null) return "Unknown";
  if (minRam != null && ram != null && minRam > ram) return "No";
  if (need == null || mem == null) return "Unknown";
  return need <= mem ? "Yes" : "No";
}

export function localStatus(model: Row, fit: "Yes" | "No" | "Unknown"): string {
  if (model["Open Weights"] && model["Open Weights"] !== "Yes") return "Blocked · weights";
  const verdict = model["Commercial Local Verdict"];
  if (verdict === "No") return "Blocked · license";
  const conditional = verdict === "Conditional";
  if (fit === "No") return conditional ? "Conditional · does not fit" : "Blocked · hardware";
  if (fit === "Unknown") return conditional ? "Conditional · check memory" : "Eligible · check memory";
  const prefix = conditional ? "Conditional" : "Eligible";
  const hasQuality = Boolean(model["Quality Summary Score"]);
  const hasSpeed = Boolean(model["Speed Summary Value"]);
  if (!hasQuality && !hasSpeed) return `${prefix} · ungraded`;
  if (!hasSpeed) return `${prefix} · needs a speed run`;
  if (!hasQuality) return `${prefix} · needs quality`;
  return `${prefix} · ready to score`;
}

export function compareValues(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const na = num(a);
  const nb = num(b);
  if (na != null && nb != null) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function rowMatches(row: Row, filters: Record<string, string>, query: string): boolean {
  for (const [key, raw] of Object.entries(filters)) {
    const needle = raw.trim().toLowerCase();
    if (!needle) continue;
    if (!String(row[key] ?? "").toLowerCase().includes(needle)) return false;
  }
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Object.values(row).some((value) => value.toLowerCase().includes(q));
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function toCsv(columns: string[], rows: Row[]): string {
  const esc = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const lines = [columns.map(esc).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => esc(row[column] ?? "")).join(","));
  }
  return lines.join("\n");
}

export function rowsFromCsv(text: string, columns: string[]): Row[] {
  const matrix = parseCsv(text);
  if (matrix.length < 2) throw new Error("CSV needs a header row and at least one data row.");
  const header = matrix[0].map((h) => h.trim());
  const known = new Set(columns);
  const matched = header.filter((h) => known.has(h));
  if (matched.length < 2) {
    throw new Error("Headers don't match this sheet. Export a CSV first and edit that file.");
  }
  return matrix.slice(1).map((cells) => {
    const row: Row = {};
    for (const column of columns) row[column] = "";
    header.forEach((name, index) => {
      if (known.has(name)) row[name] = (cells[index] ?? "").trim();
    });
    return row;
  });
}
