import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useStockStore } from "@/store/useStockStore";

export function PartyReportPage() {
  const { entries, parties } = useStockStore();
  const [partyName, setPartyName] = useState("all");

  const filtered = useMemo(
    () => entries.filter((e) => (partyName === "all" ? true : e.partyName === partyName)),
    [entries, partyName]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Party-wise Report"
        subtitle="Quick snapshot by customer/broker."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary">Export PDF</Button>
            <Button>Export Excel</Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={partyName} onChange={(e) => setPartyName(e.target.value)}>
          <option value="all">All Parties</option>
          {parties.map((p) => (
            <option key={p.id} value={p.partyName}>
              {p.partyName}
            </option>
          ))}
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <DataTable
          data={filtered}
          columns={[
            { key: "partyName", header: "Party" },
            { key: "designNumber", header: "Design" },
            { key: "quantityMeters", header: "Meters" },
            { key: "quantityWeightKg", header: "Kg" },
            { key: "totalAmount", header: "Amount" },
            { key: "entryDate", header: "Date" }
          ]}
          emptyMessage="No entries for this party."
        />
      </motion.div>
    </div>
  );
}



