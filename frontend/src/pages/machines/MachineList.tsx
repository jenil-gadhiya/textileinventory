import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useStockStore } from "@/store/useStockStore";

export function MachineListPage() {
  const navigate = useNavigate();
  const { machines, deleteMachine } = useStockStore();
  const [search, setSearch] = useState("");
  const [shift, setShift] = useState("all");

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        m.machineNumber.toLowerCase().includes(search.toLowerCase()) ||
        m.machineType.toLowerCase().includes(search.toLowerCase());
      const matchesShift = shift === "all" ? true : m.shift === shift;
      return matchesSearch && matchesShift;
    });
  }, [machines, search, shift]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine Management"
        subtitle="Keep your machine registry searchable and clean."
        ctaHref="/machines/add"
        ctaLabel="Add Machine"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search machine number or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="all">All Shifts</option>
          <option value="A">Shift A</option>
          <option value="B">Shift B</option>
          <option value="C">Shift C</option>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <DataTable
          data={filtered}
          columns={[
            { key: "machineNumber", header: "Number" },
            { key: "machineType", header: "Type" },
            { key: "shift", header: "Shift" },
            { key: "remarks", header: "Remarks" },
            {
              key: "id",
              header: "Actions",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/machines/edit/${row.id}`)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMachine(row.id)}>
                    Delete
                  </Button>
                </div>
              )
            }
          ]}
        />
      </motion.div>

      <Link
        to="/machines/add"
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple text-slate-900 shadow-xl shadow-cyan-500/30 transition hover:scale-[1.04]"
      >
        +
      </Link>
    </div>
  );
}

