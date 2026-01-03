import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { fetchDashboardStats, DashboardStats } from "@/api/dashboard";
import { Button } from "@/components/ui/button";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 }
  })
};

export function DashboardPage() {
  // Default range: Last 30 days
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardStats(fromDate, toDate);
      setStats(data);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader title="Dashboard" subtitle="Overview of your inventory and orders." />

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-surface-200 p-2 rounded-lg border border-border/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-sm text-body focus:outline-none"
            />
          </div>
          <div className="w-px h-4 bg-border/20"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-sm text-body focus:outline-none"
            />
          </div>
          <Button size="sm" onClick={loadStats} className="ml-2">Apply</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading dashboard...</div>
      ) : stats ? (
        <>
          {/* Section 1: Stock & KPIs */}
          <div>
            <h3 className="text-lg font-semibold text-body mb-3">Live Stock & KPIs</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Saree Stock", value: `${stats.stock.totalSareePieces} Pcs`, color: "text-pink-400" },
                { label: "Total Taka Stock", value: `${stats.stock.totalTakaPieces} Pcs`, color: "text-cyan-400" },
                { label: "Total Taka Meters", value: `${stats.stock.totalTakaMeters.toFixed(0)} m`, color: "text-blue-400" },
                { label: "Active Brokers", value: stats.totalBrokers, color: "text-green-400" },
              ].map((item, idx) => (
                <motion.div key={item.label} variants={cardVariants} initial="hidden" animate="visible" custom={idx}>
                  <Card className="relative overflow-hidden bg-surface-100 border-border/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted">{item.label}</CardTitle>
                      <CardDescription className={`text-2xl font-bold ${item.color}`}>
                        {item.value}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Section 2: Production Trend & Top Items */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="bg-surface-100 border-slate-200 dark:border-white/10 h-full">
                <CardHeader>
                  <CardTitle>Production Trend</CardTitle>
                  <CardDescription>Daily meters produced over the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductionChart data={stats.productionTrend} />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="bg-surface-100 border-slate-200 dark:border-white/10 h-full">
                <CardHeader>
                  <CardTitle>Top Selling Qualities</CardTitle>
                  <CardDescription>By total order value.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.topQualities.map((q, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-white/10 pb-2 last:border-0">
                      <div className="flex flex-col">
                        <span className="text-body font-medium">{q.name}</span>
                        <span className="text-[10px] text-slate-500">{q.quantity.toFixed(0)} m</span>
                      </div>
                      <span className="text-emerald-400">{formatCurrency(q.value)}</span>
                    </div>
                  ))}
                  {stats.topQualities.length === 0 && <p className="text-slate-500 text-sm">No sales data.</p>}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 3: Order Summary */}
          <div>
            <h3 className="text-lg font-semibold text-body mb-3 flex items-center gap-2">
              Order Analysis
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <OrderSummaryCard
                title="Total Orders"
                count={stats.orders.total.count}
                value={stats.orders.total.value}
                color="text-body"
              />
              <OrderSummaryCard
                title="Completed"
                count={stats.orders.completed.count}
                value={stats.orders.completed.value}
                color="text-green-400"
              />
              <OrderSummaryCard
                title="Pending"
                count={stats.orders.pending.count}
                value={stats.orders.pending.value}
                color="text-yellow-400"
              />
            </div>
          </div>

          {/* Section 4: Party Summary & Insights */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="bg-surface-100 border-border/10">
                <CardHeader>
                  <CardTitle>Party-wise Performance</CardTitle>
                  <CardDescription>Top parties by order value.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {stats.partySummary.map((party) => (
                      <div key={party.id} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-body">{party.name}</span>
                          <span className="text-muted">
                            {party.orderCount} Orders · {formatCurrency(party.totalValue)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface-300 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-green-500/80"
                            style={{ width: `${(party.completedCount / Math.max(party.orderCount, 1)) * 100}%` }}
                          />
                          <div
                            className="h-full bg-yellow-500/80"
                            style={{ width: `${(party.pendingCount / Math.max(party.orderCount, 1)) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                          <span>Completed: {party.completedCount}</span>
                          <span>Pending: {party.pendingCount}</span>
                        </div>
                      </div>
                    ))}
                    {stats.partySummary.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No orders found in this period.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-surface-100 border-slate-200 dark:border-white/10 h-full">
                <CardHeader>
                  <CardTitle>Quick Insights</CardTitle>
                  <CardDescription>Key metrics at a glance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <InsightRow
                    label="Avg. Order Value"
                    value={stats.orders.total.count ? formatCurrency(stats.orders.total.value / stats.orders.total.count) : "₹0"}
                  />
                  <InsightRow
                    label="Avg. Sales Rate"
                    value={stats.avgSalesRate ? `₹${stats.avgSalesRate.toFixed(2)} / m` : "₹0"}
                    highlight
                  />
                  <InsightRow
                    label="Pending Value"
                    value={formatCurrency(stats.orders.pending.value)}
                    highlight
                  />
                  <InsightRow
                    label="Completion Rate"
                    value={`${stats.orders.total.count ? Math.round((stats.orders.completed.count / stats.orders.total.count) * 100) : 0}%`}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-red-400">Failed to load data.</div>
      )}
    </div>
  );
}

// Sub-components

const ProductionChart = ({ data }: { data: { date: string; meters: number }[] }) => {
  if (!data.length) return <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No production data in this period</div>;

  const maxMeters = Math.max(...data.map(d => d.meters), 100);
  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
    const y = 100 - (d.meters / maxMeters) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="relative h-48 w-full mt-4">
      {/* Y-axis label */}
      <div className="absolute top-0 left-0 text-[10px] text-slate-500">{Math.round(maxMeters).toLocaleString()} m</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#chartGrad)" />
        <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute -bottom-6 w-full flex justify-between text-[10px] text-slate-500 px-0">
        <span>{new Date(data[0].date).toLocaleDateString()}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

function OrderSummaryCard({ title, count, value, color }: { title: string, count: number, value: number, color: string }) {
  return (
    <Card className="bg-surface-100 border-border/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted">{title}</CardTitle>
        <div className="flex items-end justify-between">
          <CardDescription className={`text-2xl font-bold ${color}`}>
            {count} <span className="text-sm font-normal text-slate-500">Orders</span>
          </CardDescription>
          <div className={`text-sm font-medium ${color} opacity-80`}>
            ₹{value.toLocaleString()}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function InsightRow({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center border-b border-border/10 pb-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-yellow-400' : 'text-body'}`}>{value}</span>
    </div>
  );
}
