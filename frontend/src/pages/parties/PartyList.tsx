import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStockStore } from "@/store/useStockStore";

export function PartyListPage() {
  const navigate = useNavigate();
  const { parties, deleteParty } = useStockStore();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      parties.filter((p) =>
        p.partyName.toLowerCase().includes(search.toLowerCase().trim())
      ),
    [parties, search]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Party Management"
        subtitle="Directory of customers, brokers and partners."
        ctaHref="/parties/add"
        ctaLabel="Add Party"
      />

      <Input
        placeholder="Search party name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <DataTable
          data={filtered}
          columns={[
            { key: "partyName", header: "Party" },
            { key: "partyCode", header: "Code" },
            { key: "brokerName", header: "Broker" },
            { key: "phone", header: "Phone" },
            { key: "gstNo", header: "GST" },
            {
              key: "id",
              header: "Actions",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/parties/edit/${row.id}`)}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteParty(row.id)}>
                    Delete
                  </Button>
                </div>
              )
            }
          ]}
        />
      </motion.div>

      <Link
        to="/parties/add"
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple text-slate-900 shadow-xl shadow-cyan-500/30 transition hover:scale-[1.04]"
      >
        +
      </Link>

      <AnimatePresence />
    </div>
  );
}

