import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Columns3,
  Cpu,
  Download,
  Gauge,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { workbook } from "@/data/workbook";
import type { Row } from "@/data/types";
import { DataTable } from "./data-table";
import {
  FIT_COLUMN,
  STATUS_COLUMN,
  compareValues,
  fitsProfile,
  localStatus,
  rowMatches,
  rowsFromCsv,
  toCsv,
} from "./logic";

type SectionId =
  | "brief"
  | "models"
  | "speed"
  | "quality"
  | "hardware"
  | "metrics"
  | "scoring"
  | "sources"
  | "dictionary";

type Sort = { key: string; dir: "asc" | "desc" } | null;

const STORE_KEY = "ow-ledger-v1";

const NAV: { id: SectionId; label: string; icon: typeof BookOpen }[] = [
  { id: "brief", label: "Brief", icon: BookOpen },
  { id: "models", label: "Models", icon: Scale },
  { id: "speed", label: "Speed", icon: Gauge },
  { id: "quality", label: "Quality", icon: ShieldCheck },
  { id: "hardware", label: "Hardware", icon: Cpu },
  { id: "metrics", label: "Metrics", icon: Gauge },
  { id: "scoring", label: "Scoring", icon: Scale },
  { id: "sources", label: "Sources", icon: BookOpen },
  { id: "dictionary", label: "Fields", icon: BookOpen },
];

const DECISION_COLUMNS = [
  STATUS_COLUMN,
  FIT_COLUMN,
  "Model Name",
  "Primary Modality",
  "Publisher",
  "Commercial Local Verdict",
  "License",
  "Parameters Total (B)",
  "Parameters Active (B)",
  "Recommended Model Size (GB)",
  "Context / Input Limit",
  "Quality Summary Score",
  "Quality Leaderboard Rank",
];

const PRESETS: { id: string; label: string; columns: string[] }[] = [
  { id: "decision", label: "Decision", columns: DECISION_COLUMNS },
  {
    id: "legal",
    label: "Legal",
    columns: [
      "Model Name",
      "License",
      "Commercial Use",
      "Commercial Local Use",
      "Commercial Local Verdict",
      "Weight Redistribution",
      "Fine-Tuning / Derivatives",
      "Commercial Output Use",
      "Attribution Required",
      "License Restrictions",
      "License Source URL",
    ],
  },
  {
    id: "hardware",
    label: "Hardware",
    columns: [
      FIT_COLUMN,
      "Model Name",
      "Primary Modality",
      "Recommended Local Quantization",
      "Recommended Model Size (GB)",
      "Minimum RAM (GB)",
      "Minimum VRAM (GB)",
      "Minimum Unified Memory (GB)",
      "Primary Local Runtime",
      "CPU Support",
      "NVIDIA Support",
      "AMD Support",
      "Apple Silicon Support",
      "Recommended Machine",
    ],
  },
  {
    id: "quality",
    label: "Scores",
    columns: [
      "Model Name",
      "Primary Modality",
      "Quality Summary Metric",
      "Quality Summary Score",
      "Quality Leaderboard Rank",
      "Speed Summary Metric",
      "Speed Summary Value",
      "Speed Summary Unit",
      "Benchmark Hardware",
      "Time to First Output (ms)",
    ],
  },
];

