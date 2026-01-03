import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useStockStore } from "@/store/useStockStore";

export function StockListPage() {
  const { entries, machines, parties } = useStockStore();
  const [machine, setMachine] = useState("all");
  const [party, setParty] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesMachine = machine === "all" || e.machineNumber === machine;
      const matchesParty = party === "all" || e.partyName === party;
      const matchesSearch = search
        ? [e.designNumber, e.designName, e.itemName, e.rollNumber].some((v) =>
            v.toLowerCase().includes(search.toLowerCase())
          )
        : true;
      return matchesMachine && matchesParty && matchesSearch;
    });
  }, [entries, machine, party, search]);

  return (
    <div className="space-y-6">
      <PageHeader title="Stock List" subtitle="Search, filter and review all stock entries." />

      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Search design, item or roll..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={machine} onChange={(e) => setMachine(e.target.value)}>
          <option value="all">All Machines</option>
          {machines.map((m) => (
            <option key={m.id} value={m.machineNumber}>
              {m.machineNumber}
            </option>
          ))}
        </Select>
        <Select value={party} onChange={(e) => setParty(e.target.value)}>
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
            { key: "rollNumber", header: "Roll" },
            { key: "designNumber", header: "Design" },
            { key: "itemName", header: "Item" },
            { key: "machineNumber", header: "Machine" },
            { key: "partyName", header: "Party" },
            { key: "quantityMeters", header: "Meters" },
            { key: "quantityWeightKg", header: "Kg" },
            { key: "status", header: "Status" },
            { key: "entryDate", header: "Date" }
          ]}
          emptyMessage="No stock entries yet."
        />
      </motion.div>
    </div>
  );
}



