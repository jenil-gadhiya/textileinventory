import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/store/useStockStore";
import { getCatalogByQuality } from "@/api/productions";
import { OrderLineItem, MatchingQuantity } from "@/types/stock";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (lineItem: OrderLineItem) => void;
    editingItem?: OrderLineItem | null;
}

export function QualityLineItemModal({ isOpen, onClose, onAdd, editingItem }: Props) {
    const { qualities, factories } = useStockStore();

    const [catalogType, setCatalogType] = useState<"Saree" | "Taka">("Saree");
    const [filteredQualities, setFilteredQualities] = useState<any[]>([]);
    const [qualityId, setQualityId] = useState("");
    const [designId, setDesignId] = useState("");
    const [factoryId, setFactoryId] = useState("");

    // Saree mode fields
    const [availableDesigns, setAvailableDesigns] = useState<any[]>([]);
    const [matchingQuantities, setMatchingQuantities] = useState<MatchingQuantity[]>([]);
    const [cut, setCut] = useState(0);

    // Taka mode fields
    const [quantityType, setQuantityType] = useState<"Saree" | "Taka" | "Meter">("Meter");
    const [quantity, setQuantity] = useState(0);
    const [noOfChallan, setNoOfChallan] = useState(0);

    // Common
    const [rate, setRate] = useState(0);

    // Reset form when modal opens/closes or when editing
    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                loadEditingData(editingItem);
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingItem]);

    const loadEditingData = (item: OrderLineItem) => {
        // Handle both _id (from DB) and id (frontend mapped)
        const qId = typeof item.qualityId === "object"
            ? ((item.qualityId as any)._id || item.qualityId.id)
            : item.qualityId;

        const dId = typeof item.designId === "object"
            ? ((item.designId as any)._id || item.designId.id)
            : item.designId;

        const fId = typeof item.factoryId === "object"
            ? ((item.factoryId as any)._id || item.factoryId.id)
            : item.factoryId;

        setQualityId(qId || "");
        setDesignId(dId || "");
        setFactoryId(fId || "");
        setCatalogType(item.catalogType);
        setRate(item.rate);

        if (item.catalogType === "Saree") {
            setMatchingQuantities(item.matchingQuantities || []);
            setCut(item.cut || 0);
        } else {
            setQuantityType(item.quantityType || "Meter");
            setQuantity(item.quantity || 0);
            setNoOfChallan((item as any).noOfChallan || 0);
        }
    };

    const resetForm = () => {
        setQualityId("");
        setDesignId("");
        setFactoryId("");
        setCatalogType("Saree");
        setFilteredQualities([]);
        setAvailableDesigns([]);
        setMatchingQuantities([]);
        setCut(0);
        setQuantityType("Meter");
        setQuantity(0);
        setNoOfChallan(0);
        setRate(0);
    };

    // Fetch qualities that have catalog entries for selected stock type
    useEffect(() => {
        if (isOpen) {
            fetchQualitiesByStockType();
        }
    }, [catalogType, isOpen]);

    const fetchQualitiesByStockType = async () => {
        try {
            const { http } = await import("@/api/http");
            const { data } = await http.get("/catalog");

            // Filter to get unique qualities for this stock type
            const qualityIds = new Set<string>();
            data.forEach((entry: any) => {
                if (entry.stockType === catalogType && entry.qualityId) {
                    const qId = typeof entry.qualityId === "object"
                        ? (entry.qualityId._id || entry.qualityId.id)
                        : entry.qualityId;

                    if (qId) {
                        qualityIds.add(qId.toString());
                    }
                }
            });

            const filtered = qualities.filter(q => qualityIds.has(q.id) || qualityIds.has(q.id.toString()));
            setFilteredQualities(filtered);
        } catch (error) {
            console.error("Error fetching qualities:", error);
        }
    }

    // Fetch catalog when quality changes
    useEffect(() => {
        if (qualityId) {
            fetchDesignsForQuality();
        } else {
            setAvailableDesigns([]);
            setDesignId("");
        }
    }, [qualityId]);

    const fetchDesignsForQuality = async () => {
        try {
            const catalogEntries = await getCatalogByQuality(qualityId);
            if (catalogEntries.length > 0) {
                const designMap = new Map();
                catalogEntries.forEach((entry: any) => {
                    if (entry.designId) {
                        const design = typeof entry.designId === "object" ? entry.designId : null;
                        if (design) {
                            designMap.set(design._id || design.id, design);
                        }
                    }
                });
                const designs = Array.from(designMap.values());
                setAvailableDesigns(designs);
            }
        } catch (error) {
            console.error("Error fetching designs:", error);
        }
    };

    const fetchMatchingsForDesign = async (targetDesignId: string) => {
        if (!targetDesignId) return;

        // Safety Net: If the target design matches the one we are editing, 
        // ALWAYS prefer the editingItem's data over a fresh fetch.
        // This prevents accidental resets if this function is called redundantly.
        if (editingItem && editingItem.catalogType === catalogType) {
            const editingDId = typeof editingItem.designId === "object"
                ? ((editingItem.designId as any)._id || editingItem.designId.id)
                : editingItem.designId;

            if (editingDId && editingDId.toString() === targetDesignId.toString()) {
                // Restore from editing item to ensure data persistence
                setMatchingQuantities(editingItem.matchingQuantities || []);
                setCut(editingItem.cut || 0);
                return;
            }
        }

        // Otherwise fetch fresh from catalog
        try {
            const catalogEntries = await getCatalogByQuality(qualityId);
            const designEntries = catalogEntries.filter((entry: any) => {
                const entryDesignId = typeof entry.designId === "object"
                    ? (entry.designId._id || entry.designId.id)
                    : entry.designId;
                return entryDesignId === targetDesignId;
            });

            if (designEntries.length > 0) {
                const matchingMap = new Map();

                designEntries.forEach((entry: any) => {
                    if (entry.matchingId) {
                        const matching = typeof entry.matchingId === "object" ? entry.matchingId : null;
                        if (matching) {
                            const matchingIdStr = (matching._id || matching.id || matching).toString();
                            if (!matchingMap.has(matchingIdStr)) {
                                matchingMap.set(matchingIdStr, {
                                    matchingId: matchingIdStr,
                                    matchingName: matching.matchingName || "",
                                    quantity: 0
                                });
                            }
                        }
                    }
                });

                if (matchingMap.size === 0) {
                    matchingMap.set("standard_matching", {
                        matchingId: null as unknown as string,
                        matchingName: "Standard",
                        quantity: 0
                    });
                }

                setMatchingQuantities(Array.from(matchingMap.values()));
                setCut(designEntries[0].cut || 0);
            } else {
                // If no entries found (and not editing restored), clear data
                setMatchingQuantities([]);
                setCut(0);
            }
        } catch (error) {
            console.error("Error fetching matchings:", error);
            // On error, better to clear or keep? Clear to be safe.
            setMatchingQuantities([]);
        }
    };

    const handleDesignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setDesignId(newId);

        if (!newId) {
            setMatchingQuantities([]);
            setCut(0);
            return;
        }

        if (catalogType === "Saree") { // Only fetch matchings if in Saree mode
            fetchMatchingsForDesign(newId);
        }
    };

    const handleMatchingQuantityChange = (matchingId: string, qty: number) => {
        setMatchingQuantities(
            matchingQuantities.map((mq) => {
                const mId = mq.matchingId as unknown as string;
                return mId === matchingId ? { ...mq, quantity: qty } : mq;
            })
        );
    };

    const calculateSareeTotalSaree = () => {
        return matchingQuantities.reduce((sum, mq) => sum + mq.quantity, 0);
    };

    const calculateSareeTotalMeters = () => {
        return calculateSareeTotalSaree() * cut;
    };

    const calculateSareeOrderValue = () => {
        return calculateSareeTotalSaree() * rate;
    };

    const calculateTakaOrderValue = () => {
        // If Taka (Piece) mode, assume 120 meters per piece
        if (quantityType === "Taka") {
            return quantity * 120 * rate;
        }
        // If Meter mode, quantity is meters
        return quantity * rate;
    };

    const handleAddAndNext = () => {
        if (!factoryId) {
            alert("Please select a factory");
            return;
        }
        if (!qualityId || !designId) {
            alert("Please select quality and design");
            return;
        }

        const selectedFactory = factories.find(f => f.id === factoryId);

        if (catalogType === "Saree") {
            const activeMatchings = matchingQuantities.filter((mq) => mq.quantity > 0);
            if (activeMatchings.length === 0) {
                alert("Please enter quantity for at least one matching");
                return;
            }
            if (rate <= 0) {
                alert("Please enter a valid rate");
                return;
            }

            // Find full objects for display
            const selectedQuality = filteredQualities.find(q => q.id === qualityId || q.id === parseInt(qualityId));
            const selectedDesign = availableDesigns.find(d => (d._id || d.id) === designId);
            const selectedFactory = factories.find(f => f.id === factoryId);

            const lineItem: OrderLineItem = {
                qualityId: selectedQuality || qualityId,
                designId: selectedDesign || designId,
                factoryId: selectedFactory || factoryId,
                catalogType: "Saree",
                quantityType: "Saree",
                matchingQuantities: activeMatchings,
                cut,
                totalSaree: calculateSareeTotalSaree(),
                totalMeters: calculateSareeTotalMeters(),
                rate,
                orderValue: calculateSareeOrderValue()
            };

            onAdd(lineItem);
        } else {
            if (quantity <= 0) {
                alert("Please enter a valid quantity");
                return;
            }
            if (rate <= 0) {
                alert("Please enter a valid rate");
                return;
            }

            // Find full objects for display
            const selectedQuality = filteredQualities.find(q => q.id === qualityId || q.id === parseInt(qualityId));
            const selectedDesign = availableDesigns.find(d => (d._id || d.id) === designId);

            const lineItem: OrderLineItem = {
                qualityId: selectedQuality || qualityId,
                designId: selectedDesign || designId,
                factoryId: selectedFactory || factoryId,
                catalogType: "Taka",
                quantityType,
                quantity,
                // For Taka (Piece), total meters = quantity * 120
                // For Meter, total meters = quantity
                totalMeters: quantityType === "Taka" ? quantity * 120 : quantity,
                rate,
                orderValue: calculateTakaOrderValue(),
                ...(quantityType === "Meter" ? { noOfChallan } : {})
            } as OrderLineItem;

            // Handle multiple challans for Meter mode
            const count = (quantityType === "Meter" && noOfChallan > 1 && !editingItem) ? noOfChallan : 1;
            for (let i = 0; i < count; i++) {
                onAdd(lineItem);
            }
        }

        const currentDesignIndex = availableDesigns.findIndex(
            d => (d._id || d.id) === designId
        );

        if (currentDesignIndex !== -1 && currentDesignIndex < availableDesigns.length - 1) {
            const nextDesign = availableDesigns[currentDesignIndex + 1];
            const nextDesignId = nextDesign._id || nextDesign.id;

            setDesignId(nextDesignId);
            // Fetch matchings for the next design
            if (catalogType === "Saree") {
                fetchMatchingsForDesign(nextDesignId);
                // Should clear before fetch returns?
                // fetchMatchingsForDesign will overwrite anyway.
                // But good to clear to remove old values instantly.
                setMatchingQuantities([]);
                setCut(0);
            } else {
                setQuantity(0);
                setNoOfChallan(0);
            }
            setRate(0);
        } else {
            alert("No more designs available for this quality");
            onClose();
        }
    };

    const handleAdd = () => {
        if (!factoryId) {
            alert("Please select a factory");
            return;
        }
        if (!qualityId || !designId) {
            alert("Please select quality and design");
            return;
        }

        const selectedFactory = factories.find(f => f.id === factoryId);

        if (catalogType === "Saree") {
            const activeMatchings = matchingQuantities.filter((mq) => mq.quantity > 0);
            if (activeMatchings.length === 0) {
                alert("Please enter quantity for at least one matching");
                return;
            }
            if (rate <= 0) {
                alert("Please enter a valid rate");
                return;
            }

            // Find full objects for display
            const selectedQuality = filteredQualities.find(q => q.id === qualityId || q.id === parseInt(qualityId));
            const selectedDesign = availableDesigns.find(d => (d._id || d.id) === designId);

            const lineItem: OrderLineItem = {
                qualityId: selectedQuality || qualityId,
                designId: selectedDesign || designId,
                factoryId: selectedFactory || factoryId,
                catalogType: "Saree",
                quantityType: "Saree",
                matchingQuantities: activeMatchings,
                cut,
                totalSaree: calculateSareeTotalSaree(),
                totalMeters: calculateSareeTotalMeters(),
                rate,
                orderValue: calculateSareeOrderValue()
            };

            onAdd(lineItem);
        } else {
            if (quantity <= 0) {
                alert("Please enter a valid quantity");
                return;
            }
            if (rate <= 0) {
                alert("Please enter a valid rate");
                return;
            }

            // Find full objects for display
            const selectedQuality = filteredQualities.find(q => q.id === qualityId || q.id === parseInt(qualityId));
            const selectedDesign = availableDesigns.find(d => (d._id || d.id) === designId);

            const lineItem: OrderLineItem = {
                qualityId: selectedQuality || qualityId,
                designId: selectedDesign || designId,
                catalogType: "Taka",
                quantityType,
                quantity,
                totalMeters: quantityType === "Taka" ? quantity * 120 : quantity,
                rate,
                orderValue: calculateTakaOrderValue(),
                ...(quantityType === "Meter" ? { noOfChallan } : {})
            } as OrderLineItem;

            const count = (quantityType === "Meter" && noOfChallan > 1 && !editingItem) ? noOfChallan : 1;
            for (let i = 0; i < count; i++) {
                onAdd(lineItem);
            }
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit" : "Add"} Quality Line Item</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Factory */}
                    <div>
                        <Label htmlFor="factory">Factory*</Label>
                        <select
                            id="factory"
                            value={factoryId}
                            onChange={(e) => setFactoryId(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                        >
                            <option value="">Select Factory</option>
                            {factories.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.factoryName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Saree/Taka Toggle */}
                    <div>
                        <Label>Type*</Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button
                                type="button"
                                variant={catalogType === "Saree" ? "primary" : "secondary"}
                                onClick={() => {
                                    setCatalogType("Saree");
                                    setQualityId("");
                                    setDesignId("");
                                }}
                                className="w-full"
                            >
                                Saree
                            </Button>
                            <Button
                                type="button"
                                variant={catalogType === "Taka" ? "primary" : "secondary"}
                                onClick={() => {
                                    setCatalogType("Taka");
                                    setQualityId("");
                                    setDesignId("");
                                }}
                                className="w-full"
                            >
                                Taka
                            </Button>
                        </div>
                    </div>

                    {/* Quality */}
                    <div>
                        <Label htmlFor="quality">Quality*</Label>
                        <select
                            id="quality"
                            value={qualityId}
                            onChange={(e) => setQualityId(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                        >
                            <option value="">Select Quality</option>
                            {filteredQualities.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.fabricName} - {q.loomType} - {q.fabricType}
                                </option>
                            ))}
                        </select>
                        {filteredQualities.length === 0 && (
                            <p className="text-xs text-slate-400 mt-1">
                                No qualities found with {catalogType} catalog entries
                            </p>
                        )}
                    </div>

                    {/* Design */}
                    {qualityId && availableDesigns.length > 0 && (
                        <div>
                            <Label htmlFor="design">Design*</Label>
                            <select
                                id="design"
                                value={designId}
                                onChange={handleDesignChange}
                                className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                            >
                                <option value="">Select Design</option>
                                {availableDesigns.map((d: any) => (
                                    <option key={d._id || d.id} value={d._id || d.id}>
                                        {d.designNumber} {d.designName && d.designName.trim() ? `- ${d.designName}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* SAREE MODE */}
                    {catalogType === "Saree" && designId && matchingQuantities.length > 0 && (
                        (() => {
                            const selectedQuality = qualities.find(q => String(q.id) === String(qualityId));
                            const isGreyFabric = selectedQuality?.fabricType?.toLowerCase() === "grey";

                            return (
                                <>
                                    {isGreyFabric ? (
                                        <div className="space-y-4 pt-2">
                                            <div>
                                                <Label>Quantity (Pcs)*</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={calculateSareeTotalSaree() || ""}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        if (matchingQuantities.length > 0) {
                                                            const firstMq = matchingQuantities[0];
                                                            const mId = firstMq.matchingId && typeof firstMq.matchingId === 'object'
                                                                ? (firstMq.matchingId as any)._id || (firstMq.matchingId as any).id
                                                                : firstMq.matchingId as unknown as string;
                                                            handleMatchingQuantityChange(mId, val);
                                                        }
                                                    }}
                                                    placeholder="Enter quantity"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="saree-rate">Rate*</Label>
                                                <Input
                                                    id="saree-rate"
                                                    type="number"
                                                    step="0.01"
                                                    value={rate}
                                                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            <div>
                                                <Label>Order Value</Label>
                                                <Input
                                                    value={`₹${calculateSareeOrderValue().toFixed(2)} `}
                                                    readOnly
                                                    className="bg-surface-300 font-semibold"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                <h3 className="font-semibold text-lg">Matching Quantities</h3>
                                                {matchingQuantities.map((mq) => {
                                                    const mId = mq.matchingId as unknown as string;
                                                    return (
                                                        <div key={mId}>
                                                            <Label htmlFor={`matching - ${mId} `}>
                                                                {mq.matchingName}
                                                            </Label>
                                                            <Input
                                                                id={`matching - ${mId} `}
                                                                type="number"
                                                                min="0"
                                                                value={mq.quantity}
                                                                onChange={(e) =>
                                                                    handleMatchingQuantityChange(
                                                                        mId,
                                                                        parseInt(e.target.value) || 0
                                                                    )
                                                                }
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div>
                                                <Label htmlFor="cut">Cut*</Label>
                                                <Input
                                                    id="cut"
                                                    type="number"
                                                    step="0.01"
                                                    value={cut}
                                                    onChange={(e) => setCut(parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    readOnly
                                                    className="bg-surface-300"
                                                />
                                            </div>

                                            <div>
                                                <Label>Total Saree</Label>
                                                <Input
                                                    value={calculateSareeTotalSaree()}
                                                    readOnly
                                                    className="bg-surface-300"
                                                />
                                            </div>

                                            <div>
                                                <Label>Total Meters</Label>
                                                <Input
                                                    value={calculateSareeTotalMeters().toFixed(2)}
                                                    readOnly
                                                    className="bg-surface-300"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="saree-rate">Rate*</Label>
                                                <Input
                                                    id="saree-rate"
                                                    type="number"
                                                    step="0.01"
                                                    value={rate}
                                                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            <div>
                                                <Label>Order Value</Label>
                                                <Input
                                                    value={`₹${calculateSareeOrderValue().toFixed(2)} `}
                                                    readOnly
                                                    className="bg-surface-300 font-semibold"
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            );
                        })()
                    )}

                    {/* TAKA MODE */}
                    {catalogType === "Taka" && designId && (
                        <>
                            <div>
                                <Label>Unit*</Label>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <Button
                                        type="button"
                                        variant={quantityType === "Taka" ? "primary" : "secondary"}
                                        onClick={() => setQuantityType("Taka")}
                                        className="w-full"
                                    >
                                        Taka
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={quantityType === "Meter" ? "primary" : "secondary"}
                                        onClick={() => setQuantityType("Meter")}
                                        className="w-full"
                                    >
                                        Mts
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="quantity">
                                    Quantity ({quantityType === "Taka" ? "Pieces" : "Meters"})*
                                </Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>

                            {/* No of Challan - Only for Meter mode */}
                            {quantityType === "Meter" && (
                                <div>
                                    <Label htmlFor="noOfChallan">No. of Challan</Label>
                                    <Input
                                        id="noOfChallan"
                                        type="number"
                                        min="0"
                                        value={noOfChallan}
                                        onChange={(e) => setNoOfChallan(parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            <div>
                                <Label htmlFor="taka-rate">Rate*</Label>
                                <Input
                                    id="taka-rate"
                                    type="number"
                                    step="0.01"
                                    value={rate}
                                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                                    placeholder="₹ 0.00"
                                />
                            </div>

                            <div>
                                <Label>Per*</Label>
                                <div className="w-full">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        className="w-full"
                                        disabled
                                    >
                                        {quantityType === "Taka" ? "Piece" : "Meter"}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label>Order Value</Label>
                                <Input
                                    value={`₹${calculateTakaOrderValue().toFixed(2)} `}
                                    readOnly
                                    className="bg-surface-300 font-semibold"
                                />
                            </div>
                        </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAdd}>
                            {editingItem ? "Update" : "Add"} Line Item
                        </Button>
                        {!editingItem && availableDesigns.length > 1 && (
                            <Button type="button" variant="primary" onClick={handleAddAndNext}>
                                Add & Next Design
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
