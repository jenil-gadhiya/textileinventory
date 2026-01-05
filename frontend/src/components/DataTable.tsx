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
    <>
      {/* Desktop View: Table */}
      <div className="hidden md:block glass-panel overflow-hidden rounded-2xl border border-border/10 shadow-glass">
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

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {data.length === 0 && (
          <div className="text-center py-10 text-slate-500 glass-panel rounded-xl">
            {emptyMessage}
          </div>
        )}
        {data.map((row, idx) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "glass-panel p-4 rounded-xl space-y-3 border border-border/10",
              onRowClick && "active:scale-[0.98] transition-transform"
            )}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => {
              // Render content
              const content = col.render ? col.render(row) : String(row[col.key]);

              // If content is pure text/number, format it nicely. Valid ReactNodes pass through.
              return (
                <div key={String(col.key)} className="flex items-start justify-between gap-4">
                  <span className="text-xs font-medium uppercase text-muted shrink-0 mt-1">
                    {col.header}
                  </span>
                  <div className="text-sm text-body text-right font-medium break-words max-w-[70%]">
                    {content}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </>
  );
}



