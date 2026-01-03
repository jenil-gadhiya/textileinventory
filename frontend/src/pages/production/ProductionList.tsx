import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchProductions, deleteProduction } from "@/api/productions";
import { fetchQualities } from "@/api/qualities";
import { fetchDesigns } from "@/api/designs";
import { fetchFactories } from "@/api/factories";
import { Production, Factory, Quality, Design } from "@/types/stock";

export function ProductionListPage() {
    const navigate = useNavigate();
    const [productions, setProductions] = useState<Production[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Filter Options State
    const [factories, setFactories] = useState<Factory[]>([]);
    const [qualities, setQualities] = useState<Quality[]>([]);
    const [designs, setDesigns] = useState<Design[]>([]);

    // Filter Selection State
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        type: "All Types",
        quality: "All Qualities",
        design: "All Designs",
        factory: "All Factories"
    });

    useEffect(() => {
        loadProductions();
        loadOptions();
    }, []);

    const loadProductions = async () => {
        try {
            setLoading(true);
            const data = await fetchProductions();
            setProductions(data);
        } catch (error) {
            console.error("Error loading productions:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadOptions = async () => {
        try {
            const [f, q, d] = await Promise.all([
                fetchFactories(),
                fetchQualities(),
                fetchDesigns()
            ]);
            setFactories(f);
            setQualities(q);
            setDesigns(d);
        } catch (error) {
            console.error("Error loading options:", error);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        if (confirm("Are you sure you want to delete this production entry?")) {
            try {
                await deleteProduction(id);
                loadProductions();
            } catch (error) {
                console.error("Error deleting production:", error);
                alert("Failed to delete production");
            }
        }
    };

    const handleEdit = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        navigate(`/production/edit/${id}`);
    };

    const handleRowClick = (production: Production) => {
        setSelectedProduction(production);
        setIsDetailModalOpen(true);
    };

    // Filter Logic
    const filteredProductions = productions.filter(p => {
        // Date Logic
        if (filters.fromDate) {
            const pDate = new Date(p.date).setHours(0, 0, 0, 0);
            const fDate = new Date(filters.fromDate).setHours(0, 0, 0, 0);
            if (pDate < fDate) return false;
        }
        if (filters.toDate) {
            const pDate = new Date(p.date).setHours(0, 0, 0, 0);
            const tDate = new Date(filters.toDate).setHours(0, 0, 0, 0);
            if (pDate > tDate) return false;
        }

        // Type
        if (filters.type !== "All Types" && p.stockType !== filters.type) return false;

        // Factory
        if (filters.factory !== "All Factories") {
            const fName = typeof p.factoryId === "object" ? p.factoryId.factoryName : "";
            if (fName !== filters.factory) return false;
        }

        // Quality
        if (filters.quality !== "All Qualities") {
            const qName = p.qualityId && typeof p.qualityId === "object" ? p.qualityId.fabricName : "";
            if (qName !== filters.quality) return false;
        }

        // Design
        if (filters.design !== "All Designs") {
            const dName = p.designId && typeof p.designId === "object" ? p.designId.designNumber : "";
            if (dName !== filters.design) return false;
        }

        return true;
    });

    const tableData = filteredProductions.map((p, index) => {
        const factory = typeof p.factoryId === "object" ? p.factoryId.factoryName : "";
        const quality = p.qualityId && typeof p.qualityId === "object" ? p.qualityId.fabricName : "";
        const design = p.designId && typeof p.designId === "object" ? p.designId.designNumber : "";

        return {
            id: p.id,
            srNo: index + 1,
            date: new Date(p.date).toLocaleDateString(), // Format date for display
            factory,
            stockType: p.stockType,
            item: p.stockType === "Taka" ? quality : `${quality} - ${design}`,
            totalTaka: p.stockType === "Taka" && p.takaDetails ? p.takaDetails.length : "-",
            totalSaree: p.totalSaree || "-",
            totalMeters: p.totalMeters.toFixed(2),
            production: p,
            actions: (
                <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => handleEdit(p.id, e)}
                    >
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => handleDelete(p.id, e)}
                    >
                        Delete
                    </Button>
                </div>
            )
        };
    });

    const renderDetailContent = () => {
        if (!selectedProduction) return null;

        const factory = typeof selectedProduction.factoryId === "object"
            ? selectedProduction.factoryId.factoryName
            : "";
        const quality = selectedProduction.qualityId && typeof selectedProduction.qualityId === "object"
            ? selectedProduction.qualityId.fabricName
            : "";
        const design = selectedProduction.designId && typeof selectedProduction.designId === "object"
            ? selectedProduction.designId.designNumber
            : "";

        return (
            <div className="space-y-4 text-body">
                {/* General Info */}
                <div className="grid grid-cols-2 gap-4 bg-surface-200 p-4 rounded-lg">
                    <div>
                        <p className="text-sm text-muted">Date</p>
                        <p className="font-semibold">{selectedProduction.date}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Factory</p>
                        <p className="font-semibold">{factory}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Stock Type</p>
                        <p className="font-semibold">{selectedProduction.stockType}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Quality</p>
                        <p className="font-semibold">{quality}</p>
                    </div>
                    {design && (
                        <div>
                            <p className="text-sm text-muted">Design</p>
                            <p className="font-semibold">{design}</p>
                        </div>
                    )}
                </div>

                {/* Taka Details */}
                {selectedProduction.stockType === "Taka" && selectedProduction.takaDetails && (
                    <div>
                        <h4 className="font-semibold mb-2 text-body">Taka Details</h4>
                        <div className="border border-border/10 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-surface-200/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted">Taka No</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted">Meters</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/5">
                                    {selectedProduction.takaDetails.map((taka, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2">{taka.takaNo}</td>
                                            <td className="px-4 py-2 text-right">{taka.meter.toFixed(2)} m</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 flex justify-between bg-surface-200 p-3 rounded-lg">
                            <span className="font-semibold">Total Taka:</span>
                            <span className="font-bold">{selectedProduction.takaDetails.length}</span>
                        </div>
                        <div className="flex justify-between bg-surface-200 p-3 rounded-lg">
                            <span className="font-semibold">Total Meters:</span>
                            <span className="font-bold">{selectedProduction.totalMeters.toFixed(2)} m</span>
                        </div>
                    </div>
                )}

                {/* Saree Details */}
                {selectedProduction.stockType === "Saree" && selectedProduction.matchingQuantities && (
                    <div>
                        <h4 className="font-semibold mb-2 text-body">Matching Quantities</h4>
                        <div className="border border-border/10 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-surface-200/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted">Matching</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted">Quantity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/5">
                                    {selectedProduction.matchingQuantities.map((mq, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2">{mq.matchingName}</td>
                                            <td className="px-4 py-2 text-right">{mq.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-3">
                            <div className="bg-surface-200 p-3 rounded-lg">
                                <p className="text-xs text-muted">Cut</p>
                                <p className="font-bold">{selectedProduction.cut} m</p>
                            </div>
                            <div className="bg-surface-200 p-3 rounded-lg">
                                <p className="text-xs text-muted">Total Saree</p>
                                <p className="font-bold">{selectedProduction.totalSaree}</p>
                            </div>
                            <div className="bg-surface-200 p-3 rounded-lg">
                                <p className="text-xs text-muted">Total Meters</p>
                                <p className="font-bold">{selectedProduction.totalMeters.toFixed(2)} m</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Production List"
                subtitle="View all production entries"
                actions={
                    <Button onClick={() => navigate("/production/create")}>
                        + New Production
                    </Button>
                }
            />

            {/* Filters */}
            <div className="bg-surface-100 p-4 rounded-lg border border-border/10">
                <h3 className="font-semibold mb-4 text-body">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* From Date */}
                    <div>
                        <label className="text-sm text-muted mb-1 block">From Date</label>
                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    {/* To Date */}
                    <div>
                        <label className="text-sm text-muted mb-1 block">To Date</label>
                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    {/* Type */}
                    <div>
                        <label className="text-sm text-muted mb-1 block">Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="All Types">All Types</option>
                            <option value="Taka">Taka</option>
                            <option value="Saree">Saree</option>
                        </select>
                    </div>
                    {/* Quality */}
                    <div>
                        <label className="text-sm text-muted mb-1 block">Quality</label>
                        <select
                            value={filters.quality}
                            onChange={(e) => setFilters(prev => ({ ...prev, quality: e.target.value }))}
                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="All Qualities">All Qualities</option>
                            {qualities.map(q => (
                                <option key={q.id} value={q.fabricName}>{q.fabricName}</option>
                            ))}
                        </select>
                    </div>
                    {/* Design */}
                    <div>
                        <label className="text-sm text-muted mb-1 block">Design</label>
                        <select
                            value={filters.design}
                            onChange={(e) => setFilters(prev => ({ ...prev, design: e.target.value }))}
                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="All Designs">All Designs</option>
                            {designs.map(d => (
                                <option key={d.id} value={d.designNumber}>{d.designNumber}</option>
                            ))}
                        </select>
                    </div>
                    {/* Factory */}
                    <div>
                        <label className="text-sm text-muted mb-1 block">Factory</label>
                        <select
                            value={filters.factory}
                            onChange={(e) => setFilters(prev => ({ ...prev, factory: e.target.value }))}
                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="All Factories">All Factories</option>
                            {factories.map(f => (
                                <option key={f.id} value={f.factoryName}>{f.factoryName}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <Card>
                {loading ? (
                    <div className="p-6 text-center text-muted">Loading...</div>
                ) : (
                    <DataTable
                        data={tableData}
                        columns={[
                            { key: "srNo", header: "SR" },
                            { key: "date", header: "Date" },
                            { key: "factory", header: "Factory" },
                            { key: "stockType", header: "Type" },
                            { key: "item", header: "Item/Design" },
                            { key: "totalTaka", header: "Total Taka" },
                            { key: "totalSaree", header: "Total Saree" },
                            { key: "totalMeters", header: "Total Meters" },
                            { key: "actions", header: "Actions", render: (row: any) => row.actions }
                        ]}
                        emptyMessage="No production entries match your filters."
                        onRowClick={(row) => handleRowClick(row.production)}
                    />
                )}
            </Card>

            {/* Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Production Entry Details</DialogTitle>
                    </DialogHeader>
                    {renderDetailContent()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
