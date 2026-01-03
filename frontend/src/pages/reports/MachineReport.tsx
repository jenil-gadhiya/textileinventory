import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useStockStore } from "@/store/useStockStore";

export function MachineReportPage() {
  const { entries, machines } = useStockStore();
  const [machineNumber, setMachineNumber] = useState("all");

  const filtered = useMemo(
    () =>
      entries.filter((e) => (machineNumber === "all" ? true : e.machineNumber === machineNumber)),
    [entries, machineNumber]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine-wise Report"
        subtitle="Filter by machine and export."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary">Export PDF</Button>
            <Button>Export Excel</Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={machineNumber} onChange={(e) => setMachineNumber(e.target.value)}>
          <option value="all">All Machines</option>
          {machines.map((m) => (
            <option key={m.id} value={m.machineNumber}>
              {m.machineNumber}
            </option>
          ))}
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <DataTable
          data={filtered}
          columns={[
            { key: "machineNumber", header: "Machine" },
            { key: "designNumber", header: "Design" },
            { key: "quantityMeters", header: "Meters" },
            { key: "quantityWeightKg", header: "Kg" },
            { key: "totalAmount", header: "Amount" },
            { key: "entryDate", header: "Date" }
          ]}
          emptyMessage="No entries yet."
        />
      </motion.div>
    </div>
  );
}



