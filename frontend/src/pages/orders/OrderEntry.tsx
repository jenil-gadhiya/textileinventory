import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/store/useStockStore";
import { QualityLineItemModal } from "@/components/orders/QualityLineItemModal";
import { createOrder } from "@/api/orders";
import { OrderLineItem } from "@/types/stock";

export function OrderEntryPage() {
    const navigate = useNavigate();
    const { parties } = useStockStore();
    const [brokers, setBrokers] = useState<any[]>([]);
    const [salesmen, setSalesmen] = useState<any[]>([]);

    const [date, setDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [partyId, setPartyId] = useState("");
    const [brokerId, setBrokerId] = useState("");
    const [salesmanId, setSalesmanId] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [deliveryTerms, setDeliveryTerms] = useState("");
    const [remarks, setRemarks] = useState("");
    const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // Load brokers and salesmen on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const { fetchBrokers } = await import("@/api/brokers");
                const brokersData = await fetchBrokers();
                setBrokers(brokersData);

                const { fetchSalesmen } = await import("@/api/salesmen");
                const salesmenData = await fetchSalesmen();
                setSalesmen(salesmenData);
            } catch (error) {
                console.error("Error loading data:", error);
            }
        };
        loadData();
    }, []);

    const handleAddLineItem = (lineItem: OrderLineItem) => {
        if (editingIndex !== null) {
            // Update existing
            setLineItems((prev) => {
                const updated = [...prev];
                updated[editingIndex] = lineItem;
                return updated;
            });
            setEditingIndex(null);
        } else {
            // Add new
            setLineItems((prev) => [...prev, lineItem]);
        }
        // Don't close modal here - let the modal component control when it closes
    };

    const handleEditLineItem = (index: number) => {
        setEditingIndex(index);
        setIsModalOpen(true);
    };

    const handleRemoveLineItem = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const calculateTotalAmount = () => {
        return lineItems.reduce((sum, item) => sum + item.orderValue, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (lineItems.length === 0) {
            alert("Please add at least one line item");
            return;
        }

        try {
            setLoading(true);

            const payload: any = {
                date,
                partyId,
                paymentTerms,
                deliveryTerms,
                remarks,
                lineItems,
                totalAmount: calculateTotalAmount()
            };

            // Only include brokerId if a broker is actually selected and is a valid ObjectId
            // MongoDB ObjectId is 24 hex characters
            const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

            if (brokerId && brokerId.trim() && isValidObjectId(brokerId)) {
                payload.brokerId = brokerId;
            } else if (brokerId && brokerId.trim()) {
                console.warn("Invalid brokerId detected, will not include in payload:", brokerId);
            }

            // Validate and include salesmanId if provided
            console.log("salesmanId value:", salesmanId);
            console.log("salesmanId is valid ObjectId?", isValidObjectId(salesmanId));

            if (salesmanId && salesmanId.trim() && isValidObjectId(salesmanId)) {
                payload.salesmanId = salesmanId;
            }

            console.log("Order payload being sent:", JSON.stringify(payload, null, 2));

            await createOrder(payload);
            navigate("/orders");
        } catch (error: any) {
            console.error("Error creating order:", error);
            const errorMsg = error?.response?.data?.message || "Failed to create order";
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const getLineItemDisplay = (item: OrderLineItem) => {
        const quality = typeof item.qualityId === "object" ? item.qualityId.fabricName : "";
        const design = typeof item.designId === "object"
            ? `${item.designId.designNumber}`
            : "";

        if (item.catalogType === "Saree") {
            return {
                quality,
                design,
                details: `${item.totalSaree} sarees × ${item.cut}m = ${item.totalMeters}m @ ₹${item.rate}/m`,
                value: `₹${item.orderValue.toFixed(2)}`
            };
        } else {
            let details = `${item.quantity} ${item.quantityType}`;

            if (item.quantityType === "Taka") {
                // If Taka, show total meters if available (calculated as qty * 120 typically)
                if (item.totalMeters) {
                    details += ` (${item.totalMeters}m)`;
                }
                // Rate is per meter
                details += ` @ ₹${item.rate}/m`;
            } else {
                // Meter mode
                details += ` @ ₹${item.rate}/m`;
            }

            return {
                quality,
                design,
                details,
                value: `₹${item.orderValue.toFixed(2)}`
            };
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Create Order"
                subtitle="Add a new customer order with line items"
            />

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardContent className="pt-6 space-y-6">
                        {/* Order Details */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="date">Date*</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="party">Party*</Label>
                                <select
                                    id="party"
                                    value={partyId}
                                    onChange={(e) => setPartyId(e.target.value)}
                                    className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                    required
                                >
                                    <option value="">Select Party</option>
                                    {parties.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.partyName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <Label htmlFor="broker">Broker</Label>
                                <select
                                    id="broker"
                                    value={brokerId}
                                    onChange={(e) => setBrokerId(e.target.value)}
                                    className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                >
                                    <option value="">Select Broker (Optional)</option>
                                    {brokers.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.brokerName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <Label htmlFor="salesman">Salesman</Label>
                                <select
                                    id="salesman"
                                    value={salesmanId}
                                    onChange={(e) => setSalesmanId(e.target.value)}
                                    className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                >
                                    <option value="">Select Salesman (Optional)</option>
                                    {salesmen.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.salesmanName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="paymentTerms">Payment Terms</Label>
                                <Input
                                    id="paymentTerms"
                                    value={paymentTerms}
                                    onChange={(e) => setPaymentTerms(e.target.value)}
                                    placeholder="Enter payment terms"
                                />
                            </div>

                            <div>
                                <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                                <Input
                                    id="deliveryTerms"
                                    value={deliveryTerms}
                                    onChange={(e) => setDeliveryTerms(e.target.value)}
                                    placeholder="Enter delivery terms"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <Label htmlFor="remarks">Remarks</Label>
                                <Input
                                    id="remarks"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Enter remarks"
                                />
                            </div>
                        </div>

                        {/* Add Line Item Button */}
                        <div className="flex justify-between items-center border-t pt-4">
                            <h3 className="text-lg font-semibold">Line Items</h3>
                            <Button
                                type="button"
                                onClick={() => {
                                    setEditingIndex(null);
                                    setIsModalOpen(true);
                                }}
                            >
                                + Add Quality
                            </Button>
                        </div>

                        {/* Line Items Table */}
                        {lineItems.length > 0 && (
                            <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-surface-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Quality</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Design</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Details</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Value</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                        {lineItems.map((item, index) => {
                                            const display = getLineItemDisplay(item);
                                            return (
                                                <tr key={index} className="hover:bg-surface-100">
                                                    <td className="px-4 py-3 text-sm">{display.quality}</td>
                                                    <td className="px-4 py-3 text-sm">{display.design}</td>
                                                    <td className="px-4 py-3 text-sm">{display.details}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold">
                                                        {display.value}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => handleEditLineItem(index)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveLineItem(index)}
                                                                className="text-red-400 hover:text-red-300 text-xl px-2"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {lineItems.length === 0 && (
                            <p className="text-center text-slate-400 py-8">
                                No line items added. Click "+ Add Quality" to add items.
                            </p>
                        )}

                        {/* Total Amount */}
                        {lineItems.length > 0 && (
                            <div className="flex justify-end items-center gap-4 border-t pt-4">
                                <span className="text-lg font-semibold">Total Amount:</span>
                                <span className="text-2xl font-bold text-neon-cyan">
                                    ₹{calculateTotalAmount().toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate("/orders")}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || lineItems.length === 0}>
                                {loading ? "Saving..." : "Create Order"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>

            {/* Quality Line Item Modal */}
            <QualityLineItemModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingIndex(null);
                }}
                onAdd={handleAddLineItem}
                editingItem={editingIndex !== null ? lineItems[editingIndex] : null}
            />
        </div>
    );
}