const MODEL_GROUPS: { title: string; columns: string[] }[] = [
  {
    title: "Identity",
    columns: [
      "Model ID",
      "Model Name",
      "Model Family",
      "Publisher",
      "Version",
      "Release Date",
      "Primary Modality",
      "Supported Tasks",
      "Open Weights",
      "Official Model URL",
      "Weights URL",
      "Parameters Total (B)",
      "Parameters Active (B)",
      "Architecture",
      "Native Precision",
      "Languages Supported",
      "Context / Input Limit",
    ],
  },
  {
    title: "License",
    columns: [
      "License",
      "Code License",
      "Commercial Use",
      "Commercial Local Use",
      "Weight Redistribution",
      "Fine-Tuning / Derivatives",
      "Commercial Output Use",
      "Attribution Required",
      "License Restrictions",
      "License Source URL",
      "License Verified Date",
      "Commercial Local Verdict",
    ],
  },
  {
    title: "Runtime",
    columns: [
      "Offline Operation",
      "Streaming Output",
      "Primary Local Runtime",
      "Alternative Local Runtimes",
      "CPU Support",
      "NVIDIA Support",
      "AMD Support",
      "Apple Silicon Support",
      "Intel / NPU Support",
      "Available Quantizations",
      "Recommended Local Quantization",
    ],
  },
  {
    title: "Hardware",
    columns: [
      "Recommended Model Size (GB)",
      "Minimum RAM (GB)",
      "Recommended RAM (GB)",
      "Minimum VRAM (GB)",
      "Recommended VRAM (GB)",
      "Minimum Unified Memory (GB)",
      "Recommended Minimum Machine",
      "Recommended Machine",
    ],
  },
  {
    title: "Summaries",
    columns: [
      "Quality Summary Metric",
      "Quality Summary Score",
      "Quality Leaderboard Rank",
      "Speed Summary Metric",
      "Speed Summary Value",
      "Speed Summary Unit",
      "Benchmark Hardware",
      "Benchmark Quantization",
      "Benchmark Runtime",
      "Peak RAM (GB)",
      "Peak VRAM / Unified Memory (GB)",
      "Time to First Output (ms)",
      "Local Suitability Score (0-100)",
      "Notes",
    ],
  },
];

function hintsFor(sheet: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of workbook.dictionary) {
    if (row.Sheet === sheet && row.Column) map[row.Column] = row.Description;
  }
  map[FIT_COLUMN] =
    "Yes when minimum RAM fits the profile and accelerator memory covers unified memory (if RAM equals VRAM) or minimum VRAM / file size otherwise.";
  map[STATUS_COLUMN] =
    "Gate result for the selected machine. License No and a memory miss block the row. Missing speed or quality leaves it ungraded — no invented 0–100 score.";
  return map;
}

function decorateModel(model: Row, profile: Row): Row {
  const fit = fitsProfile(model, profile);
  return { ...model, [FIT_COLUMN]: fit, [STATUS_COLUMN]: localStatus(model, fit) };
}

