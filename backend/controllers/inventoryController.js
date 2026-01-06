import { Inventory } from "../models/Inventory.js";
import mongoose from "mongoose";

// GET /api/inventory?factory=X&quality=Y&design=Z&type=Taka
export const getInventory = async (req, res, next) => {
    try {
        const { factory, quality, design, type, fromDate, toDate } = req.query;

        const filter = {};
        if (factory) filter.factoryId = factory;
        if (quality) filter.qualityId = quality;
        if (design) filter.designId = design;
        if (type) filter.type = type;

        // Apply date filter (Active in period)
        if (fromDate || toDate) {
            filter.updatedAt = {};
            if (fromDate) filter.updatedAt.$gte = new Date(fromDate);
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                filter.updatedAt.$lte = endOfDay;
            }
        }

        const inventoryItems = await Inventory.find(filter)
            .populate("qualityId", "fabricName")
            .populate("designId", "designNumber designName")
            .populate("factoryId", "factoryName")
            .populate("matchingId", "matchingName")
            .sort({ qualityId: 1, designId: 1 });

        // Convert to JSON to include virtual fields and sanitize bad data
        const itemsWithVirtuals = inventoryItems.map((item) => {
            const json = item.toJSON();
            // Sanity check: If Ordered Taka Count matches Ordered Meters (corruption) and is unrealistically high
            if (json.type === "Taka" && json.totalTakaOrdered > 20 && Math.abs(json.totalTakaOrdered - json.totalMetersOrdered) < 5) {
                // Heuristic Correction: Estimate correct Taka count based on average roll length
                const avgLen = (json.totalMetersProduced && json.totalTakaProduced)
                    ? (json.totalMetersProduced / json.totalTakaProduced)
                    : 100; // Default fallback

                const estimatedOrdered = Math.round(json.totalMetersOrdered / avgLen);

                json.totalTakaOrdered = estimatedOrdered;
                json.availableTaka = Math.max(0, (json.totalTakaProduced || 0) - estimatedOrdered);
            }
            return json;
        });

        res.json(itemsWithVirtuals);
    } catch (error) {
        next(error);
    }
};

// GET /api/inventory/:id
export const getInventoryById = async (req, res, next) => {
    try {
        const inventory = await Inventory.findById(req.params.id)
            .populate("qualityId")
            .populate("designId")
            .populate("factoryId")
            .populate("matchingId");

        if (!inventory) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        res.json(inventory.toJSON());
    } catch (error) {
        next(error);
    }
};

// POST /api/inventory/validate
// Body: { lineItems: [...] }
export const validateOrderStock = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const { lineItems } = req.body;

        if (!lineItems || lineItems.length === 0) {
            return res.json({ valid: true, insufficientItems: [] });
        }

        const result = await validateStockAvailability(lineItems, session);

        res.json(result);
    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
};

// Helper function to validate stock availability for order line items
export async function validateStockAvailability(lineItems, session) {
    const insufficientItems = [];

    for (const item of lineItems) {
        const type = item.quantityType || item.catalogType;

        if (type === "Taka") {
            // Validate Taka stock
            const query = {
                qualityId: item.qualityId,
                designId: item.designId,
                type: "Taka",
            };
            if (item.factoryId) query.factoryId = item.factoryId;

            const inventory = await Inventory.findOne(query)
                .populate("qualityId", "fabricName")
                .populate("designId", "designNumber")
                .session(session);

            const required = item.quantity || 0; // meters
            const available = inventory ? inventory.availableMeters : 0;

            if (available < required) {
                insufficientItems.push({
                    qualityId: item.qualityId,
                    qualityName: inventory?.qualityId?.fabricName || "Unknown",
                    type: "Taka",
                    required: required,
                    available: available,
                    shortage: required - available,
                });
            }
        } else if (type === "Meter" || type === "Saree") {
            // Validate Saree stock - check each matching quantity
            if (item.matchingQuantities && item.matchingQuantities.length > 0) {
                for (const mq of item.matchingQuantities) {
                    const query = {
                        qualityId: item.qualityId,
                        designId: item.designId,
                        matchingId: mq.matchingId,
                        type: "Saree",
                        cut: item.cut,
                    };
                    if (item.factoryId) query.factoryId = item.factoryId;

                    const inventory = await Inventory.findOne(query)
                        .populate("qualityId", "fabricName")
                        .populate("designId", "designNumber")
                        .populate("matchingId", "matchingName")
                        .session(session);

                    const required = mq.quantity || 0; // saree pieces
                    const available = inventory ? inventory.availableSaree : 0;

                    if (available < required) {
                        insufficientItems.push({
                            qualityId: item.qualityId,
                            designId: item.designId,
                            matchingId: mq.matchingId,
                            qualityName: inventory?.qualityId?.fabricName || "Unknown",
                            designNumber: inventory?.designId?.designNumber || "Unknown",
                            matchingName: inventory?.matchingId?.matchingName || "Unknown",
                            cut: item.cut,
                            type: "Saree",
                            required: required,
                            available: available,
                            shortage: required - available,
                        });
                    }
                }
            }
        }
    }

    return {
        valid: insufficientItems.length === 0,
        insufficientItems: insufficientItems,
    };
}

