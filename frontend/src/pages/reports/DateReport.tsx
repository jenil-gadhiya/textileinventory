import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStockStore } from "@/store/useStockStore";

export function DateReportPage() {
  const { entries } = useStockStore();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const date = new Date(e.entryDate);
      const afterFrom = fromDate ? date >= new Date(fromDate) : true;
      const beforeTo = toDate ? date <= new Date(toDate) : true;
      return afterFrom && beforeTo;
    });
  }, [entries, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Date-wise Report"
        subtitle="Slice entries by date window."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary">Export PDF</Button>
            <Button>Export Excel</Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <DataTable
          data={filtered}
          columns={[
            { key: "entryDate", header: "Date" },
            { key: "machineNumber", header: "Machine" },
            { key: "partyName", header: "Party" },
            { key: "quantityMeters", header: "Meters" },
            { key: "quantityWeightKg", header: "Kg" },
            { key: "totalAmount", header: "Amount" }
          ]}
          emptyMessage="No entries for this period."
        />
      </motion.div>
    </div>
  );
}



