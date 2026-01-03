import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchOrders, deleteOrder } from "@/api/orders";
import { Order } from "@/types/stock";

export function OrderListPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
    const [qualityFilters, setQualityFilters] = useState<string[]>([]);
    const [partyFilters, setPartyFilters] = useState<string[]>([]);
    const [brokerFilters, setBrokerFilters] = useState<string[]>([]);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await fetchOrders();
            setOrders(data);
        } catch (error) {
            console.error("Error loading orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this order?")) {
            try {
                await deleteOrder(id);
                loadOrders();
            } catch (error) {
                console.error("Error deleting order:", error);
                alert("Failed to delete order");
            }
        }
    };

    const handleEdit = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/orders/edit/${id}`);
    };

    const handleWhatsAppShare = (order: Order, e: React.MouseEvent) => {
        e.stopPropagation();

        // Format order details for WhatsApp
        const party = order.partyId && typeof order.partyId === "object" ? order.partyId.partyName : "";

        // Reduced padding for mobile screens (approx 30-35 chars width)
        const pad = (str: string, length: number = 10) => str.padEnd(length, " ");

        let message = "```\n"; // Start monospace block
        message += `🕉️ ORDER DETAILS\n`;
        message += "--------------------------------\n\n";

        message += `${pad("Order No")} : ${order.orderNo}\n`;
        message += `${pad("Date")} : ${new Date(order.date).toLocaleDateString()}\n`;
        if (party) message += `${pad("Party")} : ${party.toUpperCase()}\n`;

        message += "\n◆ LINE ITEMS\n\n";

        message += `  *FACTORY ${party.toUpperCase()}*\n`;

        let grandTotalSarees = 0;

        // Helper for right-aligning numbers (4 chars)
        const padNum = (num: number) => String(num).padStart(4, " ");

        order.lineItems.forEach((item, index) => {
            const quality = item.qualityId && typeof item.qualityId === "object" ? item.qualityId.fabricName : "";
            const design = item.designId && typeof item.designId === "object" ? item.designId.designNumber : "";
            const itemName = `${quality}${design ? " - " + design : ""}`;

            message += `${index + 1}. ${itemName}\n`;

            if (item.quantityType === "Taka" || item.quantityType === "Meter") {
                const qtyUnit = item.quantityType === "Meter" ? "m" : "Taka";
                // Align Qty with matching lines: 3 spaces + "- " prefix = 5 chars indent relative to name
                // To align colons, we use same pad(10)
                message += `   - ${pad("Qty", 10)} : ${padNum(item.quantity)} ${qtyUnit}\n`;
            } else if (item.quantityType === "Saree") {
                const itemTotalSarees = item.matchingQuantities?.reduce((sum, mq) => sum + (mq.quantity || 0), 0) || 0;
                grandTotalSarees += itemTotalSarees;

                item.matchingQuantities?.forEach(mq => {
                    const matching = mq.matchingId && typeof mq.matchingId === "object" ? mq.matchingId.matchingName : "Unknown";
                    // Clean matching name (remove extra spaces if any)
                    const mName = matching.trim().substring(0, 10);
                    message += `   - ${pad(mName, 10)} : ${padNum(mq.quantity)}\n`;
                });

                // Total for this particular line item
                message += "   -----------------------------\n";
                // Use pad function for Total to ensure exact alignment with matching names
                message += `   - ${pad("Total", 10)} : ${padNum(itemTotalSarees)} Sarees\n`;
            }
            message += "\n";
        });

        // Grand Total Section
        message += "--------------------------------\n";
        if (grandTotalSarees > 0) {
            // Align "GRAND TOTAL" with list items
            // List: "   - " (5 chars) + Name(10) = 15 chars before colon
            // Grand Total: "   " (3 chars) + Label(12) = 15 chars before colon
            message += `   ${pad("*GRAND TOTAL*", 12)} : ${padNum(grandTotalSarees)} SAREES\n`;
        }
        message += "\n";

        if (order.remarks) {
            message += `◆ Remarks: ${order.remarks}`;
        }

        message += "\n```"; // End monospace block

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, "_blank");
    };

    const handleRowClick = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    // Extract unique filter options from orders
    const allQualities = Array.from(
        new Map(
            orders.flatMap(o => o.lineItems)
                .filter(item => item.qualityId && typeof item.qualityId === "object")
                .map(item => [(item.qualityId as any).id, item.qualityId])
        ).values()
    );

    const allParties = Array.from(
        new Map(
            orders
                .filter(o => o.partyId && typeof o.partyId === "object")
                .map(o => [(o.partyId as any).id, o.partyId])
        ).values()
    );

    const allSalesmen = Array.from(
        new Map(
            orders
                .filter(o => o.salesmanId && typeof o.salesmanId === "object")
                .map(o => [(o.salesmanId as any).id, o.salesmanId])
        ).values()
    );

    // Apply filters to orders
    const filteredOrders = orders.filter(order => {
        // Status filter
        if (statusFilter !== "all" && order.status !== statusFilter) return false;

        // Quality filter (check if ANY line item has selected quality)
        if (qualityFilters.length > 0) {
            const hasQuality = order.lineItems.some(item => {
                const qualityId = item.qualityId && typeof item.qualityId === "object"
                    ? item.qualityId.id
                    : item.qualityId;
                return qualityFilters.includes(qualityId as string);
            });
            if (!hasQuality) return false;
        }

        // Party filter
        if (partyFilters.length > 0) {
            const partyId = order.partyId && typeof order.partyId === "object"
                ? order.partyId.id
                : order.partyId;
            if (!partyFilters.includes(partyId as string)) return false;
        }

        // Broker filter
        if (brokerFilters.length > 0) {
            const salesmanId = order.salesmanId && typeof order.salesmanId === "object"
                ? order.salesmanId.id
                : order.salesmanId;
            if (!brokerFilters.includes(salesmanId as string)) return false;
        }

        return true;
    });

    const clearFilters = () => {
        setStatusFilter("all");
        setQualityFilters([]);
        setPartyFilters([]);
        setBrokerFilters([]);
    };

    const hasActiveFilters = statusFilter !== "all" || qualityFilters.length > 0 ||
        partyFilters.length > 0 || brokerFilters.length > 0;

    const tableData = filteredOrders.map((order) => {
        const party = order.partyId && typeof order.partyId === "object" ? order.partyId.partyName : "";
        const broker = order.brokerId && typeof order.brokerId === "object" ? order.brokerId.brokerName : "-";
        const salesman = order.salesmanId && typeof order.salesmanId === "object" ? (order.salesmanId as any).salesmanName : "";

        return {
            id: order.id,
            orderNo: order.orderNo,
            date: order.date,
            party,
            broker,
            salesman,
            status: order.status || "pending",
            totalAmount: `₹${order.totalAmount.toFixed(2)}`,
            order: order,
            actions: (
                <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => handleEdit(order.id, e)}
                    >
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => handleWhatsAppShare(order, e)}
                        className="text-green-400 hover:text-green-300"
                        title="Share to WhatsApp"
                    >
                        📱 Share
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => handleDelete(order.id, e)}
                        className="text-red-400 hover:text-red-300"
                    >
                        Delete
                    </Button>
                </div>
            )
        };
    });

    const renderDetailContent = () => {
        if (!selectedOrder) return null;

        const party = selectedOrder.partyId && typeof selectedOrder.partyId === "object"
            ? selectedOrder.partyId.partyName
            : "";
        const broker = selectedOrder.brokerId && typeof selectedOrder.brokerId === "object"
            ? selectedOrder.brokerId.brokerName
            : "-";
        const salesman = selectedOrder.salesmanId && typeof selectedOrder.salesmanId === "object"
            ? (selectedOrder.salesmanId as any).salesmanName
            : "";

        // Calculate totals (backward compatible with catalogType)
        const totalTaka = selectedOrder.lineItems.filter(item => {
            const type = item.quantityType || (item as any).catalogType;
            return type === "Taka";
        }).length;

        // Calculate total saree - ONLY for actual Saree orders (must have matchingQuantities)
        const totalSaree = selectedOrder.lineItems.reduce((sum, item) => {
            const type = item.quantityType || (item as any).catalogType;
            const isMeter = type === "Meter" || type === "Saree";

            if (isMeter && item.matchingQuantities && item.matchingQuantities.length > 0) {
                // Only count if matchingQuantities array exists and has data
                const fromMatching = item.matchingQuantities.reduce((s, mq) => s + mq.quantity, 0);
                return sum + fromMatching;
            }
            // Don't count Taka-Meter items as saree
            return sum;
        }, 0);

        // Calculate total meters (from both Taka and Meter line items)
        // Calculate total meters
        const totalMeters = selectedOrder.lineItems.reduce((sum, item) => {
            const quantityType = item.quantityType || (item as any).catalogType;

            if (quantityType === "Meter") {
                // Meters entered directly
                return sum + (item.quantity || 0);
            } else if (quantityType === "Saree") {
                // For Meter/Saree, try matching quantities first
                const totalSareeQty = item.matchingQuantities?.reduce((s, mq) => s + mq.quantity, 0) || 0;
                const cut = item.cut || 0;

                let meters = 0;
                if (totalSareeQty > 0 && cut > 0) {
                    // If we have matching quantities, calculate: quantity × cut
                    meters = totalSareeQty * cut;
                } else {
                    // Fallback: if matchingQuantities is empty, use orderValue / rate
                    // This assumes rate is per meter
                    meters = item.orderValue / item.rate;
                }

                return sum + meters;
            }
            return sum;
        }, 0);

        return (
            <div className="space-y-4 text-body">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 bg-surface-200 p-4 rounded-lg">
                    <div>
                        <p className="text-sm text-muted">Order No</p>
                        <p className="font-semibold">{selectedOrder.orderNo}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Date</p>
                        <p className="font-semibold">{selectedOrder.date}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Party</p>
                        <p className="font-semibold">{party}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Broker</p>
                        <p className="font-semibold">{broker}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Salesman</p>
                        <p className="font-semibold">{salesman}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Status</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${selectedOrder.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                            {selectedOrder.status || "pending"}
                        </span>
                    </div>
                    {selectedOrder.paymentTerms && (
                        <div className="col-span-2">
                            <p className="text-sm text-muted">Payment Terms</p>
                            <p className="font-semibold">{selectedOrder.paymentTerms}</p>
                        </div>
                    )}
                    {selectedOrder.deliveryTerms && (
                        <div className="col-span-2">
                            <p className="text-sm text-muted">Delivery Terms</p>
                            <p className="font-semibold">{selectedOrder.deliveryTerms}</p>
                        </div>
                    )}
                    {selectedOrder.remarks && (
                        <div className="col-span-2">
                            <p className="text-sm text-muted">Remarks</p>
                            <p className="font-semibold">{selectedOrder.remarks}</p>
                        </div>
                    )}
                </div>

                {/* Line Items */}
                <div>
                    <h4 className="font-semibold mb-2 text-body">Line Items</h4>
                    <div className="border border-border/10 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-surface-200/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted">Quality</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted">Design</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted">Type</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted">Rate</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                                {selectedOrder.lineItems.map((item, idx) => {
                                    const quality = item.qualityId && typeof item.qualityId === "object"
                                        ? item.qualityId.fabricName
                                        : "";
                                    const design = item.designId && typeof item.designId === "object"
                                        ? item.designId.designNumber
                                        : "";

                                    // Determine display based on catalog and quantity type
                                    const catalogType = (item as any).catalogType || ((item.matchingQuantities && item.matchingQuantities.length > 0) ? "Saree" : "Taka");
                                    const quantityType = item.quantityType || catalogType;

                                    let displayType = "-";
                                    let qtyDisplay = "-";

                                    if (catalogType === "Saree") {
                                        displayType = "Saree";
                                        if (item.matchingQuantities && item.matchingQuantities.length > 0) {
                                            // Matching breakdown
                                            const matchingList = item.matchingQuantities.map(mq => {
                                                const matching = mq.matchingId;
                                                const matchingName = matching && typeof matching === "object"
                                                    ? (matching as any).matchingName
                                                    : "Unknown";
                                                return (
                                                    <div key={matchingName}>
                                                        {matchingName}: {mq.quantity}
                                                    </div>
                                                );
                                            });

                                            return (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2">{quality}</td>
                                                    <td className="px-4 py-2">{design || "-"}</td>
                                                    <td className="px-4 py-2">{displayType}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="space-y-0.5">{matchingList}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-right">₹{item.orderValue.toFixed(2)}</td>
                                                </tr>
                                            );
                                        }
                                    } else {
                                        // Taka Type
                                        if (quantityType === "Meter") {
                                            displayType = "Mts";
                                            qtyDisplay = `${item.quantity || 0} m`;
                                        } else {
                                            displayType = "Taka";
                                            qtyDisplay = `${item.quantity || 0} Taka`;
                                        }
                                    }

                                    return (
                                        <tr key={idx}>
                                            <td className="px-4 py-2">{quality}</td>
                                            <td className="px-4 py-2">{design || "-"}</td>
                                            <td className="px-4 py-2">{displayType}</td>
                                            <td className="px-4 py-2 text-right">{qtyDisplay}</td>
                                            <td className="px-4 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">₹{item.orderValue.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals - conditional based on order type */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Show Total Taka only if order has Taka items */}
                    {totalTaka > 0 && (
                        <div className="bg-surface-200 p-3 rounded-lg">
                            <p className="text-xs text-muted">Total Taka</p>
                            <p className="font-bold">{totalTaka}</p>
                        </div>
                    )}

                    {/* Show Total Saree only if order has Meter/Saree items */}
                    {totalSaree > 0 && (
                        <div className="bg-surface-200 p-3 rounded-lg">
                            <p className="text-xs text-muted">Total Saree</p>
                            <p className="font-bold">{totalSaree}</p>
                        </div>
                    )}

                    {/* Show Total Meters only if meters > 0 */}
                    {totalMeters > 0 && (
                        <div className="bg-surface-200 p-3 rounded-lg">
                            <p className="text-xs text-muted">Total Meters</p>
                            <p className="font-bold">{totalMeters.toFixed(2)} m</p>
                        </div>
                    )}

                    {/* Always show Total Amount */}
                    <div className="bg-surface-200 p-3 rounded-lg">
                        <p className="text-xs text-muted">Total Amount</p>
                        <p className="font-bold text-lg">₹{selectedOrder.totalAmount.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Orders"
                subtitle="Manage customer orders"
                actions={
                    <Button onClick={() => navigate("/orders/create")}>
                        + Add Order
                    </Button>
                }
            />

            <Card>
                {loading ? (
                    <div className="p-6 text-center text-muted">Loading...</div>
                ) : (
                    <>
                        {/* Filter Section */}
                        <div className="p-4 border-b border-border/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-body">Filters</h3>
                                {hasActiveFilters && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={clearFilters}
                                        className="text-xs"
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Status Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">Status</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStatusFilter("all")}
                                            className={`px-3 py-1.5 text-xs rounded ${statusFilter === "all"
                                                ? "bg-primary text-black"
                                                : "bg-surface-200 text-muted hover:bg-surface-300"
                                                }`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter("pending")}
                                            className={`px-3 py-1.5 text-xs rounded ${statusFilter === "pending"
                                                ? "bg-yellow-600 text-white"
                                                : "bg-surface-200 text-muted hover:bg-surface-300"
                                                }`}
                                        >
                                            Pending
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter("completed")}
                                            className={`px-3 py-1.5 text-xs rounded ${statusFilter === "completed"
                                                ? "bg-green-600 text-white"
                                                : "bg-surface-200 text-muted hover:bg-surface-300"
                                                }`}
                                        >
                                            Completed
                                        </button>
                                    </div>
                                </div>

                                {/* Quality Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">
                                        Quality {qualityFilters.length > 0 && `(${qualityFilters.length})`}
                                    </label>
                                    <select
                                        multiple
                                        value={qualityFilters}
                                        onChange={(e) => {
                                            const values = Array.from(e.target.selectedOptions, opt => opt.value);
                                            setQualityFilters(values);
                                        }}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-1.5 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                        size={4}
                                    >
                                        {allQualities.map((quality) => (
                                            <option key={(quality as any).id} value={(quality as any).id}>
                                                {(quality as any).fabricName}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>

                                {/* Party Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">
                                        Party {partyFilters.length > 0 && `(${partyFilters.length})`}
                                    </label>
                                    <select
                                        multiple
                                        value={partyFilters}
                                        onChange={(e) => {
                                            const values = Array.from(e.target.selectedOptions, opt => opt.value);
                                            setPartyFilters(values);
                                        }}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-1.5 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                        size={4}
                                    >
                                        {allParties.map((party) => (
                                            <option key={(party as any).id} value={(party as any).id}>
                                                {(party as any).partyName}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>

                                {/* Broker/Salesman Filter */}
                                <div>
                                    <label className="block text-xs text-muted mb-2">
                                        Salesman {brokerFilters.length > 0 && `(${brokerFilters.length})`}
                                    </label>
                                    <select
                                        multiple
                                        value={brokerFilters}
                                        onChange={(e) => {
                                            const values = Array.from(e.target.selectedOptions, opt => opt.value);
                                            setBrokerFilters(values);
                                        }}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-1.5 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                        size={4}
                                    >
                                        {allSalesmen.map((salesman) => (
                                            <option key={(salesman as any).id} value={(salesman as any).id}>
                                                {(salesman as any).salesmanName}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>
                            </div>

                            {/* Active Filters Display */}
                            {hasActiveFilters && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {statusFilter !== "all" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-200 rounded text-xs">
                                            Status: <strong>{statusFilter}</strong>
                                            <button onClick={() => setStatusFilter("all")} className="hover:text-red-400">×</button>
                                        </span>
                                    )}
                                    {qualityFilters.length > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-200 rounded text-xs">
                                            Quality: <strong>{qualityFilters.length} selected</strong>
                                            <button onClick={() => setQualityFilters([])} className="hover:text-red-400">×</button>
                                        </span>
                                    )}
                                    {partyFilters.length > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-200 rounded text-xs">
                                            Party: <strong>{partyFilters.length} selected</strong>
                                            <button onClick={() => setPartyFilters([])} className="hover:text-red-400">×</button>
                                        </span>
                                    )}
                                    {brokerFilters.length > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-200 rounded text-xs">
                                            Salesman: <strong>{brokerFilters.length} selected</strong>
                                            <button onClick={() => setBrokerFilters([])} className="hover:text-red-400">×</button>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Data Table */}
                        <DataTable
                            data={tableData}
                            columns={[
                                { key: "orderNo", header: "Order No" },
                                { key: "date", header: "Date" },
                                { key: "party", header: "Party" },
                                { key: "salesman", header: "Salesman" },
                                { key: "status", header: "Status" },
                                { key: "totalAmount", header: "Total Amount" },
                                { key: "actions", header: "Actions", render: (row: any) => row.actions }
                            ]}
                            emptyMessage="No orders match the selected filters."
                            onRowClick={(row) => handleRowClick(row.order)}
                        />
                    </>
                )}
            </Card>

            {/* Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                    </DialogHeader>
                    {renderDetailContent()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
