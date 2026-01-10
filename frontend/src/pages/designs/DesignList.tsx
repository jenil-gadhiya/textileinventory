import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStockStore } from "@/store/useStockStore";

export function DesignListPage() {
  const navigate = useNavigate();
  const { designs, deleteDesign } = useStockStore();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      designs.filter((d) =>
        [d.designNumber, d.designName, d.itemName].some((val) =>
          val?.toString().toLowerCase().includes(search.toLowerCase().trim())
        )
      ),
    [designs, search]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designs & Items"
        subtitle="Track every design, shade and GSM."
        ctaHref="/designs/add"
        ctaLabel="Add Design"
      />

      <Input
        placeholder="Search design number, name or item..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <DataTable
          data={filtered}
          columns={[
            { key: "designNumber", header: "Design No." },

            {
              key: "id",
              header: "Actions",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/designs/edit/${row.id}`)}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteDesign(row.id)}>
                    Delete
                  </Button>
                </div>
              )
            }
          ]}
        />
      </motion.div>

      <Link
        to="/designs/add"
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple text-slate-900 shadow-xl shadow-cyan-500/30 transition hover:scale-[1.04]"
      >
        +
      </Link>
    </div>
  );
}