// Helper function to update stock after production
export async function updateInventoryFromProduction(
    production,
    session = null
) {
    if (production.stockType === "Taka" || production.stockType === "Taka-Pic") {
        // Update Taka inventory
        await Inventory.findOneAndUpdate(
            {
                qualityId: production.qualityId,
                designId: production.designId,
                factoryId: production.factoryId,
                type: "Taka",
            },
            {
                $inc: {
                    totalMetersProduced: production.totalMeters || 0,
                    totalTakaProduced: production.takaDetails ? production.takaDetails.length : 0
                },
            },
            { upsert: true, session }
        );
    } else if (
        production.stockType === "Saree" ||
        production.stockType === "Taka-Meter"
    ) {
        // Update Saree inventory
        for (const mq of production.matchingQuantities || []) {
            await Inventory.findOneAndUpdate(
                {
                    qualityId: production.qualityId,
                    designId: production.designId,
                    factoryId: production.factoryId,
                    matchingId: mq.matchingId,
                    type: "Saree",
                    cut: production.cut,
                },
                {
                    $inc: { totalSareeProduced: mq.quantity || 0 },
                },
                { upsert: true, session }
            );
        }
    }
}

// Helper function to deduct stock after order
// Helper function to deduct stock after order
// Helper function to reserve stock when order is placed
export async function reserveInventoryForOrder(lineItems, session = null) {
    const METERS_PER_TAKA = 120;
    for (const item of lineItems) {
        const type = item.quantityType || item.catalogType;

        if (type === "Taka") {
            // Calculate quantities
            let qtyMeters = 0;
            let qtyTaka = 0;

            if (item.quantityType === "Taka") {
                qtyTaka = item.quantity || 0;
                qtyMeters = qtyTaka * METERS_PER_TAKA;
            } else {
                qtyMeters = item.quantity || 0;
                qtyTaka = Math.round(qtyMeters / METERS_PER_TAKA);
            }

            // Find best inventory to reserve (this is just for tracking, doesn't lock specific items)
            const query = {
                qualityId: item.qualityId,
                designId: item.designId,
                type: "Taka",
            };
            if (item.factoryId) query.factoryId = item.factoryId;

            const candidates = await Inventory.find(query).sort({ availableMeters: -1 }).session(session);

            const target = candidates[0]; // Pick best or undefined

            if (target) {
                console.log(`[Reserve] Updating inventory ${target._id} for Quality ${item.qualityId}`);
                await Inventory.findByIdAndUpdate(
                    target._id,
                    {
                        $inc: {
                            totalMetersOrdered: qtyMeters,
                            totalTakaOrdered: qtyTaka
                        },
                    },
                    { session }
                );
            } else {
                console.log(`[Reserve] Creating NEW inventory for Quality ${item.qualityId} Factory ${item.factoryId}`);
                // If no inventory exists, create a placeholder to track this shortage
                await Inventory.create([{
                    qualityId: item.qualityId,
                    designId: item.designId,
                    type: "Taka",
                    totalMetersOrdered: qtyMeters,
                    totalTakaOrdered: qtyTaka,
                    factoryId: item.factoryId // FIXED: Pass factoryId
                }], { session });
            }

        } else if (type === "Meter" || type === "Saree") {
            for (const mq of item.matchingQuantities || []) {
                const query = {
                    qualityId: item.qualityId,
                    designId: item.designId,
                    matchingId: mq.matchingId,
                    type: "Saree",
                    cut: item.cut,
                };
                if (item.factoryId) query.factoryId = item.factoryId;

                const candidates = await Inventory.find(query).sort({ availableSaree: -1 }).session(session);

                let target = candidates[0];

                if (target) {
                    console.log(`[Reserve] Updating Saree inventory ${target._id}`);
                    await Inventory.findByIdAndUpdate(
                        target._id,
                        {
                            $inc: { totalSareeOrdered: mq.quantity || 0 }, // Increase Ordered
                        },
                        { session }
                    );
                } else {
                    console.log(`[Reserve] Creating NEW Saree inventory`);
                    await Inventory.create([{
                        qualityId: item.qualityId,
                        designId: item.designId,
                        matchingId: mq.matchingId,
                        type: "Saree",
                        cut: item.cut,
                        totalSareeOrdered: mq.quantity || 0,
                        factoryId: item.factoryId // FIXED: Pass factoryId
                    }], { session });
                }
            }
        }
    }
    console.log("[Reserve] Completed reservation");
}

