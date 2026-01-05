import { ReactNode, useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useStockStore } from "@/store/useStockStore";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Stock Report", to: "/inventory/report" },
  { label: "Catalog", to: "/catalog" },
  { label: "Production", to: "/production/list" },
  { label: "Orders", to: "/orders" },
  { label: "Challans", to: "/challans/create" },
  { label: "Parties", to: "/parties" },
  { label: "Brokers", to: "/brokers" },
  { label: "Salesmen", to: "/salesmen" },
  { label: "Settings", to: "/settings" }
];

const parameterItems = [
  { label: "Quality Names", to: "/parameters/qualities" },
  { label: "Design Number", to: "/designs" },
  { label: "Matching Names", to: "/parameters/matchings" },
  { label: "Images", to: "/parameters/images" },
  { label: "Factory", to: "/parameters/factories" }
];

interface Props {
  children: ReactNode;
}

export function AppLayout({ children }: Props) {
  const loadAll = useStockStore((s) => s.loadAll);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    loadAll().catch((err) => console.error("Failed to load data", err));
  }, [loadAll]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-surface-100 via-surface-200 to-surface-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border/10 bg-surface-100/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple" />
          <span className="text-sm font-semibold tracking-wider text-body">TEXTILE OS</span>
        </div>
        <Button size="md" variant="ghost" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
          )}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-6 border-r border-border/10 bg-surface-100/95 px-6 py-8 backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0 lg:bg-surface-100/50",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileOpen(false)}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted">Textile OS</p>
            <p className="text-lg font-semibold text-body">Inventory</p>
          </div>
        </Link>
        <nav className="space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all min-h-[44px]",
                  "hover:bg-surface-200 hover:text-body text-muted",
                  isActive && "bg-surface-200 text-body"
                )
              }
            >
              <span>{item.label}</span>
              <span className="text-xs opacity-50">⟶</span>
            </NavLink>
          ))}
        </nav>
        <div className="pt-4">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">
            Other Parameters
          </p>
          <nav className="space-y-2 overflow-y-auto">
            {parameterItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all min-h-[44px]",
                    "hover:bg-surface-200 hover:text-body text-muted",
                    isActive && "bg-surface-200 text-body"
                  )
                }
              >
                <span>{item.label}</span>
                <span className="text-xs opacity-50">⟶</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-auto space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Quick Actions</p>
          <div className="flex flex-col gap-2">
            <Link
              to="/stock/new"
              onClick={() => setIsMobileOpen(false)}
              className="flex h-11 items-center justify-start rounded-xl bg-surface-200 px-3 text-sm font-semibold text-body transition hover:scale-[1.01] hover:bg-surface-300"
            >
              ➕ Add Stock
            </Link>
            <Link
              to="/stock/list"
              onClick={() => setIsMobileOpen(false)}
              className="flex h-11 items-center justify-start rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-surface-200 hover:text-body"
            >
              📊 View Stock
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10 mt-14 lg:mt-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-6xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted">Textile Stock OS</p>
              <h1 className="text-2xl font-semibold text-body">Modern Control Panel</h1>
            </div>
            <Button size="sm" variant="secondary" onClick={toggleTheme} className="w-full sm:w-auto">
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </Button>
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  );
}

