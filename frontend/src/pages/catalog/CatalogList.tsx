import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useStockStore } from "@/store/useStockStore";
import { fetchCatalog, deleteCatalog } from "@/api/catalog";
import { Catalog, Quality, Design, Matching } from "@/types/stock";

type CatalogWithPopulated = Omit<Catalog, "qualityId" | "designId" | "matchingId"> & {
  qualityId: Quality;
  designId: Design;
  matchingId: Matching | null;
};

export function CatalogListPage() {
  const navigate = useNavigate();
  const { loadAll } = useStockStore();
  const [catalog, setCatalog] = useState<CatalogWithPopulated[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await fetchCatalog();
      setCatalog(data as CatalogWithPopulated[]);
    } catch (error) {
      console.error("Error loading catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this catalog entry?")) return;
    try {
      await deleteCatalog(id);
      await loadAll();
      loadCatalog();
    } catch (error) {
      console.error("Error deleting catalog:", error);
      alert("Failed to delete catalog entry");
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    const quality = item.qualityId && typeof item.qualityId === "object" ? item.qualityId.fabricName : "";
    const design =
      item.designId && typeof item.designId === "object"
        ? `${item.designId.designNumber} ${item.designId.designName || ""}`
        : "";
    const matching =
      item.matchingId && typeof item.matchingId === "object"
        ? item.matchingId.matchingName
        : "";
    const searchLower = searchTerm.toLowerCase();
    return (
      quality.toLowerCase().includes(searchLower) ||
      design.toLowerCase().includes(searchLower) ||
      matching.toLowerCase().includes(searchLower) ||
      item.stockType.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate("/catalog/create")}>
          Add New Catalog
        </Button>

      </div>

      <PageHeader
        title="Catalog"
        subtitle="Manage your catalog entries for Saree and Taka stock types."

      />

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by quality, design, matching..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 h-11 rounded-xl border border-border/10 bg-surface-200 px-4 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-neon-cyan/70"
        />
      </div>

      {filteredCatalog.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-muted">No catalog entries found.</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => navigate("/catalog/create")}
            >
              Add First Entry
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCatalog.map((item, index) => {
            const quality = typeof item.qualityId === "object" ? item.qualityId : null;
            const design = typeof item.designId === "object" ? item.designId : null;
            const matching = item.matchingId && typeof item.matchingId === "object" ? item.matchingId : null;
            const isSaree = item.stockType === "Saree";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="h-full flex flex-col cursor-pointer hover:border-neon-cyan/50 transition-all"
                  onClick={() => navigate(`/catalog/edit/${item.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {item.stockType}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {quality?.fabricName || "N/A"}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${isSaree
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-cyan-500/20 text-cyan-300"
                          }`}
                      >
                        {item.stockType}
                      </span>
                    </div>
                  </CardHeader>
                  <div className="flex-1 space-y-3 p-4">
                    <div>
                      <p className="text-xs text-muted mb-1">Design</p>
                      <p className="text-sm text-body">
                        {design?.designNumber || "N/A"}
                        {design?.designName && ` - ${design.designName}`}
                      </p>
                    </div>

                    {quality && (
                      <div>
                        <p className="text-xs text-muted mb-1">Quality</p>
                        <p className="text-sm text-body">
                          {quality.loomType} - {quality.fabricType}
                        </p>
                      </div>
                    )}

                    {isSaree && matching && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <p className="text-xs text-muted mb-1">Matching</p>
                        <p className="text-sm text-body">{matching.matchingName}</p>
                      </motion.div>
                    )}

                    {isSaree && item.cut !== null && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <p className="text-xs text-muted mb-1">Cut</p>
                        <p className="text-sm text-body font-semibold">{item.cut}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-border/10" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

