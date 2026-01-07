import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/store/useStockStore";
import { createProduction, getCatalogByQuality, getProduction, updateProduction } from "@/api/productions";
import { TakaDetail, MatchingQuantity } from "@/types/stock";
// Using simple X icon instead of lucide-react

export function ProductionEntryPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const { factories, qualities } = useStockStore();

    const [date, setDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [factoryId, setFactoryId] = useState("");
    const [stockType, setStockType] = useState<"Taka" | "Saree">("Taka");

    // Taka fields
    const [takaQualityId, setTakaQualityId] = useState("");
    const [takaDesignId, setTakaDesignId] = useState("");
    const [takaAvailableDesigns, setTakaAvailableDesigns] = useState<any[]>([]);
    const [takaDetails, setTakaDetails] = useState<TakaDetail[]>([]);
    const [currentTakaNo, setCurrentTakaNo] = useState("");
    const [currentMeter, setCurrentMeter] = useState("");
    const takaNoRef = useRef<HTMLInputElement>(null);
    const meterRef = useRef<HTMLInputElement>(null);
    const ignoreDesignChangeRef = useRef(false);

    // Saree fields
    const [qualityId, setQualityId] = useState("");
    const [designId, setDesignId] = useState("");
    const [availableDesigns, setAvailableDesigns] = useState<any[]>([]);
    const [matchingQuantities, setMatchingQuantities] = useState<MatchingQuantity[]>([]);
    const [cut, setCut] = useState<number>(0);

    const [loading, setLoading] = useState(false);

    // Load production data in edit mode
    useEffect(() => {
        if (isEditMode && id) {
            loadProductionData();
        }
    }, [id, isEditMode]);



    const loadProductionData = async () => {
        try {
            setLoading(true);
            const production = await getProduction(id!);

            // Populate form fields
            setDate(production.date);
            setFactoryId(typeof production.factoryId === "object" ? production.factoryId.id : production.factoryId);
            setStockType(production.stockType);

            if (production.stockType === "Taka") {
                const qualityId = typeof production.qualityId === "object" ? production.qualityId.id : production.qualityId;
                const designIdValue = production.designId && typeof production.designId === "object" ? production.designId.id : production.designId;

                setTakaQualityId(qualityId || "");
                setTakaDesignId(typeof designIdValue === "string" ? designIdValue : "");
                setTakaDetails(production.takaDetails || []);
            } else if (production.stockType === "Saree") {
                const qualityId = typeof production.qualityId === "object" ? production.qualityId.id : production.qualityId;
                const designIdValue = production.designId && typeof production.designId === "object" ? production.designId.id : production.designId;

                setQualityId(qualityId || "");

                // Suppress the effect that resets matchings when designId changes
                ignoreDesignChangeRef.current = true;
                setDesignId(typeof designIdValue === "string" ? designIdValue : "");

                // Fetch and merge matchings manually
                if (qualityId && designIdValue) {
                    await fetchMatchingsForDesign(qualityId, typeof designIdValue === "string" ? designIdValue : "", production.matchingQuantities || []);
                }

                setCut(production.cut || 0);
            }
        } catch (error) {
            console.error("Error loading production:", error);
            alert("Failed to load production data");
            navigate("/production/list");
        } finally {
            setLoading(false);
            // Ensure ref is reset after a short delay just in case render is slow, 
            // though effect consumes it synchronously typically.
            setTimeout(() => { ignoreDesignChangeRef.current = false; }, 500);
        }
    };

    // Fetch designs when quality changes
    useEffect(() => {
        if (stockType === "Saree" && qualityId) {
            fetchDesigns(qualityId, "Saree");
        } else if (stockType === "Taka" && takaQualityId) {
            fetchDesigns(takaQualityId, "Taka");
        } else {
            setAvailableDesigns([]);
            setTakaAvailableDesigns([]);
            setDesignId("");
            setTakaDesignId("");
        }
    }, [qualityId, takaQualityId, stockType]);

    // Fetch matchings when design changes (Saree only)
    useEffect(() => {
        if (ignoreDesignChangeRef.current) {
            ignoreDesignChangeRef.current = false;
            return;
        }

        if (stockType === "Saree" && qualityId && designId) {
            fetchMatchingsForDesign(qualityId, designId);
        } else {
            setMatchingQuantities([]);
            setCut(0);
        }
    }, [designId, qualityId, stockType]);

    const fetchDesigns = async (qualityId: string, type: "Taka" | "Saree") => {
        try {
            const catalogEntries = await getCatalogByQuality(qualityId);

            if (catalogEntries.length > 0) {
                // Get unique designs
                const designMap = new Map();
                catalogEntries.forEach((entry: any) => {
                    if (entry.designId && !designMap.has(entry.designId._id || entry.designId)) {
                        const design = typeof entry.designId === "object" ? entry.designId : null;
                        if (design) {
                            designMap.set(design._id || design, design);
                        }
                    }
                });

                const designs = Array.from(designMap.values());
                if (type === "Taka") {
                    setTakaAvailableDesigns(designs);
                } else {
                    setAvailableDesigns(designs);
                }
            }
        } catch (error) {
            console.error("Error fetching designs:", error);
        }
    };

    const fetchMatchingsForDesign = async (qualityId: string, designId: string, existingQuantities?: MatchingQuantity[]) => {
        try {
            const catalogEntries = await getCatalogByQuality(qualityId);

            // Filter catalog entries by the selected design
            const designEntries = catalogEntries.filter((entry: any) => {
                const entryDesignId = typeof entry.designId === "object"
                    ? (entry.designId._id || entry.designId.id)
                    : entry.designId;
                return entryDesignId === designId;
            });

            if (designEntries.length > 0) {
                // Get unique matchings for this specific design
                const matchingMap = new Map();

                // Helper to normalize ID
                const getNormalizedId = (objOrStr: any) => {
                    if (!objOrStr) return "";
                    return typeof objOrStr === 'object' ? (objOrStr._id || objOrStr.id) : objOrStr;
                };

                designEntries.forEach((entry: any) => {
                    if (entry.matchingId) {
                        const matching = typeof entry.matchingId === "object" ? entry.matchingId : null;
                        if (matching) {
                            const matchingIdStr = matching._id || matching.id || matching;
                            if (!matchingMap.has(matchingIdStr)) {
                                // Check if we have an existing value for this matching
                                let existingQty = 0;
                                if (existingQuantities) {
                                    const found = existingQuantities.find(eq => getNormalizedId(eq.matchingId) === matchingIdStr);
                                    if (found) existingQty = found.quantity;
                                }

                                matchingMap.set(matchingIdStr, {
                                    matchingId: matchingIdStr,
                                    matchingName: matching.matchingName || "",
                                    quantity: existingQty
                                });
                            }
                        }
                    }
                });

                // If no matchings found (e.g. Grey fabric), create a default 'Standard' matching
                if (matchingMap.size === 0) {
                    // Check if current designEntries imply we should have one (i.e. we found catalog entries)
                    // Synthesize a matching
                    let existingQty = 0;
                    if (existingQuantities && existingQuantities.length > 0) {
                        existingQty = existingQuantities[0].quantity;
                    }

                    matchingMap.set("standard_matching", {
                        matchingId: null as any,
                        matchingName: "Standard",
                        quantity: existingQty
                    });
                }

                setMatchingQuantities(Array.from(matchingMap.values()));

                // Get cut from first entry of this design
                setCut(designEntries[0].cut || 0);
            }
        } catch (error) {
            console.error("Error fetching matchings:", error);
        }
    };

    const handleAddTaka = () => {
        if (!currentTakaNo.trim() || !currentMeter || parseFloat(currentMeter) <= 0) {
            return;
        }

        setTakaDetails([
            ...takaDetails,
            {
                takaNo: currentTakaNo.trim(),
                meter: parseFloat(currentMeter)
            }
        ]);
        setCurrentTakaNo("");
        setCurrentMeter("");

        // Focus back to taka number input
        setTimeout(() => {
            takaNoRef.current?.focus();
        }, 0);
    };

    const handleRemoveTaka = (index: number) => {
        setTakaDetails(takaDetails.filter((_, i) => i !== index));
    };

    const handleTakaNoKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            meterRef.current?.focus();
        }
    };

    const handleMeterKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            handleAddTaka();
        } else if (e.key === "Enter") {
            handleAddTaka();
        }
    };

    const handleMatchingQuantityChange = (matchingId: string, quantity: number) => {
        setMatchingQuantities(
            matchingQuantities.map((mq) =>
                mq.matchingId === matchingId ? { ...mq, quantity } : mq
            )
        );
    };

    const calculateTakaTotalMeters = () => {
        return takaDetails.reduce((sum, detail) => sum + detail.meter, 0);
    };

    const calculateTakaTotalTaka = () => {
        return takaDetails.length;
    };

    const calculateSareeTotalSaree = () => {
        return matchingQuantities.reduce((sum, mq) => sum + mq.quantity, 0);
    };

    const calculateSareeTotalMeters = () => {
        return calculateSareeTotalSaree() * cut;
    };

    const submitProduction = async (resetForNextDesign: boolean = false) => {
        console.log("submitProduction executing. Reset:", resetForNextDesign);
        console.log("Form State:", { factoryId, date, stockType, qualityId, designId });

        if (!factoryId || !date) {
            alert(`Please fill in required fields: ${!factoryId ? "Factory " : ""}${!date ? "Date" : ""}`);
            return;
        }

        try {
            setLoading(true);

            const payload: any = {
                date,
                factoryId,
                stockType
            };

            if (stockType === "Taka") {
                console.log("Validating Taka Mode. Details Count:", takaDetails.length);
                console.log("Taka Details Data:", takaDetails);
                if (!takaQualityId) {
                    console.log("Validation Failed: No Taka Quality");
                    alert("Please select a quality");
                    setLoading(false);
                    return;
                }
                if (!takaDesignId) {
                    console.log("Validation Failed: No Taka Design");
                    alert("Please select a design");
                    setLoading(false);
                    return;
                }
                if (takaDetails.length === 0) {
                    console.log("Validation Failed: No Taka Details");
                    if (currentTakaNo || currentMeter) {
                        alert("You have entered Taka Details but haven't clicked 'ADD'. Please add the taka to the list before saving.");
                    } else {
                        alert("Please add at least one taka detail to the list.");
                    }
                    setLoading(false);
                    return;
                }
                payload.qualityId = takaQualityId;
                payload.designId = takaDesignId;
                payload.takaDetails = takaDetails;
                payload.totalMeters = calculateTakaTotalMeters();
            } else {
                console.log("Validating Saree Mode. MQ Count:", matchingQuantities.length);
                console.log("MQ Data:", matchingQuantities);

                if (!qualityId) {
                    console.log("Validation Failed: No Quality");
                    alert("Please select a quality");
                    setLoading(false);
                    return;
                }
                if (!designId) {
                    console.log("Validation Failed: No Design");
                    alert("Please select a design");
                    setLoading(false);
                    return;
                }
                if (matchingQuantities.length === 0) {
                    console.log("Validation Failed: No Matching Quantities");
                    alert("No matching quantities found. Please check your catalog or design.");
                    setLoading(false);
                    return;
                }
                // Check if at least one quantity is > 0
                const activeMatchings = matchingQuantities.filter((mq) => mq.quantity > 0);
                console.log("Active Matchings (Qty > 0):", activeMatchings.length);

                if (activeMatchings.length === 0) {
                    console.log("Validation Failed: All quantities are 0");
                    alert("Please enter a quantity for at least one matching.");
                    setLoading(false);
                    return;
                }

                payload.qualityId = qualityId;
                payload.designId = designId;
                payload.matchingQuantities = activeMatchings;
                payload.cut = cut;
                payload.totalSaree = calculateSareeTotalSaree();
                payload.totalMeters = calculateSareeTotalMeters();
            }
            console.log("Validation Passed. Payload:", payload);
            console.log("Initiating API call...");

            if (isEditMode) {
                console.log("Updating production...");
                await updateProduction(id!, payload);
                alert("Production updated successfully!");
                navigate("/production/list");
            } else {
                console.log("Creating production...");

                // Add Timeout race to detect hangs
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Request timed out after 5 seconds")), 5000)
                );

                try {
                    const response = await Promise.race([
                        createProduction(payload),
                        timeoutPromise
                    ]);
                    console.log("API Call Successful. Response:", response);
                } catch (apiError: any) {
                    console.error("API Call FAILED:", apiError);
                    alert(`API Error: ${apiError.message || "Unknown error"}`);
                    setLoading(false);
                    return;
                }

                if (resetForNextDesign) {
                    // Logic to find and select next design
                    let nextDesignId = "";
                    let nextDesignNumber = "";
                    let hasNext = false;

                    if (stockType === "Taka") {
                        const currentIndex = takaAvailableDesigns.findIndex(d => (d._id || d.id) === takaDesignId);
                        if (currentIndex !== -1 && takaAvailableDesigns.length > 0) {
                            const nextIndex = (currentIndex + 1) % takaAvailableDesigns.length;
                            const nextDesign = takaAvailableDesigns[nextIndex];
                            nextDesignId = nextDesign._id || nextDesign.id;
                            nextDesignNumber = nextDesign.designNumber;
                            hasNext = true;
                        }
                    } else {
                        const currentIndex = availableDesigns.findIndex(d => (d._id || d.id) === designId);
                        if (currentIndex !== -1 && availableDesigns.length > 0) {
                            const nextIndex = (currentIndex + 1) % availableDesigns.length;
                            const nextDesign = availableDesigns[nextIndex];
                            nextDesignId = nextDesign._id || nextDesign.id;
                            nextDesignNumber = nextDesign.designNumber;
                            hasNext = true;
                        }
                    }

                    if (hasNext) {
                        alert(`Saved! Switching to next design: ${nextDesignNumber}`);

                        // Reset fields but set new design
                        if (stockType === "Taka") {
                            setTakaDesignId(nextDesignId);
                            setTakaDetails([]);
                            setCurrentTakaNo("");
                            setCurrentMeter("");

                            // Focus back to taka number input
                            setTimeout(() => {
                                takaNoRef.current?.focus();
                            }, 100);
                        } else {
                            console.log("Switching to next design ID:", nextDesignId);
                            setMatchingQuantities([]); // Clear immediately to avoid stale data render
                            setCut(0);
                            setDesignId(nextDesignId); // Will trigger effect
                        }
                    } else {
                        alert("Saved! No more designs available for this quality.");
                        navigate("/production/list");
                    }
                } else {
                    navigate("/production/list");
                }
            }
        } catch (error) {
            console.error(`Error ${isEditMode ? "updating" : "creating"} production:`, error);
            alert(`Failed to ${isEditMode ? "update" : "create"} production entry`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitProduction(false);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEditMode ? "Edit Production Entry" : "Production Entry Form"}
                subtitle={isEditMode ? "Update production entry details" : "Record daily production for Taka or Saree"}
            />

            <form onSubmit={handleSubmit} noValidate>
                <Card>
                    <CardContent className="pt-6 space-y-6">
                        {/* Date */}
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

                        {/* Factory */}
                        <div>
                            <Label htmlFor="factory">Factory*</Label>
                            <select
                                id="factory"
                                value={factoryId}
                                onChange={(e) => setFactoryId(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                required
                            >
                                <option value="">Select Factory</option>
                                {factories.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.factoryName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Stock Type Toggle */}
                        <div>
                            <Label>Stock Type*</Label>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <Button
                                    type="button"
                                    variant={stockType === "Taka" ? "primary" : "secondary"}
                                    onClick={() => setStockType("Taka")}
                                    className="w-full"
                                >
                                    Taka
                                </Button>
                                <Button
                                    type="button"
                                    variant={stockType === "Saree" ? "primary" : "secondary"}
                                    onClick={() => setStockType("Saree")}
                                    className="w-full"
                                >
                                    Saree
                                </Button>
                            </div>
                        </div>

                        {/* TAKA MODE */}
                        {stockType === "Taka" && (
                            <>
                                <div>
                                    <Label htmlFor="takaQuality">Quality*</Label>
                                    <select
                                        id="takaQuality"
                                        value={takaQualityId}
                                        onChange={(e) => setTakaQualityId(e.target.value)}
                                        className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                        required
                                    >
                                        <option value="">Select Quality</option>
                                        {qualities.map((q) => (
                                            <option key={q.id} value={q.id}>
                                                {q.fabricName} - {q.loomType} - {q.fabricType}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Design Selection for Taka */}
                                {takaQualityId && takaAvailableDesigns.length > 0 && (
                                    <div>
                                        <Label htmlFor="takaDesign">Design Number*</Label>
                                        <select
                                            id="takaDesign"
                                            value={takaDesignId}
                                            onChange={(e) => setTakaDesignId(e.target.value)}
                                            className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                            required
                                        >
                                            <option value="">Select Design</option>
                                            {takaAvailableDesigns.map((d: any) => (
                                                <option key={d._id || d.id} value={d._id || d.id}>
                                                    {d.designNumber} {d.designName ? `- ${d.designName}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="border border-slate-200 dark:border-white/10 rounded-lg p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold">Taka Details</h3>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleAddTaka}
                                        >
                                            ADD
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="takaNo">Taka No.*</Label>
                                            <Input
                                                id="takaNo"
                                                ref={takaNoRef}
                                                value={currentTakaNo}
                                                onChange={(e) => setCurrentTakaNo(e.target.value)}
                                                onKeyDown={handleTakaNoKeyDown}
                                                placeholder="Enter taka number"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="meter">Meter*</Label>
                                            <Input
                                                id="meter"
                                                ref={meterRef}
                                                type="number"
                                                step="0.01"
                                                value={currentMeter}
                                                onChange={(e) => setCurrentMeter(e.target.value)}
                                                onKeyDown={handleMeterKeyDown}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Taka Details List */}
                                    {takaDetails.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-slate-400">Added Takas:</h4>
                                            {takaDetails.map((detail, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between bg-surface-300 rounded px-3 py-2"
                                                >
                                                    <span>
                                                        {detail.takaNo} - {detail.meter.toFixed(2)} m
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTaka(index)}
                                                        className="text-red-400 hover:text-red-300 text-xl p-2"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label>Total Taka</Label>
                                    <Input
                                        value={calculateTakaTotalTaka()}
                                        readOnly
                                        className="bg-surface-300"
                                    />
                                </div>

                                <div>
                                    <Label>Total Meters</Label>
                                    <Input
                                        value={calculateTakaTotalMeters().toFixed(2)}
                                        readOnly
                                        className="bg-surface-300"
                                    />
                                </div>
                            </>
                        )}

                        {/* SAREE MODE */}
                        {stockType === "Saree" && (
                            <>
                                <div>
                                    <Label htmlFor="quality">Quality*</Label>
                                    <select
                                        id="quality"
                                        value={qualityId}
                                        onChange={(e) => setQualityId(e.target.value)}
                                        className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                        required
                                    >
                                        <option value="">Select Quality</option>
                                        {qualities
                                            .filter(q => q.loomType && q.loomType.toLowerCase() === "rapier")
                                            .map((q) => (
                                                <option key={q.id} value={q.id}>
                                                    {q.fabricName} - {q.loomType} - {q.fabricType}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {qualityId && (
                                    <>
                                        <div>
                                            <Label htmlFor="design">Design No.*</Label>
                                            <select
                                                id="design"
                                                value={designId}
                                                onChange={(e) => setDesignId(e.target.value)}
                                                className="flex h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-surface-200 px-3 py-2 text-sm text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2"
                                                required
                                            >
                                                <option value="">Select Design</option>
                                                {availableDesigns.map((d: any) => (
                                                    <option key={d._id || d.id} value={d._id || d.id}>
                                                        {d.designNumber} - {d.designName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {(() => {
                                            const selectedQuality = qualities.find(q => q.id === qualityId);
                                            const isGreyFabric = selectedQuality?.fabricType?.toLowerCase() === "grey";

                                            return (
                                                <>
                                                    {isGreyFabric ? (
                                                        <div className="space-y-4 pt-2">
                                                            <div>
                                                                <Label>Cut (Meters)</Label>
                                                                <Input
                                                                    value={cut || "0"}
                                                                    readOnly
                                                                    className="bg-surface-300 text-muted"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label>Total Pcs</Label>
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
                                                                                : firstMq.matchingId;
                                                                            handleMatchingQuantityChange(mId, val);
                                                                        }
                                                                    }}
                                                                    placeholder="Enter total pieces"
                                                                    className="bg-surface-200"
                                                                />
                                                                {matchingQuantities.length === 0 && (
                                                                    <p className="text-xs text-red-400 mt-1">
                                                                        No matching found in catalog. Please check design setup.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {matchingQuantities.length > 0 && (
                                                                <div className="space-y-4">
                                                                    <h3 className="font-semibold text-lg">Matching Quantities</h3>
                                                                    {matchingQuantities.map((mq, idx) => {
                                                                        if (!mq) return null;
                                                                        const mId = typeof mq.matchingId === 'object'
                                                                            ? (mq.matchingId as any)._id || (mq.matchingId as any).id
                                                                            : mq.matchingId;
                                                                        const key = mId || `mq-${idx}`;

                                                                        return (
                                                                            <div key={key}>
                                                                                <Label htmlFor={`matching-${key}`}>
                                                                                    {mq.matchingName || "Unknown Matching"}
                                                                                </Label>
                                                                                <Input
                                                                                    id={`matching-${key}`}
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
                                                            )}

                                                            <div>
                                                                <Label htmlFor="cut">Cut*</Label>
                                                                <Input
                                                                    id="cut"
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={cut}
                                                                    onChange={(e) => setCut(parseFloat(e.target.value) || 0)}
                                                                    placeholder="0.00"
                                                                    required
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
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate("/production/list")}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    submitProduction(false);
                                }}
                                disabled={loading}
                            >
                                {loading ? "Saving..." : isEditMode ? "Update Production" : "Save Production"}
                            </Button>
                            {!isEditMode && (
                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        submitProduction(true);
                                    }}
                                    disabled={loading}
                                    variant="secondary"
                                    className="bg-gradient-to-r from-neon-cyan to-neon-purple text-white border-0"
                                >
                                    Add & Next Design
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