// DELETE /api/inventory/:id
// DELETE /api/inventory/:id
export const deleteInventory = async (req, res, next) => {
    try {
        const inventory = await Inventory.findByIdAndDelete(req.params.id);

        if (!inventory) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        res.json({ message: "Inventory item deleted successfully", id: req.params.id });
    } catch (error) {
        next(error);
    }
};

// POST /api/inventory/recalculate
export const recalculateInventory = async (req, res, next) => {
    try {
        // Dynamic imports to avoid circular deps or bloat if not needed
        const { Production } = await import("../models/Production.js");
        const { Challan } = await import("../models/Challan.js");
        const { Order } = await import("../models/Order.js");
        const { StockPiece } = await import("../models/StockPiece.js");

        console.log("[Recalculate] Starting full inventory recalculation...");

        // 1. Fetch Data
        const productions = await Production.find({});
        const challans = await Challan.find({});
        const orders = await Order.find({ status: { $ne: "completed" } }); // Only pending/partial orders contribute to Reserved

        console.log(`[Recalculate] Fetched ${productions.length} productions, ${challans.length} challans, ${orders.length} active orders.`);

        // 2. Build Inventory Map
        const invMap = {}; // inventoryId -> { doc, calculated: { ... } }
        const keyToIds = {}; // key -> [inventoryId]

        const getInvKey = (type, q, d, f, m, cut) => {
            return `${type}|${q}|${d || ''}|${f || ''}|${m || ''}|${cut || ''}`;
        };

        const allInventory = await Inventory.find({});
        for (const inv of allInventory) {
            invMap[inv._id.toString()] = {
                doc: inv,
                calculated: {
                    totalMetersProduced: 0,
                    totalTakaProduced: 0,
                    totalSareeProduced: 0,
                    totalMetersOrdered: 0,
                    totalTakaOrdered: 0,
                    totalSareeOrdered: 0
                }
            };

            const key = getInvKey(
                inv.type,
                inv.qualityId?.toString(),
                inv.designId?.toString(),
                inv.factoryId?.toString(),
                inv.matchingId?.toString(),
                inv.cut
            );
            if (!keyToIds[key]) keyToIds[key] = [];
            keyToIds[key].push(inv._id.toString());
        }

        // 3. Process Productions
        for (const p of productions) {
            let key = "";
            let qtyMeters = p.totalMeters || 0;
            let qtyTaka = p.takaDetails ? p.takaDetails.length : 0;

            if (p.stockType === "Taka" || p.stockType === "Taka-Pic") {
                key = getInvKey("Taka", p.qualityId?.toString(), p.designId?.toString(), p.factoryId?.toString(), null, null);
                const ids = keyToIds[key];
                if (ids && ids.length > 0) {
                    invMap[ids[0]].calculated.totalMetersProduced += qtyMeters;
                    invMap[ids[0]].calculated.totalTakaProduced += qtyTaka;
                }
            } else if (p.stockType === "Saree") {
                for (const mq of p.matchingQuantities) {
                    key = getInvKey("Saree", p.qualityId?.toString(), p.designId?.toString(), p.factoryId?.toString(), mq.matchingId?.toString(), p.cut);
                    const ids = keyToIds[key];
                    if (ids && ids.length > 0) {
                        invMap[ids[0]].calculated.totalSareeProduced += (mq.quantity || 0);
                    }
                }
            }
        }

        // 4. Process Challans
        for (const c of challans) {
            for (const item of c.items) {
                const type = item.type;
                let toDeduct = item.challanQuantity || 0;
                let toDeductTaka = item.selectedPieces ? item.selectedPieces.length : 0;

                const baseValues = Object.values(invMap).map(x => x).filter(data => {
                    const i = data.doc;
                    if (type === "Taka") {
                        return i.type === "Taka" &&
                            i.qualityId?.toString() === item.qualityId?.toString() &&
                            i.designId?.toString() === item.designId?.toString();
                    }
                    return false;
                });

                if (type === "Taka") {
                    let matchingCandidates = baseValues.sort((a, b) => b.calculated.totalMetersProduced - a.calculated.totalMetersProduced);

                    // Total amount we need to deduct for this item line
                    const totalChallanMeters = item.challanQuantity || 0;
                    const totalChallanPieces = item.selectedPieces ? item.selectedPieces.length : 0;

                    for (const cand of matchingCandidates) {
                        if (toDeduct <= 0) break;

                        // We deduct from 'Produced' because Produced represents "Stock on Hand" in this model
                        const available = cand.calculated.totalMetersProduced;
                        const taking = Math.min(available, toDeduct);

                        let piecesTaking = 0;
                        if (toDeductTaka > 0) {
                            if (taking >= toDeduct - 0.01) {
                                // Taking the remainder -> take all remaining pieces
                                piecesTaking = toDeductTaka;
                            } else {
                                // Proportional
                                const ratio = totalChallanMeters > 0 ? (taking / totalChallanMeters) : 0;
                                piecesTaking = Math.round(ratio * totalChallanPieces);
                                piecesTaking = Math.min(piecesTaking, toDeductTaka); // Clamp
                            }
                        }

                        if (taking > 0) {
                            cand.calculated.totalMetersProduced -= taking;
                            cand.calculated.totalTakaProduced -= piecesTaking;

                            toDeduct -= taking;
                            toDeductTaka -= piecesTaking;
                        }
                    }
                } else if (type === "Saree") {
                    for (const mq of item.matchingQuantities || []) {
                        let mqDeduct = mq.challanQuantity || 0;
                        let mqCandidates = Object.values(invMap).filter(data => {
                            const i = data.doc;
                            return i.type === "Saree" &&
                                i.qualityId?.toString() === item.qualityId?.toString() &&
                                i.designId?.toString() === item.designId?.toString() &&
                                i.matchingId?.toString() === mq.matchingId?.toString() &&
                                i.cut === item.cut;
                        }).sort((a, b) => b.calculated.totalSareeProduced - a.calculated.totalSareeProduced);

                        for (const cand of mqCandidates) {
                            if (mqDeduct <= 0) break;
                            const available = cand.calculated.totalSareeProduced;
                            const taking = Math.min(available, mqDeduct);
                            if (taking > 0) {
                                cand.calculated.totalSareeProduced -= taking;
                                mqDeduct -= taking;
                            }
                        }
                    }
                }
            }
        }

        // 5. Process Orders
        for (const o of orders) {
            for (const item of o.lineItems) {
                const type = item.quantityType || item.catalogType;
                let pendingQty = 0;

                if (type === "Taka") {
                    const METERS_PER_TAKA = 120;
                    const pendingRaw = Math.max(0, (item.quantity || 0) - (item.dispatchedQuantity || 0));

                    let pendingQty = 0; // Meters
                    let pendingTaka = 0;

                    if (item.quantityType === "Taka") {
                        pendingTaka = pendingRaw;
                        pendingQty = pendingRaw * METERS_PER_TAKA;
                    } else {
                        pendingQty = pendingRaw;
                        pendingTaka = Math.round(pendingQty / METERS_PER_TAKA);
                    }

                    if (pendingQty > 0 || pendingTaka > 0) {
                        const qId = item.qualityId?.toString();
                        const dId = item.designId?.toString();
                        const fId = item.factoryId?.toString();

                        let candidates = Object.values(invMap).filter(data => {
                            const i = data.doc;
                            return i.type === "Taka" &&
                                i.qualityId?.toString() === qId &&
                                i.designId?.toString() === dId &&
                                (!fId || i.factoryId?.toString() === fId);
                        }).sort((a, b) => {
                            const availA = a.calculated.totalMetersProduced - a.calculated.totalMetersOrdered;
                            const availB = b.calculated.totalMetersProduced - b.calculated.totalMetersOrdered;
                            return availB - availA;
                        });

                        if (candidates.length > 0) {
                            candidates[0].calculated.totalMetersOrdered += pendingQty;
                            candidates[0].calculated.totalTakaOrdered += pendingTaka;
                        }
                    }
                } else {
                    for (const mq of item.matchingQuantities) {
                        pendingQty = Math.max(0, (mq.quantity || 0) - (mq.dispatchedQuantity || 0));
                        if (pendingQty > 0) {
                            const qId = item.qualityId?.toString();
                            const dId = item.designId?.toString();
                            const fId = item.factoryId?.toString();
                            const mId = mq.matchingId?.toString();
                            const cut = item.cut;

                            let candidates = Object.values(invMap).filter(data => {
                                const i = data.doc;
                                return i.type === "Saree" &&
                                    i.qualityId?.toString() === qId &&
                                    i.designId?.toString() === dId &&
                                    i.matchingId?.toString() === mId &&
                                    i.cut === cut &&
                                    (!fId || i.factoryId?.toString() === fId);
                            }).sort((a, b) => {
                                const availA = a.calculated.totalSareeProduced - a.calculated.totalSareeOrdered;
                                const availB = b.calculated.totalSareeProduced - b.calculated.totalSareeOrdered;
                                return availB - availA;
                            });

                            if (candidates.length > 0) {
                                candidates[0].calculated.totalSareeOrdered += pendingQty;
                            }
                        }
                    }
                }
            }
        }

        // 6. Write Changes
        let updatedCount = 0;
        for (const id in invMap) {
            const { doc, calculated } = invMap[id];

            // Normalize
            calculated.totalMetersProduced = Math.max(0, calculated.totalMetersProduced);
            calculated.totalTakaProduced = Math.max(0, calculated.totalTakaProduced);
            calculated.totalSareeProduced = Math.max(0, calculated.totalSareeProduced);
            calculated.totalMetersOrdered = Math.max(0, calculated.totalMetersOrdered);
            calculated.totalSareeOrdered = Math.max(0, calculated.totalSareeOrdered);

            if (doc.totalMetersProduced !== calculated.totalMetersProduced ||
                doc.totalTakaProduced !== calculated.totalTakaProduced ||
                doc.totalSareeProduced !== calculated.totalSareeProduced ||
                doc.totalMetersOrdered !== calculated.totalMetersOrdered ||
                doc.totalSareeOrdered !== calculated.totalSareeOrdered ||
                doc.totalTakaOrdered !== 0) {

                await Inventory.findByIdAndUpdate(id, {
                    totalMetersProduced: calculated.totalMetersProduced,
                    totalTakaProduced: calculated.totalTakaProduced,
                    totalSareeProduced: calculated.totalSareeProduced,
                    totalMetersOrdered: calculated.totalMetersOrdered,
                    totalTakaOrdered: calculated.totalTakaOrdered,
                    totalSareeOrdered: calculated.totalSareeOrdered
                });
                updatedCount++;
            }
        }

        // 7. Sync StockPieces
        const r1 = await StockPiece.updateMany(
            { challanId: null, status: { $ne: "Available" } },
            { status: "Available" }
        );
        const r2 = await StockPiece.updateMany(
            { challanId: { $ne: null }, status: { $ne: "Sold" } },
            { status: "Sold" }
        );

        console.log(`[Recalculate] Updated ${updatedCount} inventory records. Sync: ${r1.modifiedCount} Available, ${r2.modifiedCount} Sold.`);

        res.json({
            message: "Inventory recalculation completed successfully",
            stats: {
                updatedInventoryCount: updatedCount,
                syncedAvailable: r1.modifiedCount,
                syncedSold: r2.modifiedCount
            }
        });

    } catch (error) {
        console.error("Recalculation Error:", error);
        next(error);
    }
};
