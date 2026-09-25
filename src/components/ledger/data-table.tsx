import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { Row } from "@/data/types";

type Sort = { key: string; dir: "asc" | "desc" } | null;

type Props = {
  columns: string[];
  rows: Row[];
  filters: Record<string, string>;
  onFilter: (column: string, value: string) => void;
  sort: Sort;
  onSort: (column: string) => void;
  hints?: Record<string, string>;
  onOpen?: (row: Row) => void;
  rowKey: (row: Row, index: number) => string;
};

const PILL_COLUMNS = new Set([
  "Commercial Local Verdict",
  "Commercial Use",
  "Commercial Local Use",
  "Fits Hardware Profile",
  "Local Status",
  "Open Weights",
  "Priority",
  "Type",
  "Higher Is Better",
]);

function pillClass(value: string): string {
  const v = value.toLowerCase();
  if (
    v === "yes" ||
    v.startsWith("eligible") ||
    v === "critical" ||
    v === "gate" ||
    v === "required"
  ) {
    return "bg-pine text-pine-fg";
  }
  if (v === "no" || v.startsWith("blocked")) return "bg-rust text-rust-fg";
  if (v.startsWith("conditional") || v === "partial" || v === "high" || v === "medium") {
    return "bg-paper text-ink ring-1 ring-inset ring-line";
  }
  return "bg-paper text-ink ring-1 ring-inset ring-line";
}

function Cell({ column, value }: { column: string; value: string }) {
  if (!value) return <span className="text-muted">—</span>;
  if (/^https?:\/\//.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-pine underline decoration-line underline-offset-2 hover:decoration-pine"
        onClick={(event) => event.stopPropagation()}
      >
        Link
      </a>
    );
  }
  if (PILL_COLUMNS.has(column)) {
    return (
      <span className={`inline-flex max-w-56 truncate rounded-full px-2 py-0.5 text-xs font-medium ${pillClass(value)}`}>
        {value}
      </span>
    );
  }
  return <span className="block max-w-72 truncate">{value}</span>;
}

export function DataTable({
  columns,
  rows,
  filters,
  onFilter,
  sort,
  onSort,
  hints,
  onOpen,
  rowKey,
}: Props) {
  return (
    <div className="h-full max-h-full min-h-0 max-w-full overflow-auto rounded-md border border-line bg-card">
      <table className="w-max min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--color-line)]">
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column;
              const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
              return (
                <th key={column} className="px-2 pt-2 align-bottom font-medium">
                  <button
                    type="button"
                    title={hints?.[column] || column}
                    onClick={() => onSort(column)}
                    className="flex items-center gap-1 whitespace-nowrap text-left text-xs tracking-wide text-muted uppercase hover:text-ink"
                  >
                    {column}
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </th>
              );
            })}
          </tr>
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-2 pt-1 pb-2 font-normal">
                <input
                  aria-label={`Filter ${column}`}
                  value={filters[column] ?? ""}
                  onChange={(event) => onFilter(column, event.target.value)}
                  placeholder="Filter"
                  className="w-full min-w-28 rounded-sm border border-line bg-paper px-2 py-1 text-xs text-ink placeholder:text-muted"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                No rows match these filters.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onOpen ? () => onOpen(row) : undefined}
                className={
                  "border-t border-line " +
                  (onOpen ? "cursor-pointer hover:bg-paper" : "")
                }
              >
                {columns.map((column) => (
                  <td key={column} className="px-2 py-2 align-middle whitespace-nowrap text-ink">
                    <Cell column={column} value={row[column] ?? ""} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