export function LedgerApp() {
  const [section, setSection] = useState<SectionId>("models");
  const [profileId, setProfileId] = useState("HW-MAIN-32");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<Sort>({ key: "Model Name", dir: "asc" });
  const [preset, setPreset] = useState("decision");
  const [customColumns, setCustomColumns] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [notice, setNotice] = useState("");
  const [imported, setImported] = useState<{ models?: Row[]; speed?: Row[]; quality?: Row[] }>({});
  const skipPersist = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setImported(JSON.parse(raw) as { models?: Row[]; speed?: Row[]; quality?: Row[] });
    } catch {
      /* ignore broken local catalogs */
    }
  }, []);

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(imported));
  }, [imported]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const profile =
    workbook.hardware.find((row) => row["Hardware Profile ID"] === profileId) ??
    workbook.hardware[0];

  const models = useMemo(
    () => (imported.models ?? workbook.models).map((row) => decorateModel(row, profile)),
    [imported.models, profile],
  );
  const speedRows = imported.speed ?? workbook.speed;
  const qualityRows = imported.quality ?? workbook.quality;

  const sheet = useMemo(() => {
    switch (section) {
      case "models":
        return {
          id: "Models",
          columns: workbook.modelColumns,
          rows: models,
          virtual: [STATUS_COLUMN, FIT_COLUMN],
        };
      case "speed":
        return { id: "Speed_Benchmarks", columns: workbook.speedColumns, rows: speedRows, virtual: [] };
      case "quality":
        return {
          id: "Quality_Benchmarks",
          columns: workbook.qualityColumns,
          rows: qualityRows,
          virtual: [],
        };
      case "hardware":
        return {
          id: "Hardware_Profiles",
          columns: workbook.hardwareColumns,
          rows: workbook.hardware,
          virtual: [],
        };
      case "metrics":
        return { id: "Metric_Catalog", columns: workbook.metricColumns, rows: workbook.metrics, virtual: [] };
      case "scoring":
        return { id: "Decision_Scoring", columns: workbook.scoreColumns, rows: workbook.scores, virtual: [] };
      case "sources":
        return { id: "Sources_Standards", columns: workbook.sourceColumns, rows: workbook.sources, virtual: [] };
      case "dictionary":
        return {
          id: "Field_Dictionary",
          columns: workbook.dictionaryColumns,
          rows: workbook.dictionary,
          virtual: [],
        };
      default:
        return null;
    }
  }, [models, qualityRows, section, speedRows]);

  const visibleColumns = useMemo(() => {
    if (!sheet) return [];
    if (section !== "models") return sheet.columns;
    if (customColumns) return customColumns;
    const chosen = PRESETS.find((item) => item.id === preset)?.columns ?? DECISION_COLUMNS;
    return chosen.filter((column) => sheet.virtual.includes(column) || sheet.columns.includes(column));
  }, [customColumns, preset, section, sheet]);

  const shownRows = useMemo(() => {
    if (!sheet) return [];
    const filtered = sheet.rows.filter((row) => rowMatches(row, filters, query));
    if (!sort) return filtered;
    const key = sort.key;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareValues(a[key] ?? "", b[key] ?? "") * dir);
  }, [filters, query, sheet, sort]);

  function changeSection(next: SectionId) {
    setSection(next);
    setFilters({});
    setQuery("");
    setSort(next === "models" ? { key: "Model Name", dir: "asc" } : null);
    setSelected(null);
    setNotice("");
  }

  function toggleSort(column: string) {
    setSort((current) => {
      if (current?.key !== column) return { key: column, dir: "asc" };
      if (current.dir === "asc") return { key: column, dir: "desc" };
      return null;
    });
  }

  function exportView() {
    if (!sheet) return;
    const columns = section === "models" ? visibleColumns : sheet.columns;
    const blob = new Blob([toCsv(columns, shownRows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${section}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function onImport(file: File) {
    if (!sheet || (section !== "models" && section !== "speed" && section !== "quality")) {
      setNotice("Import is available on Models, Speed, and Quality.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = rowsFromCsv(String(reader.result ?? ""), sheet.columns);
        setImported((current) => ({ ...current, [section]: rows }));
        setNotice(`Imported ${rows.length} ${section} rows onto this browser. Starter rows are untouched until you reset.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not read that CSV.");
      }
    };
    reader.readAsText(file);
  }

  const fitYes = models.filter((row) => row[FIT_COLUMN] === "Yes").length;
  const commercialYes = models.filter(
    (row) => row["Commercial Local Verdict"] === "Yes" && row[FIT_COLUMN] === "Yes",
  ).length;

  const hintMap = sheet ? hintsFor(sheet.id) : {};

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      <header className="z-20 flex shrink-0 flex-col gap-3 border-b border-line bg-paper px-4 py-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 32 32" className="mt-0.5 size-9 shrink-0" aria-hidden="true">
            <rect width="32" height="32" rx="6" className="fill-pine" />
            <path
              d="M9 8.5h8.2a5.2 5.2 0 0 1 0 10.4H13.2V23.5H9V8.5zm4.2 6.6h3.7a1.6 1.6 0 0 0 0-3.2h-3.7v3.2z"
              className="fill-pine-fg"
            />
          </svg>
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
              Open-weight evaluation
            </p>
            <h1 className="font-display text-2xl leading-none font-medium text-ink md:text-3xl">
              Local model ledger
            </h1>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
            Target machine
            <select
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              className="min-h-11 rounded-sm border border-line bg-card px-2 text-sm text-ink"
            >
              {workbook.hardware.map((row) => (
                <option key={row["Hardware Profile ID"]} value={row["Hardware Profile ID"]}>
                  {row["Profile Name"]} · {row["VRAM / Unified Memory (GB)"]}GB
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">
            Search all columns
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, license, runtime…"
                className="min-h-11 w-full min-w-0 rounded-sm border border-line bg-card pr-3 pl-8 text-sm text-ink placeholder:text-muted sm:w-64"
              />
            </span>
          </label>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 py-2 md:w-48 md:flex-col md:overflow-visible md:border-r md:border-b-0 md:px-2 md:py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => changeSection(item.id)}
                className={
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-sm px-3 text-sm md:w-full " +
                  (active ? "bg-pine text-pine-fg" : "text-ink hover:bg-card")
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 overflow-auto px-4 py-4 md:px-6">
          {section === "brief" ? (
            <Brief
              profileName={profile["Profile Name"]}
              total={models.length}
              fitYes={fitYes}
              commercialFit={commercialYes}
              onOpenModels={() => changeSection("models")}
            />
          ) : (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <h2 className="font-display text-3xl leading-tight font-medium">
                    {NAV.find((item) => item.id === section)?.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {workbook.sheets.find((item) => item.name === sheet?.id)?.purpose}
                    {section === "models"
                      ? ` ${commercialYes} commercially cleared models fit ${profile["Profile Name"]}. ${fitYes} fit before the license gate.`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {section === "models"
                    ? PRESETS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPreset(item.id);
                            setCustomColumns(null);
                          }}
                          className={
                            "min-h-11 rounded-full px-3 text-sm " +
                            (preset === item.id && !customColumns
                              ? "bg-ink text-paper"
                              : "bg-card text-ink ring-1 ring-line ring-inset")
                          }
                        >
                          {item.label}
                        </button>
                      ))
                    : null}
                  {section === "models" ? (
                    <ColumnPicker
                      columns={[STATUS_COLUMN, FIT_COLUMN, ...workbook.modelColumns]}
                      selected={visibleColumns}
                      onToggle={(column) => {
                        setCustomColumns((current) => {
                          const base = current ?? visibleColumns;
                          return base.includes(column)
                            ? base.filter((item) => item !== column)
                            : [...base, column];
                        });
                      }}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={exportView}
                    className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-card px-3 text-sm ring-1 ring-line ring-inset"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    CSV
                  </button>
                  {section === "models" || section === "speed" || section === "quality" ? (
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-card px-3 text-sm ring-1 ring-line ring-inset">
                      <Upload className="size-4" aria-hidden="true" />
                      Import
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) onImport(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                  {section === "models" || section === "speed" || section === "quality" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImported((current) => {
                          if (section !== "models" && section !== "speed" && section !== "quality") {
                            return current;
                          }
                          const next = { ...current };
                          delete next[section];
                          return next;
                        });
                        setNotice("Restored the starter rows for this sheet.");
                      }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm text-muted hover:text-ink"
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>

              {section === "models" ? (
                <p className="max-w-3xl text-sm text-muted">
                  Starter catalog, not your measurements. Licenses were summarized on 25 Sep 2026 from
                  public cards and roundups — confirm each LICENSE file. Speed cells stay empty until
                  you record a run. Quality indexes shown here are a July 2026 secondary summary of
                  Artificial Analysis, not a fresh pull. Not legal advice.
                </p>
              ) : null}
              {section === "speed" && speedRows.length === 0 ? (
                <p className="max-w-3xl rounded-md border border-line bg-card px-4 py-3 text-sm text-muted">
                  No speed runs yet. A tok/s number without hardware, quant, runtime, context length,
                  and concurrency is not comparable — that is why this sheet is empty instead of filled
                  with guesses. Import a CSV whose headers match the columns, or export the header row
                  and fill it.
                </p>
              ) : null}
              {notice ? <p className="text-sm text-pine">{notice}</p> : null}

              <p className="text-xs tracking-wide text-muted uppercase">
                {shownRows.length} of {sheet?.rows.length ?? 0} rows
                {sort ? ` · sorted by ${sort.key} ${sort.dir}` : ""}
              </p>

              {section === "models" ? (
                <div className="flex flex-col gap-2 md:hidden">
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Sort
                    <select
                      value={sort ? `${sort.key}:${sort.dir}` : ""}
                      onChange={(event) => {
                        const [key, dir] = event.target.value.split(":");
                        if (!key || (dir !== "asc" && dir !== "desc")) setSort(null);
                        else setSort({ key, dir });
                      }}
                      className="min-h-11 rounded-sm border border-line bg-card px-2 text-sm text-ink"
                    >
                      <option value="">Unsorted</option>
                      {visibleColumns.map((column) => (
                        <option key={`${column}-asc`} value={`${column}:asc`}>
                          {column} · ascending
                        </option>
                      ))}
                      {visibleColumns.map((column) => (
                        <option key={`${column}-desc`} value={`${column}:desc`}>
                          {column} · descending
                        </option>
                      ))}
                    </select>
                  </label>
                  <details className="rounded-md border border-line bg-card px-3">
                    <summary className="flex min-h-11 items-center text-sm">Filter columns</summary>
                    <div className="flex flex-col gap-2 pb-3">
                      {visibleColumns.map((column) => (
                        <label key={column} className="flex flex-col gap-1 text-xs text-muted">
                          {column}
                          <input
                            value={filters[column] ?? ""}
                            onChange={(event) =>
                              setFilters((current) => ({ ...current, [column]: event.target.value }))
                            }
                            placeholder="Contains…"
                            className="min-h-11 rounded-sm border border-line bg-paper px-2 text-sm text-ink"
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                  <ul className="flex flex-col gap-2">
                    {shownRows.map((row) => (
                      <li key={row["Model ID"]}>
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="w-full rounded-md border border-line bg-card p-3 text-left"
                        >
                          <span className="block font-medium">{row["Model Name"]}</span>
                          <span className="mt-1 block text-sm text-muted">
                            {row.Publisher} · {row["Primary Modality"]}
                          </span>
                          <span className="mt-2 block text-sm">{row[STATUS_COLUMN]}</span>
                          <span className="mt-1 block text-xs text-muted">
                            {row.License} · {row["Parameters Total (B)"] || "—"}B · fit {row[FIT_COLUMN]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={"ledger-pane min-h-0 " + (section === "models" ? "hidden md:block" : "")}>
                {sheet ? (
                  <DataTable
                    columns={section === "models" ? visibleColumns : sheet.columns}
                    rows={shownRows}
                    filters={filters}
                    onFilter={(column, value) =>
                      setFilters((current) => ({ ...current, [column]: value }))
                    }
                    sort={sort}
                    onSort={toggleSort}
                    hints={hintMap}
                    onOpen={section === "models" || section === "quality" ? setSelected : undefined}
                    rowKey={(row, index) =>
                      row["Model ID"] ||
                      row["Benchmark ID"] ||
                      row["Result ID"] ||
                      row["Hardware Profile ID"] ||
                      `${row["Sheet"] ?? ""}-${row["Column"] ?? ""}-${row["Metric"] ?? ""}-${index}`
                    }
                  />
                ) : null}
              </div>

              {section === "scoring" ? (
                <div className="mt-4">
                  <h3 className="font-display text-2xl font-medium">Leaderboard flow</h3>
                  <ol className="mt-3 grid gap-2 md:grid-cols-2">
                    {workbook.flow.map((step) => (
                      <li key={step.Step} className="rounded-md border border-line bg-card p-3">
                        <p className="text-xs tracking-wide text-muted uppercase">Step {step.Step}</p>
                        <p className="mt-1 font-medium">{step.Rule}</p>
                        <p className="mt-1 text-sm text-muted">{step.Why}</p>
                        <p className="mt-2 text-sm text-pine">{step.Result}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </section>
          )}
        </main>
      </div>

      {selected ? (
        <Detail
          row={selected}
          quality={qualityRows.filter((item) => item["Model ID"] === selected["Model ID"])}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function Brief({
  profileName,
  total,
  fitYes,
  commercialFit,
  onOpenModels,
}: {
  profileName: string;
  total: number;
  fitYes: number;
  commercialFit: number;
  onOpenModels: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-10">
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">Workbook</p>
        <h2 className="mt-2 font-display text-4xl leading-tight font-medium md:text-5xl">
          Four questions before a weight file ships.
        </h2>
        <p className="mt-4 text-base text-muted">{workbook.summary}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["1", "Legal", "Can it be used in commercial local software?"],
          ["2", "Hardware", "Does it fit the target machine's memory?"],
          ["3", "Speed", "How fast is that exact quant, runtime, and hardware?"],
          ["4", "Quality", "Is the modality-specific score good enough?"],
        ].map(([n, title, body]) => (
          <article key={n} className="rounded-md border border-line bg-card p-4">
            <p className="font-display text-3xl text-pine">{n}</p>
            <h3 className="mt-2 text-lg font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h3 className="font-display text-2xl font-medium">Gates, then weights</h3>
          <p className="mt-1 text-sm text-muted">
            Quality never rescues a non-commercial license or a model that does not fit.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {workbook.scores.map((row) => {
              const weight = row["Default Weight / Rule"];
              const pct = weight.endsWith("%") ? Number(weight.replace("%", "")) : 0;
              return (
                <li key={row.Criterion}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{row.Criterion}</span>
                    <span className="text-muted">{weight}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-line">
                    <div
                      className="h-1.5 rounded-full bg-pine"
                      style={{ width: pct ? `${Math.max(pct, 8)}%` : "2.75rem" }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">{row["How to Use"]}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <aside className="rounded-md border border-line bg-card p-4">
          <h3 className="font-display text-2xl font-medium">This catalog, {profileName}</h3>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="text-xs text-muted">Models</dt>
              <dd className="font-display text-3xl">{total}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Fit memory</dt>
              <dd className="font-display text-3xl">{fitYes}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">And legal</dt>
              <dd className="font-display text-3xl">{commercialFit}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            “And legal” means Commercial Local Verdict is Yes and the row fits the machine selected
            in the header. Conditional licenses stay in review. No suitability score is invented
            where speed or quality is blank.
          </p>
          <button
            type="button"
            onClick={onOpenModels}
            className="mt-4 min-h-11 rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg"
          >
            Open the model table
          </button>
        </aside>
      </div>

      <div>
        <h3 className="font-display text-2xl font-medium">Design rules</h3>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {workbook.rules.map((rule) => (
            <li key={rule.rule} className="grid gap-1 py-3 md:grid-cols-[16rem_1fr] md:gap-6">
              <p className="font-medium">{rule.rule}</p>
              <p className="text-sm text-muted">{rule.recommendation}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-2xl font-medium">Modalities stay on their own scales</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {workbook.modalities.map((item) => (
            <li key={item.name} className="rounded-md border border-line bg-card px-3 py-2">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-sm text-muted">{item.tasks}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-line bg-card p-4 text-sm text-muted">
        <p className="font-medium text-ink">Publish on GitHub Pages</p>
        <p className="mt-2">
          This ledger is a static site: no account and no server. Download the single HTML file and
          commit it as <span className="text-ink">index.html</span> on a{" "}
          <span className="text-ink">gh-pages</span> branch, or drop it in{" "}
          <span className="text-ink">/docs</span> and set Pages to that folder. Sorting, filtering,
          the hardware gate, and CSV import all run in the browser. Imported rows stay in this
          browser only.
        </p>
        <a
          href="/open-weight-ledger.html"
          download
          className="mt-3 inline-flex min-h-11 items-center rounded-sm bg-ink px-4 text-sm font-medium text-paper"
        >
          Download the GitHub Pages file
        </a>
      </div>
    </div>
  );
}

function ColumnPicker({
  columns,
  selected,
  onToggle,
}: {
  columns: string[];
  selected: string[];
  onToggle: (column: string) => void;
}) {
  return (
    <details className="relative">
      <summary className="inline-flex min-h-11 list-none items-center gap-2 rounded-sm bg-card px-3 text-sm ring-1 ring-line ring-inset">
        <Columns3 className="size-4" aria-hidden="true" />
        Columns
      </summary>
      <div className="absolute right-0 z-30 mt-1 max-h-80 w-72 overflow-auto rounded-md border border-line bg-card p-2 shadow-lg">
        {columns.map((column) => (
          <label key={column} className="flex min-h-11 items-center gap-2 px-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(column)}
              onChange={() => onToggle(column)}
            />
            <span className="truncate">{column}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function Detail({ row, quality, onClose }: { row: Row; quality: Row[]; onClose: () => void }) {
  const isModel = Boolean(row["Model Name"]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/40" onClick={onClose} role="presentation">
      <article
        role="dialog"
        aria-modal="true"
        aria-label={row["Model Name"] || row["Benchmark / Leaderboard"] || "Row"}
        className="h-full w-full max-w-xl overflow-auto bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.14em] text-muted uppercase">
              {row["Primary Modality"] || row["Capability Dimension"] || "Row"}
            </p>
            <h3 className="font-display text-3xl leading-tight font-medium">
              {row["Model Name"] || row["Benchmark / Leaderboard"]}
            </h3>
            {row[STATUS_COLUMN] ? (
              <p className="mt-2 text-sm text-pine">{row[STATUS_COLUMN]}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-paper"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {isModel
          ? MODEL_GROUPS.map((group) => (
              <section key={group.title} className="mt-6">
                <h4 className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
                  {group.title}
                </h4>
                <dl className="mt-2 divide-y divide-line border-y border-line">
                  {group.columns.map((column) => (
                    <div key={column} className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr]">
                      <dt className="text-xs text-muted">{column}</dt>
                      <dd className="text-sm break-words">
                        {/^https?:\/\//.test(row[column] ?? "") ? (
                          <a
                            href={row[column]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-pine underline underline-offset-2"
                          >
                            {row[column]}
                          </a>
                        ) : (
                          row[column] || "—"
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          : (
            <dl className="mt-6 divide-y divide-line border-y border-line">
              {Object.entries(row)
                .filter(([, value]) => value)
                .map(([column, value]) => (
                  <div key={column} className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr]">
                    <dt className="text-xs text-muted">{column}</dt>
                    <dd className="text-sm break-words">
                      {/^https?:\/\//.test(value) ? (
                        <a href={value} className="text-pine underline" target="_blank" rel="noreferrer">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          )}

        {isModel && quality.length > 0 ? (
          <section className="mt-6">
            <h4 className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
              Quality evidence
            </h4>
            <ul className="mt-2 flex flex-col gap-2">
              {quality.map((item) => (
                <li key={item["Result ID"]} className="rounded-md border border-line bg-paper p-3 text-sm">
                  <p className="font-medium">
                    {item["Benchmark / Leaderboard"]}: {item.Score} {item["Score Unit"]}
                  </p>
                  <p className="text-muted">
                    {item["Evaluation Date"]} · rank {item.Rank || "—"} · {item.Evaluator}
                  </p>
                  {item["Source URL"] ? (
                    <a
                      href={item["Source URL"]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pine underline underline-offset-2"
                    >
                      Source
                    </a>
                  ) : null}
                  <p className="mt-1 text-muted">{item.Notes}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
