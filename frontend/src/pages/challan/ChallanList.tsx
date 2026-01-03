import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchChallans, deleteChallan } from "@/api/challans";
import { Challan } from "@/api/challans";

export function ChallanListPage() {
    const navigate = useNavigate();
    const [challans, setChallans] = useState<Challan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        loadChallans();
    }, []);

    const loadChallans = async () => {
        try {
            setLoading(true);
            const data = await fetchChallans();
            setChallans(data);
        } catch (error) {
            console.error("Error loading challans:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (challan: Challan) => {
        setSelectedChallan(challan);
        setIsDetailModalOpen(true);
    };

    const handleDownloadPDF = (challanId: string) => {
        window.open(`/api/challans/${challanId}/pdf`, "_blank");
    };

    const handleDelete = async (challanId: string) => {
        if (!confirm("Are you sure you want to delete this challan? This action cannot be undone.")) {
            return;
        }

        try {
            await deleteChallan(challanId);
            alert("Challan deleted successfully!");
            loadChallans(); // Reload the list
        } catch (error) {
            console.error("Error deleting challan:", error);
            alert("Failed to delete challan");
        }
    };

    const getOrderId = (item: any): string => {
        return item?.id || item?._id || "";
    };

    const tableData = challans.map((challan) => ({
        id: getOrderId(challan),
        challanNo: challan.challanNo,
        date: new Date(challan.challanDate).toLocaleDateString(),
        order: challan.orderId && typeof challan.orderId === "object" ? (challan.orderId as any).orderNo : "-",
        party: challan.partyId && typeof challan.partyId === "object" ? (challan.partyId as any).partyName : "-",
        items: challan.items.length,
        status: challan.status,
        vehicle: challan.vehicleNumber || "-",
    }));

    const renderDetailContent = () => {
        if (!selectedChallan) return null;

        const party = typeof selectedChallan.partyId === "object"
            ? selectedChallan.partyId as any
            : null;

        return (
            <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-surface-200 rounded">
                    <div>
                        <p className="text-sm text-muted">Challan No</p>
                        <p className="text-body font-medium">{selectedChallan.challanNo}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Date</p>
                        <p className="text-body font-medium">
                            {new Date(selectedChallan.challanDate).toLocaleDateString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Order No</p>
                        <p className="text-body font-medium">
                            {typeof selectedChallan.orderId === "object"
                                ? (selectedChallan.orderId as any).orderNo
                                : "-"}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Status</p>
                        <p className="text-body font-medium capitalize">{selectedChallan.status}</p>
                    </div>
                </div>

                {/* Party Details */}
                <div className="p-4 bg-surface-200 rounded">
                    <h3 className="text-body font-medium mb-3">Party Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted">Party Name</p>
                            <p className="text-body">{party?.partyName || "-"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted">Contact</p>
                            <p className="text-body">{party?.contactNumber || "-"}</p>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="p-4 bg-surface-200 rounded">
                    <h3 className="text-body font-medium mb-3">Items</h3>
                    <div className="space-y-3">
                        {selectedChallan.items.map((item, index) => (
                            <div key={index} className="p-3 bg-surface-100 rounded">
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <p className="text-sm text-muted">Quality</p>
                                        <p className="text-body">
                                            {typeof item.qualityId === "object"
                                                ? (item.qualityId as any).fabricName
                                                : "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted">Type</p>
                                        <p className="text-body">{item.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted">Quantity</p>
                                        <p className="text-body">
                                            {item.type === "Taka"
                                                ? `${item.challanQuantity} meters`
                                                : `${item.matchingQuantities?.reduce(
                                                    (sum, mq) => sum + (mq.challanQuantity || 0),
                                                    0
                                                )} pcs`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transport Details */}
                {(selectedChallan.transportDetails || selectedChallan.vehicleNumber) && (
                    <div className="p-4 bg-surface-200 rounded">
                        <h3 className="text-body font-medium mb-3">Transport Details</h3>
                        {selectedChallan.transportDetails && (
                            <div className="mb-2">
                                <p className="text-sm text-muted">Transport</p>
                                <p className="text-body">{selectedChallan.transportDetails}</p>
                            </div>
                        )}
                        {selectedChallan.vehicleNumber && (
                            <div>
                                <p className="text-sm text-muted">Vehicle Number</p>
                                <p className="text-body">{selectedChallan.vehicleNumber}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Remarks */}
                {selectedChallan.remarks && (
                    <div className="p-4 bg-surface-200 rounded">
                        <h3 className="text-body font-medium mb-2">Remarks</h3>
                        <p className="text-body">{selectedChallan.remarks}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Challans"
                subtitle="View all delivery challans"
                actions={
                    <Button onClick={() => navigate("/challans/create")}>
                        New Challan
                    </Button>
                }
            />

            <Card>
                {loading ? (
                    <div className="p-6 text-center text-muted">Loading challans...</div>
                ) : (
                    <DataTable
                        data={tableData.map(row => ({
                            ...row,
                            actions: (
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadPDF(row.id);
                                        }}
                                    >
                                        📄 View PDF
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(row.id);
                                        }}
                                    >
                                        🗑️ Delete
                                    </Button>
                                </div>
                            )
                        }))}
                        columns={[
                            { key: "challanNo", header: "Challan No" },
                            { key: "date", header: "Date" },
                            { key: "order", header: "Order No" },
                            { key: "party", header: "Party" },
                            { key: "items", header: "Items" },
                            { key: "vehicle", header: "Vehicle" },
                            { key: "status", header: "Status" },
                            { key: "actions", header: "Actions", render: (row: any) => row.actions },
                        ]}
                        emptyMessage="No challans found. Create your first challan!"
                        onRowClick={(row) => {
                            const challan = challans.find(
                                c => getOrderId(c) === row.id
                            );
                            if (challan) handleViewDetails(challan);
                        }}
                    />
                )}
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Challan Details</DialogTitle>
                    </DialogHeader>
                    {renderDetailContent()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
