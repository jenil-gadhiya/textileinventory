import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { fetchInventory, InventoryItem } from "@/api/inventory";
import { fetchFactories } from "@/api/factories";
import { fetchQualities } from "@/api/qualities";
import { fetchDesigns } from "@/api/designs";
import { Card } from "@/components/ui/card";
import { Factory, Quality, Design } from "@/types/stock";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function StockReportPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail Modal State
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Filter states
    const [factoryFilter, setFactoryFilter] = useState("");
    const [qualityFilter, setQualityFilter] = useState("");
    const [designFilter, setDesignFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState<"" | "Taka" | "Saree">("");

    // Date Filter State
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Filter options
    const [factories, setFactories] = useState<Factory[]>([]);
    const [qualities, setQualities] = useState<Quality[]>([]);
    const [designs, setDesigns] = useState<Design[]>([]);

    useEffect(() => {
        loadFilterOptions();
    }, []);

    useEffect(() => {
        loadInventory();
    }, [factoryFilter, qualityFilter, designFilter, typeFilter]);

    const loadFilterOptions = async () => {
        try {
            const [factoriesData, qualitiesData, designsData] = await Promise.all([
                fetchFactories(),
                fetchQualities(),
                fetchDesigns(),
            ]);
            setFactories(factoriesData);
            setQualities(qualitiesData);
            setDesigns(designsData);
        } catch (error) {
            console.error("Error loading filter options:", error);
        }
    };

    const loadInventory = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (factoryFilter) params.factory = factoryFilter;
            if (qualityFilter) params.quality = qualityFilter;
            if (designFilter) params.design = designFilter;
            if (typeFilter) params.type = typeFilter;
            // Note: Date filters are primarily for PDF generation here,
            // but if backend supported stock-at-date, we would pass them here too.

            const data = await fetchInventory(params);
            setInventory(data);
        } catch (error) {
            console.error("Error loading inventory:", error);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFactoryFilter("");
        setQualityFilter("");
        setDesignFilter("");
        setTypeFilter("");
        setFromDate("");
        setToDate("");
    };

    const hasActiveFilters = factoryFilter || qualityFilter || designFilter || typeFilter || fromDate || toDate;

    const handleEdit = (id: string) => {
        const item = inventory.find(i => i.id === id);
        if (item) {
            setSelectedItem(item);
            setIsDetailOpen(true);
        }
    };

    const handleGeneratePDF = () => {
        const query = new URLSearchParams();
        if (factoryFilter) query.append("factory", factoryFilter);
        if (qualityFilter) query.append("quality", qualityFilter);
        if (designFilter) query.append("design", designFilter);
        if (typeFilter) query.append("type", typeFilter);
        if (fromDate) query.append("fromDate", fromDate);
        if (toDate) query.append("toDate", toDate);

        window.open(`/api/inventory/pdf?${query.toString()}`, "_blank");
    };

    const hasTaka = inventory.some(i => i.type === "Taka");
    const hasSaree = inventory.some(i => i.type === "Saree");

    const tableData = inventory.map((item) => {
        const isLowStock = item.type === "Taka"
            ? item.availableMeters < 50
            : item.availableSaree < 10;

        return {
            id: item.id,
            quality: item.qualityId && typeof item.qualityId === "object"
                ? item.qualityId.fabricName
                : "-",
            design: item.designId && typeof item.designId === "object"
                ? item.designId.designNumber
                : "-",
            factory: item.factoryId && typeof item.factoryId === "object"
                ? item.factoryId.factoryName
                : "-",
            matching: item.matchingId && typeof item.matchingId === "object"
                ? item.matchingId.matchingName
                : "-",
            type: item.type,
            produced: item.type === "Taka"
                ? `${item.totalMetersProduced.toFixed(2)}m (${item.totalTakaProduced || 0} Taka)`
                : `${item.totalSareeProduced} pcs`,
            ordered: item.type === "Taka"
                ? `${item.totalMetersOrdered.toFixed(2)}m (${item.totalTakaOrdered || 0} Taka)`
                : `${item.totalSareeOrdered} pcs`,
            available: item.type === "Taka"
                ? `${item.availableMeters.toFixed(2)}m (${Math.max(0, item.availableTaka || 0)} Taka)`
                : `${item.availableSaree} pcs`,
            availableDisplay: (
                <span className={isLowStock ? "text-red-500 font-semibold" : "text-green-500"}>
                    {item.type === "Taka"
                        ? `${item.availableMeters.toFixed(2)}m (${Math.max(0, item.availableTaka || 0)} Taka)`
                        : `${item.availableSaree} pcs`}
                </span>
            ),
            cut: item.cut ? `${item.cut}m` : "-",
        };
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Stock Report"
                subtitle="View current inventory levels and availability"
                actions={
                    <Button onClick={handleGeneratePDF} variant="secondary" className="gap-2">
                        📄 Generate PDF
                    </Button>
                }
            />

            <Card>
                {loading ? (
                    <div className="p-6 text-center text-slate-400">Loading inventory...</div>
                ) : (
                    <>
                        {/* Filter Section */}
                        <div className="p-4 border-b border-border/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-body">Filters</h3>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* From Date */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">From Date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                {/* To Date */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">To Date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                {/* Type Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">Type</label>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value as any)}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">All Types</option>
                                        <option value="Taka">Taka</option>
                                        <option value="Saree">Saree</option>
                                    </select>
                                </div>

                                {/* Quality Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">Quality</label>
                                    <select
                                        value={qualityFilter}
                                        onChange={(e) => setQualityFilter(e.target.value)}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">All Qualities</option>
                                        {qualities.map((quality) => (
                                            <option key={quality.id} value={quality.id}>
                                                {quality.fabricName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Design Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">Design</label>
                                    <select
                                        value={designFilter}
                                        onChange={(e) => setDesignFilter(e.target.value)}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">All Designs</option>
                                        {designs.map((design) => (
                                            <option key={design.id} value={design.id}>
                                                {design.designNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Factory Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">Factory</label>
                                    <select
                                        value={factoryFilter}
                                        onChange={(e) => setFactoryFilter(e.target.value)}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">All Factories</option>
                                        {factories.map((factory) => (
                                            <option key={factory.id} value={factory.id}>
                                                {factory.factoryName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>





                        {/* Totals Summary - Moved to top */}
                        {inventory.length > 0 && (hasTaka || hasSaree) && (
                            <div className={`mb-6 grid grid-cols-1 ${hasTaka && hasSaree ? "md:grid-cols-2" : ""} gap-4 bg-surface-300/50 p-4 rounded-lg border border-border/10`}>
                                {/* Taka Totals */}
                                {hasTaka && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold text-body border-b border-border/10 pb-2">
                                            Taka Totals
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <div className="text-xs text-muted">Produced</div>
                                                <div className="text-body font-semibold">
                                                    {inventory
                                                        .filter(i => i.type === "Taka")
                                                        .reduce((sum, i) => sum + i.totalMetersProduced, 0)
                                                        .toFixed(2)}m
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {inventory
                                                        .filter(i => i.type === "Taka")
                                                        .reduce((sum, i) => sum + (i.totalTakaProduced || 0), 0)} Taka
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted">Ordered</div>
                                                <div className="text-body font-semibold">
                                                    {inventory
                                                        .filter(i => i.type === "Taka")
                                                        .reduce((sum, i) => sum + i.totalMetersOrdered, 0)
                                                        .toFixed(2)}m
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {inventory
                                                        .filter(i => i.type === "Taka")
                                                        .reduce((sum, i) => sum + (i.totalTakaProduced || 0), 0)} Taka
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted">Available</div>
                                                {(() => {
                                                    const val = inventory
                                                        .filter(i => i.type === "Taka")
                                                        .reduce((sum, i) => sum + i.availableMeters, 0);
                                                    const isNeg = val < 0;
                                                    return (
                                                        <div className={`${isNeg ? "text-red-500" : "text-green-500"} font-semibold text-lg`}>
                                                            {val.toFixed(2)}m
                                                        </div>
                                                    );
                                                })()}
                                                <div className="text-xs text-muted">
                                                    {Math.max(0, inventory
                                                        .filter(i => i.type === "Taka")
                                                        .reduce((sum, i) => sum + (i.availableTaka || 0), 0))} Taka
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Saree Totals */}
                                {hasSaree && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold text-body border-b border-border/10 pb-2">
                                            Saree Totals
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <div className="text-xs text-muted">Produced</div>
                                                <div className="text-body font-semibold">
                                                    {inventory
                                                        .filter(i => i.type === "Saree")
                                                        .reduce((sum, i) => sum + i.totalSareeProduced, 0)} pcs
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted">Ordered</div>
                                                <div className="text-body font-semibold">
                                                    {inventory
                                                        .filter(i => i.type === "Saree")
                                                        .reduce((sum, i) => sum + i.totalSareeOrdered, 0)} pcs
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted">Available</div>
                                                {(() => {
                                                    const val = inventory
                                                        .filter(i => i.type === "Saree")
                                                        .reduce((sum, i) => sum + i.availableSaree, 0);
                                                    const isNeg = val < 0;
                                                    return (
                                                        <div className={`${isNeg ? "text-red-500" : "text-green-500"} font-semibold text-lg`}>
                                                            {val} pcs
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Inventory Table */}
                        <DataTable
                            data={tableData}
                            columns={[
                                { key: "quality", header: "Quality" },
                                { key: "design", header: "Design" },
                                { key: "factory", header: "Factory" },
                                { key: "matching", header: "Matching" },
                                { key: "type", header: "Type" },
                                { key: "cut", header: "Cut" },
                                { key: "produced", header: "Produced" },
                                { key: "ordered", header: "Ordered" },
                                {
                                    key: "availableDisplay" as any,
                                    header: "Available",
                                    render: (row: any) => row.availableDisplay
                                },
                            ]}
                            emptyMessage="No inventory items match the selected filters."
                            onRowClick={(row) => handleEdit(row.id)}
                        />
                    </>
                )}
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Stock Details</DialogTitle>
                    </DialogHeader>
                    {selectedItem && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-muted">Quality</label>
                                    <div className="text-body font-medium">
                                        {selectedItem.qualityId && typeof selectedItem.qualityId === "object" ? selectedItem.qualityId.fabricName : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted">Design</label>
                                    <div className="text-body font-medium">
                                        {selectedItem.designId && typeof selectedItem.designId === "object" ? selectedItem.designId.designNumber : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted">Factory</label>
                                    <div className="text-body font-medium">
                                        {selectedItem.factoryId && typeof selectedItem.factoryId === "object" ? selectedItem.factoryId.factoryName : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted">Type</label>
                                    <div className="text-body font-medium">{selectedItem.type}</div>
                                </div>
                            </div>

                            <div className="bg-surface-200 rounded p-4 space-y-4">
                                <h4 className="text-sm font-semibold text-body">Stock Breakdown</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-xs text-muted mb-1">Produced</div>
                                        <div className="text-body text-lg font-semibold">
                                            {selectedItem.type === "Taka"
                                                ? `${selectedItem.totalMetersProduced}m`
                                                : `${selectedItem.totalSareeProduced} pcs`}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted mb-1">Ordered</div>
                                        <div className="text-yellow-500 text-lg font-semibold">
                                            {selectedItem.type === "Taka"
                                                ? `${selectedItem.totalMetersOrdered}m`
                                                : `${selectedItem.totalSareeOrdered} pcs`}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted mb-1">Available</div>
                                        <div className="text-green-500 text-lg font-semibold">
                                            {selectedItem.type === "Taka"
                                                ? `${selectedItem.availableMeters}m`
                                                : `${selectedItem.availableSaree} pcs`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-muted text-center">
                                Inventory ID: {selectedItem.id}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
