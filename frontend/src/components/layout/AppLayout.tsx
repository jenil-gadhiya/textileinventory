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
      <aside className="hidden w-64 flex-col gap-6 border-r border-border/10 bg-surface-100/50 px-6 py-8 backdrop-blur-2xl lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted">Textile OS</p>
            <p className="text-lg font-semibold text-body">Inventory</p>
          </div>
        </Link>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all",
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
          <nav className="space-y-2">
            {parameterItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all",
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
              className="flex h-9 items-center justify-start rounded-xl bg-surface-200 px-3 text-sm font-semibold text-body transition hover:scale-[1.01] hover:bg-surface-300"
            >
              ➕ Add Stock
            </Link>
            <Link to="/stock/list" className="flex h-9 items-center justify-start rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-surface-200 hover:text-body">
              📊 View Stock
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-6xl space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted">Textile Stock OS</p>
              <h1 className="text-2xl font-semibold text-body">Modern Control Panel</h1>
            </div>
            <Button size="sm" variant="secondary" onClick={toggleTheme}>
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </Button>
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  );
}

