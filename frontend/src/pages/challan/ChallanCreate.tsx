import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchOrders } from "@/api/orders";
import { createChallan, fetchChallan, updateChallan } from "@/api/challans";
import { Order } from "@/types/stock";
import { fetchInventory, InventoryItem } from "@/api/inventory";
import { fetchAvailableStockPieces, StockPiece } from "@/api/stockPieces";

interface ChallanItemData {
    orderLineItemIndex: number;
    qualityId: string;
    designId?: string;
    type: "Taka" | "Saree";
    orderedQuantity: number;
    challanQuantity: number;
    remainingQuantity: number;
    availableStock: number; // Available stock (Meters for Taka, Pieces for Saree)
    availableTaka?: number; // Available pieces for Taka
    quantityType?: string; // "Taka", "Meter", "Saree"
    selectedPieces?: StockPiece[]; // Selected pieces for Taka dispatch
    availablePieces?: StockPiece[]; // All available pieces for selection
    selected?: boolean; // Whether this item is selected for challan
    matchingQuantities?: Array<{
        matchingId: string;
        orderedQuantity: number;
        challanQuantity: number;
        remainingQuantity: number;
        availableStock: number; // Available stock for this matching
    }>;
    cut?: number;
    batchNo?: string;
}

export function ChallanCreatePage() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [challanItems, setChallanItems] = useState<ChallanItemData[]>([]);
    const [challanDate, setChallanDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [remarks, setRemarks] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [takaSearchQueries, setTakaSearchQueries] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        if (id) {
            loadChallanDetails(id);
        }
    }, [id]);

    const loadChallanDetails = async (challanId: string) => {
        try {
            setLoading(true);
            const challan = await fetchChallan(challanId);

            setChallanDate(new Date(challan.challanDate).toISOString().split("T")[0]);
            setRemarks(challan.remarks || "");

            // Fetch inventory and stock pieces
            const [inventoryData, stockPiecesData] = await Promise.all([
                fetchInventory(),
                fetchAvailableStockPieces()
            ]);

            // We need the order details. If 'orders' is populated we can find it, but it might not include "Completed" orders
            // if we filtered them out in loadOrders. So we should fetch this specific order.
            // Assuming we can use the orderId from challan.
            const { http } = await import("@/api/http");
            const { data: order } = await http.get(`/orders/${(challan.orderId as any)._id || challan.orderId}`); // handle object or string

            setSelectedOrder(order);

            // Map items
            const items: ChallanItemData[] = await Promise.all(order.lineItems.map(async (lineItem: any, index: number) => {
                const type = lineItem.quantityType || lineItem.catalogType;

                // Find matching item in challan
                const challanItem = challan.items.find((ci: any) => ci.orderLineItemIndex === index);

                // Base structure
                const itemData: ChallanItemData = {
                    orderLineItemIndex: index,
                    qualityId: typeof lineItem.qualityId === 'object' ? lineItem.qualityId._id : lineItem.qualityId,
                    designId: typeof lineItem.designId === 'object' ? lineItem.designId._id : lineItem.designId,
                    type: type as "Taka" | "Saree",
                    orderedQuantity: type === "Taka"
                        ? lineItem.quantity
                        : (lineItem.totalSaree || 0),
                    challanQuantity: challanItem ? challanItem.challanQuantity : 0,
                    remainingQuantity: 0, // Calculated below
                    availableStock: 0, // Calculated below
                    quantityType: type === "Taka" ? (lineItem.quantityType || "Meter") : "Saree",
                    cut: lineItem.cut
                };

                // Calculate remaining: (Ordered - Dispatched) + (Current Challan Quantity if editing)
                // Note: The order.dispatchedQuantity ALREADY includes this challan's amount.
                // So Remaining = (Ordered - Dispatched) + CurrentChallanAmount
                // Wait, logic in creating page is: Remaining = Ordered - Dispatched.
                // But here, since we are editing, "Dispatched" includes what we are editing.
                // So "True Remaining for this Edit" = (Ordered - Dispatched) + CurrentChallanAmount.
                // Example: Ordered 100. Challan has 20. Total Dispatched = 20. App says remaining = 80.
                // But in this form, we want to show we are editing the 20.
                // If we reduce it to 10, remaining becomes 90.

                if (type === "Taka") {
                    const dispatched = lineItem.dispatchedQuantity || 0;
                    // Add back the *current challan's* quantity to effectively "undispatch" it for editing
                    const currentChallanQty = challanItem ? challanItem.challanQuantity : 0;
                    itemData.remainingQuantity = (lineItem.quantity - dispatched) + currentChallanQty;

                    // STOCK CALCULATION
                    // Available Stock = Inventory.available + CurrentChallanAmount (because we are theoretically putting it back to take it again)
                    const inv = inventoryData.find(
                        (i: any) =>
                            (i.qualityId._id || i.qualityId) === itemData.qualityId &&
                            i.type === "Taka"
                    );
                    itemData.availableStock = (inv?.availableMeters || 0) + currentChallanQty;
                    itemData.availableTaka = (inv?.availableTaka || 0) + (challanItem?.selectedPieces?.length || 0);

                    // Map Selected Pieces
                    if (challanItem && challanItem.selectedPieces) {
                        // We need to fetch these specific pieces details if not in "Available" list?
                        // Actually, fetchAvailableStockPieces only returns status="Available".
                        // The pieces in this challan are status="Sold" (or whatever).
                        // We need to manually inject them into "availablePieces" for this row so they can be selected.

                        // For now, let's just assume we map them as selected.
                        // But we need the `StockPiece` objects.
                        itemData.selectedPieces = challanItem.selectedPieces.map((p: any) => ({
                            _id: p.stockPieceId,
                            takaNo: p.takaNo,
                            meter: p.meter,
                            status: 'Available' // Pretend they are available for valid selection logic
                        })) as any;
                    }

                    // Filter available pieces for dropdown
                    // We must include the pieces currently in this challan + actual available pieces
                    const relevantPieces = stockPiecesData.filter(
                        (p: any) =>
                            (p.qualityId._id || p.qualityId) === itemData.qualityId
                    );
                    // Merge with our selected pieces (which might not be in relevantPieces because they are Sold)
                    itemData.availablePieces = [...relevantPieces, ...(itemData.selectedPieces || [])];

                    // Auto-select logic? No, just set selected if challanItem exists
                    itemData.selected = !!challanItem;

                } else {
                    // Saree Logic
                    itemData.matchingQuantities = lineItem.matchingQuantities.map((mq: any) => {
                        const challanMq = challanItem?.matchingQuantities?.find(
                            (cmq: any) => (cmq.matchingId._id || cmq.matchingId) === (mq.matchingId._id || mq.matchingId)
                        );
                        const dispatched = mq.dispatchedQuantity || 0;
                        const currentQty = challanMq ? challanMq.challanQuantity : 0;

                        const inv = inventoryData.find(
                            (i: any) =>
                                (i.qualityId._id || i.qualityId) === itemData.qualityId &&
                                (i.designId._id || i.designId) === itemData.designId &&
                                (i.matchingId._id || i.matchingId) === (mq.matchingId._id || mq.matchingId) &&
                                i.type === "Saree"
                        );

                        return {
                            matchingId: mq.matchingId._id || mq.matchingId,
                            orderedQuantity: mq.quantity,
                            challanQuantity: currentQty,
                            remainingQuantity: (mq.quantity - dispatched) + currentQty,
                            availableStock: (inv?.availableSaree || 0) + currentQty
                        };
                    });

                    itemData.selected = !!challanItem;
                }

                return itemData;
            }));

            setChallanItems(items);

        } catch (error) {
            console.error("Error loading challan:", error);
            setError("Failed to load challan details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    // Helper to get order ID from various possible locations
    const getOrderId = (order: any): string => {
        return order?.id || order?._id || order?._id?.$oid || "";
    };

    const loadOrders = async () => {
        try {
            const data = await fetchOrders();
            // Show orders that are NOT fully dispatched
            // If dispatchStatus doesn't exist, show them (backwards compatibility)
            const pendingOrders = data.filter(
                (o) => !o.dispatchStatus || o.dispatchStatus !== "completed"
            );
            setOrders(pendingOrders);
            console.log("Loaded orders for challan:", pendingOrders);
        } catch (error) {
            console.error("Error loading orders:", error);
        }
    };

    const handleOrderSelect = async (orderId: string) => {
        console.log("=== ORDER SELECTION DEBUG ===");
        console.log("Selected order ID:", orderId);
        console.log("Available orders:", orders);

        // Try to find by ID first
        let order = orders.find((o) => getOrderId(o) === orderId);

        // If not found, try to find by orderNo (in case dropdown is sending text)
        if (!order) {
            console.log("Not found by ID, trying by orderNo...");
            order = orders.find((o) => orderId.includes(o.orderNo));
        }

        console.log("Found order:", order);
        if (!order) {
            console.log("ERROR: Order not found!");
            return;
        }

        console.log("Setting selected order...");
        setSelectedOrder(order);



        try {
            // Fetch inventory to get stock availability
            const inventoryData = await fetchInventory();

            // Pre-fill challan items from order line items
            const items: ChallanItemData[] = await Promise.all(order.lineItems.map(async (item, index) => {
                const type = item.quantityType || (item as any).catalogType;
                const isTaka = type === "Taka" || type === "Meter"; // Both Taka and Meter are Taka stock items

                const getObjId = (obj: any) => obj ? (obj.id || obj._id || obj) : null;

                const qualityId = typeof item.qualityId === "object" ? getObjId(item.qualityId) : item.qualityId;
                const designId = typeof item.designId === "object" ? getObjId(item.designId) : item.designId;

                if (isTaka) {
                    const ordered = item.quantity || 0;
                    const dispatched = item.dispatchedQuantity || 0;
                    const remaining = ordered - dispatched;

                    // Find ALL matching inventory items across all factories and sum their stock
                    const matchingStockItems = inventoryData.filter(inv => {
                        const invQualityId = inv.qualityId?.id || (inv.qualityId as any)?._id || inv.qualityId;
                        const invDesignId = inv.designId?.id || (inv.designId as any)?._id || inv.designId;
                        return invQualityId === qualityId &&
                            (!designId || invDesignId === designId) &&
                            inv.type === "Taka";
                    });

                    const availableStock = matchingStockItems.reduce((sum, inv) => sum + (inv.availableMeters || 0), 0);
                    const availableTaka = matchingStockItems.reduce((sum, inv) => sum + (inv.availableTaka || 0), 0);

                    // Fetch available pieces for selection
                    const availablePieces = await fetchAvailableStockPieces(qualityId, designId);

                    // Auto-select pieces based on quantity type
                    let selectedPieces: StockPiece[] = [];
                    let challanQty = 0;

                    const quantityType = item.quantityType || "Taka";

                    // Initialize with blank/0 quantities as requested
                    selectedPieces = [];
                    challanQty = 0;

                    return {
                        orderLineItemIndex: index,
                        qualityId,
                        designId,
                        type: "Taka",
                        quantityType,
                        orderedQuantity: ordered,
                        challanQuantity: challanQty,
                        remainingQuantity: remaining,
                        availableStock,
                        availableTaka,
                        availablePieces,
                        selectedPieces,
                        selected: true
                    };
                } else {
                    // Saree  
                    return {
                        orderLineItemIndex: index,
                        qualityId,
                        designId,
                        type: "Saree",
                        orderedQuantity: 0,
                        challanQuantity: 0,
                        remainingQuantity: 0,
                        availableStock: 0,
                        cut: item.cut,
                        selected: true,
                        matchingQuantities: item.matchingQuantities?.map((mq) => {
                            const ordered = mq.quantity || 0;
                            const dispatched = mq.dispatchedQuantity || 0;
                            const remaining = ordered - dispatched;

                            const matchingId = typeof mq.matchingId === "object" ? getObjId(mq.matchingId) : mq.matchingId;

                            // Find ALL matching inventory items across all factories and sum their stock
                            const matchingStockItems = inventoryData.filter(inv => {
                                const invQualityId = inv.qualityId?.id || (inv.qualityId as any)?._id || inv.qualityId;
                                const invDesignId = inv.designId?.id || (inv.designId as any)?._id || inv.designId;
                                const invMatchingId = inv.matchingId?.id || (inv.matchingId as any)?._id || inv.matchingId;
                                return invQualityId === qualityId &&
                                    (!designId || invDesignId === designId) &&
                                    invMatchingId === matchingId &&
                                    inv.type === "Saree";
                            });

                            const availableStock = matchingStockItems.reduce((sum, inv) => sum + (inv.availableSaree || 0), 0);

                            return {
                                matchingId,
                                orderedQuantity: ordered,
                                challanQuantity: 0,
                                remainingQuantity: remaining,
                                availableStock,
                            };
                        }),
                    };
                }
            }));

            console.log("Challan items with total stock:", items);
            setChallanItems(items);
        } catch (error) {
            console.error("Error generating challan items:", error);
            setError("Failed to load order items. Please check console for details.");
        }
    };

    const updateChallanQuantity = (
        itemIndex: number,
        quantity: number,
        matchingIndex?: number
    ) => {
        setChallanItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== itemIndex) return item;

                if (item.type === "Taka") {
                    // Limit only by available stock (allow over-delivery if stock exists)
                    const maxAllowed = item.quantityType === "Meter"
                        ? item.availableStock
                        : (item.availableTaka || 0);

                    const validQty = Math.min(quantity, maxAllowed);

                    // Show alert if trying to exceed available stock
                    if (quantity > maxAllowed) {
                        const unit = item.quantityType === "Meter" ? "meters" : "pieces";
                        alert(`Cannot dispatch more than available stock!\nAvailable: ${maxAllowed} ${unit}\nYou tried: ${quantity} ${unit}`);
                    }

                    // Auto-select pieces if unit is Meter
                    if (item.quantityType === "Meter" && item.availablePieces) {
                        let accumulatedMeters = 0;
                        const newSelectedPieces: StockPiece[] = [];

                        for (const piece of item.availablePieces) {
                            if (accumulatedMeters >= validQty) break;
                            newSelectedPieces.push(piece);
                            accumulatedMeters += piece.meter;
                        }

                        return {
                            ...item,
                            challanQuantity: Math.max(0, validQty),
                            selectedPieces: newSelectedPieces
                        };
                    }

                    // For Taka type (pieces), just update quantity
                    return { ...item, challanQuantity: Math.max(0, validQty) };
                } else if (matchingIndex !== undefined && item.matchingQuantities) {
                    // Update specific matching quantity
                    const updatedMatchings = item.matchingQuantities.map((mq, mIdx) => {
                        if (mIdx !== matchingIndex) return mq;

                        // Limit only by available stock
                        const maxAllowed = mq.availableStock;
                        const validQty = Math.min(quantity, maxAllowed);

                        // Show alert if trying to exceed available stock
                        if (quantity > maxAllowed) {
                            alert(`Cannot dispatch more than available stock!\nAvailable: ${mq.availableStock} pcs\nYou tried: ${quantity} pcs`);
                        }

                        return { ...mq, challanQuantity: Math.max(0, validQty) };
                    });
                    return { ...item, matchingQuantities: updatedMatchings };
                }

                return item;
            })
        );
    };

    const updateBatchNo = (itemIndex: number, batchNo: string) => {
        setChallanItems((prev) =>
            prev.map((item, idx) =>
                idx === itemIndex ? { ...item, batchNo } : item
            )
        );
    };

    const togglePieceSelection = (itemIndex: number, piece: StockPiece) => {
        setChallanItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== itemIndex || item.type !== "Taka") return item;

                const isSelected = item.selectedPieces?.some(p => p.id === piece.id);
                let newSelectedPieces: StockPiece[];

                if (isSelected) {
                    // Remove piece
                    newSelectedPieces = item.selectedPieces?.filter(p => p.id !== piece.id) || [];
                } else {
                    // Add piece
                    newSelectedPieces = [...(item.selectedPieces || []), piece];
                }

                // Recalculate challan quantity based on unit type
                let newChallanQty = 0;
                if (item.quantityType === "Taka") {
                    newChallanQty = newSelectedPieces.length;
                } else {
                    newChallanQty = newSelectedPieces.reduce((sum, p) => sum + p.meter, 0);
                }

                return {
                    ...item,
                    selectedPieces: newSelectedPieces,
                    challanQuantity: newChallanQty
                };
            })
        );
    };

    const toggleItemSelection = (itemIndex: number) => {
        setChallanItems((prev) =>
            prev.map((item, idx) =>
                idx === itemIndex
                    ? { ...item, selected: !item.selected }
                    : item
            )
        );
    };

    const handleSaveChallan = async () => {
        if (!selectedOrder) {
            setError("Please select an order");
            return;
        }

        // Filter items: Must be selected AND have > 0 quantity
        const selectedItems = challanItems
            .filter(item => item.selected !== false)
            .map(item => {
                const baseItem = { ...item };

                if (baseItem.type === "Taka") {
                    // Taka items validation
                    if (baseItem.quantityType === "Taka") {
                        // Pieces must be selected
                        if (!baseItem.selectedPieces || baseItem.selectedPieces.length === 0) return null;
                        baseItem.challanQuantity = baseItem.selectedPieces.length; // Ensure qty matches pieces
                    }
                    return (baseItem.challanQuantity && baseItem.challanQuantity > 0) ? baseItem : null;
                } else {
                    // Saree items validation
                    baseItem.matchingQuantities = baseItem.matchingQuantities?.filter(mq => (mq.challanQuantity || 0) > 0);
                    if (baseItem.matchingQuantities && baseItem.matchingQuantities.length > 0) {
                        return baseItem;
                    }
                    return null;
                }
            })
            .filter((item): item is ChallanItemData => item !== null);

        if (selectedItems.length === 0) {
            setError("Please enter quantity for at least one item");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Transform items for API
            const transformedItems = selectedItems.map(item => {
                if (item.type === "Taka" && item.selectedPieces) {
                    return {
                        ...item,
                        selectedPieces: item.selectedPieces.map(piece => ({
                            takaNo: piece.takaNo,
                            meter: piece.meter,
                            stockPieceId: (piece as any)._id || (piece as any).id || (piece as any).stockPieceId
                        }))
                    };
                }
                return item;
            });

            const payload = {
                orderId: getOrderId(selectedOrder),
                partyId: typeof selectedOrder.partyId === "object" ? (selectedOrder.partyId as any)._id || (selectedOrder.partyId as any).id : selectedOrder.partyId,
                challanDate,
                items: transformedItems,
                remarks,
            };

            if (id) {
                await updateChallan(id, payload);
                alert("Challan updated successfully!");
            } else {
                const created = await createChallan(payload);
                const newId = (created as any)._id || (created as any).id;
                if (newId) window.open(`/api/challans/${newId}/pdf`, "_blank");
                alert("Challan created successfully!");
            }

            navigate("/challans");

        } catch (err: any) {
            console.error("Error saving challan:", err);
            if (err.insufficientItems) {
                setError(
                    `Insufficient stock: ${err.insufficientItems
                        .map(
                            (item: any) =>
                                `${item.qualityName} - Need: ${item.required}, Available: ${item.available}`
                        )
                        .join(", ")}`
                );
            } else {
                setError(err.message || "Failed to save challan");
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader
                    title={id ? "Edit Challan" : "Create Challan"}
                    subtitle={id ? "Modify existing delivery challan" : "Generate delivery challan from order"}
                />
                <Button
                    variant="secondary"
                    onClick={() => navigate("/challans")}
                    className="flex items-center gap-2"
                >
                    📋 View Challans
                </Button>
            </div>

            <Card className="p-6">
                {/* Order Selection */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-2">
                            Select Order
                        </label>
                        <select
                            value={selectedOrder ? getOrderId(selectedOrder) : ""}
                            onChange={(e) => handleOrderSelect(e.target.value)}
                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">-- Select an order --</option>
                            {orders.map((order) => (
                                <option key={getOrderId(order)} value={getOrderId(order)}>
                                    {order.orderNo} | {" "}
                                    {order.partyId && typeof order.partyId === "object"
                                        ? (order.partyId as any).partyName
                                        : ""} | {" "}
                                    {order.date} | ₹{order.totalAmount?.toFixed(2) || "0.00"} | {" "}
                                    {order.dispatchStatus}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedOrder && (
                        <>
                            {/* Challan Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-2">
                                        Challan Date
                                    </label>
                                    <input
                                        type="date"
                                        value={challanDate}
                                        onChange={(e) => setChallanDate(e.target.value)}
                                        className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-2">
                                    Remarks
                                </label>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    rows={2}
                                    className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Challan Items */}
                            < div >
                                <h3 className="text-lg font-semibold text-body mb-4">
                                    Challan Items
                                </h3>

                                <div className="space-y-4">
                                    {challanItems.map((item, itemIndex) => {
                                        const orderItem = selectedOrder.lineItems[item.orderLineItemIndex];
                                        const quality =
                                            orderItem.qualityId && typeof orderItem.qualityId === "object"
                                                ? orderItem.qualityId.fabricName
                                                : "";
                                        const design =
                                            orderItem.designId && typeof orderItem.designId === "object"
                                                ? orderItem.designId.designNumber
                                                : "";

                                        return (
                                            <Card key={itemIndex} className={`p-4 ${item.selected !== false ? 'bg-surface-300' : 'bg-surface-300/50 opacity-70'}`}>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.selected !== false}
                                                                onChange={() => toggleItemSelection(itemIndex)}
                                                                className="w-5 h-5 rounded border-white/20 bg-white/5 text-neon-cyan focus:ring-neon-cyan/50 cursor-pointer"
                                                            />
                                                            <div>
                                                                <span className="font-medium text-body">
                                                                    {quality}
                                                                </span>
                                                                {design && (
                                                                    <span className="text-muted ml-2">
                                                                        - {design}
                                                                    </span>
                                                                )}
                                                                <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                                                                    {item.type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Batch No Input */}
                                                    <div className="mt-2 mb-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Batch / Potla No"
                                                            value={item.batchNo || ""}
                                                            onChange={(e) => updateBatchNo(itemIndex, e.target.value)}
                                                            className="bg-surface-200 border border-border/10 rounded px-2 py-1 text-body text-sm w-full md:w-1/3 placeholder:text-muted focus:ring-1 focus:ring-primary focus:outline-none"
                                                        />
                                                    </div>

                                                    {item.type === "Taka" ? (
                                                        <>
                                                            <div className="grid grid-cols-5 gap-4">
                                                                <div>
                                                                    <label className="block text-xs text-muted">
                                                                        Ordered
                                                                    </label>
                                                                    <div className="text-body">
                                                                        {item.orderedQuantity}{item.quantityType === "Meter" ? "m" : " Taka"}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-muted">
                                                                        Remaining
                                                                    </label>
                                                                    <div className="text-yellow-500">
                                                                        {item.remainingQuantity}{item.quantityType === "Meter" ? "m" : " Taka"}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-muted">
                                                                        Stock (M)
                                                                    </label>
                                                                    <div className="text-green-500 font-semibold">
                                                                        {item.availableStock.toFixed(2)}m
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-muted">
                                                                        Stock (Pcs)
                                                                    </label>
                                                                    <div className="text-cyan-400 font-semibold">
                                                                        {item.availableTaka || 0} Taka
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-muted mb-1">
                                                                        Challan Qty ({item.quantityType === "Meter" ? "m" : "Taka"})
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        value={item.challanQuantity}
                                                                        onChange={(e) =>
                                                                            updateChallanQuantity(
                                                                                itemIndex,
                                                                                parseFloat(e.target.value) || 0
                                                                            )
                                                                        }
                                                                        max={
                                                                            item.quantityType === "Meter" ? item.availableStock : (item.availableTaka || Infinity)
                                                                        }
                                                                        min={0}
                                                                        step={item.quantityType === "Meter" ? "0.01" : "1"}
                                                                        className="w-full bg-surface-200 border border-border/10 rounded px-2 py-1 text-body text-sm"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {item.availablePieces && item.availablePieces.length > 0 && (
                                                                <div className="mt-4 border-t border-border/10 pt-4">
                                                                    <div className="flex justify-between items-center mb-3">
                                                                        <h4 className="font-semibold text-body">Select Taka Pieces</h4>
                                                                        <div className="text-sm text-muted">
                                                                            Selected: {item.selectedPieces?.length || 0} pieces
                                                                            {item.quantityType === "Meter" && (
                                                                                <span className="ml-2">
                                                                                    ({item.selectedPieces?.reduce((sum, p) => sum + p.meter, 0).toFixed(2) || 0}m)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Meter Mismatch Warning */}
                                                                    {item.quantityType === "Meter" && item.selectedPieces && item.selectedPieces.length > 0 && (
                                                                        (() => {
                                                                            const selectedMeters = item.selectedPieces.reduce((sum, p) => sum + p.meter, 0);
                                                                            const targetMeters = item.remainingQuantity;
                                                                            const diff = Math.abs(selectedMeters - targetMeters);
                                                                            const tolerance = targetMeters * 0.05;

                                                                            if (diff > tolerance) {
                                                                                return (
                                                                                    <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                                                                        <div className="flex items-start gap-2">
                                                                                            <span className="text-yellow-500 text-xl">⚠</span>
                                                                                            <div className="flex-1 text-sm">
                                                                                                <p className="text-yellow-500 font-semibold">Meter Mismatch</p>
                                                                                                <p className="text-slate-300">
                                                                                                    Selected: {selectedMeters.toFixed(2)}m, Target: {targetMeters.toFixed(2)}m (Diff: {diff.toFixed(2)}m)
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()
                                                                    )}

                                                                    <div className="mb-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Search Taka Number..."
                                                                            value={takaSearchQueries[itemIndex] || ""}
                                                                            onChange={(e) => setTakaSearchQueries(prev => ({ ...prev, [itemIndex]: e.target.value }))}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") {
                                                                                    e.preventDefault();
                                                                                    const query = (takaSearchQueries[itemIndex] || "").toLowerCase();
                                                                                    if (!query) return;

                                                                                    const matches = item.availablePieces?.filter(p => p.takaNo.toLowerCase().includes(query)) || [];

                                                                                    if (matches.length === 1) {
                                                                                        const piece = matches[0];
                                                                                        const isAlreadySelected = item.selectedPieces?.some(p => p.id === piece.id);
                                                                                        if (!isAlreadySelected) {
                                                                                            togglePieceSelection(itemIndex, piece);
                                                                                        }
                                                                                        setTakaSearchQueries(prev => ({ ...prev, [itemIndex]: "" }));
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="w-full bg-surface-200 border border-border/10 rounded px-3 py-2 text-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    </div>

                                                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                                                                        {item.availablePieces
                                                                            .filter(piece => {
                                                                                const query = (takaSearchQueries[itemIndex] || "").toLowerCase();
                                                                                if (!query) return true;
                                                                                return piece.takaNo.toLowerCase().includes(query);
                                                                            })
                                                                            .map((piece) => {
                                                                                const isSelected = item.selectedPieces?.some(p => p.id === piece.id);
                                                                                return (
                                                                                    <label
                                                                                        key={piece.id}
                                                                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected
                                                                                            ? "bg-primary/20 border border-primary"
                                                                                            : "bg-surface-200 border border-border/10 hover:border-border/20"
                                                                                            }`}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isSelected}
                                                                                            onChange={() => togglePieceSelection(itemIndex, piece)}
                                                                                            className="w-4 h-4"
                                                                                        />
                                                                                        <div className="flex-1 flex justify-between">
                                                                                            <div>
                                                                                                <span className="font-medium text-body">Taka #{piece.takaNo}</span>
                                                                                                <span className="ml-2 text-muted text-sm">{piece.meter.toFixed(2)}m</span>
                                                                                            </div>
                                                                                            {piece.factoryId && typeof piece.factoryId === "object" && (
                                                                                                <span className="text-xs text-muted">
                                                                                                    {piece.factoryId.factoryName}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        {item.availablePieces.length === 0 && (
                                                                            <p className="text-sm text-muted p-2">No available pieces found.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        // Saree Item
                                                        <div className="space-y-2">
                                                            {item.matchingQuantities?.map((mq, mqIdx) => {
                                                                const matchingName =
                                                                    orderItem.matchingQuantities?.[mqIdx];
                                                                const name =
                                                                    matchingName &&
                                                                        typeof matchingName.matchingId === "object"
                                                                        ? (matchingName.matchingId as any).matchingName
                                                                        : "";

                                                                return (
                                                                    <div
                                                                        key={mqIdx}
                                                                        className="grid grid-cols-5 gap-4 items-center"
                                                                    >
                                                                        <div className="text-body">{name}</div>
                                                                        <div>
                                                                            <label className="block text-xs text-muted">
                                                                                Ordered
                                                                            </label>
                                                                            <div className="text-body">
                                                                                {mq.orderedQuantity} pcs
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs text-muted">
                                                                                Remaining
                                                                            </label>
                                                                            <div className="text-yellow-500">
                                                                                {mq.remainingQuantity} pcs
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs text-muted">
                                                                                Available Stock
                                                                            </label>
                                                                            <div className="text-green-500 font-semibold">
                                                                                {mq.availableStock} pcs
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs text-muted mb-1">
                                                                                Challan Qty
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                value={mq.challanQuantity}
                                                                                onChange={(e) =>
                                                                                    updateChallanQuantity(
                                                                                        itemIndex,
                                                                                        parseInt(e.target.value) || 0,
                                                                                        mqIdx
                                                                                    )
                                                                                }
                                                                                max={mq.availableStock}
                                                                                min={0}
                                                                                className="w-full bg-surface-200 border border-border/10 rounded px-2 py-1 text-body text-sm"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div >

                            {/* Error Display */}
                            {
                                error && (
                                    <div className="bg-red-500/10 border border-red-500 text-red-500 rounded p-4">
                                        {error}
                                    </div>
                                )
                            }

                            {/* Actions */}
                            <div className="flex gap-4 justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate("/challans")}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveChallan} disabled={loading}>
                                    {loading ? "Saving..." : (id ? "Update Challan" : "Create Challan")}
                                </Button>
                            </div>
                        </>
                    )
                    }
                </div >
            </Card >
        </div >
    );
}
