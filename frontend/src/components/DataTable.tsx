import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  emptyMessage = "No data",
  onRowClick
}: DataTableProps<T>) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl border border-border/10 shadow-glass">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/10">
          <thead className="bg-surface-200/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/5">
            <AnimatePresence initial={false}>
              {data.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-sm text-muted"
                    colSpan={columns.length}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {data.map((row, idx) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "hover:bg-surface-200/50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-sm text-body">
                      {col.render ? col.render(row) : String(row[col.key])}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}



