import { Inventory } from "../models/Inventory.js";
import mongoose from "mongoose";

// GET /api/inventory?factory=X&quality=Y&design=Z&type=Taka
export const getInventory = async (req, res, next) => {
    try {
        const { factory, quality, design, type } = req.query;

        const filter = {};
        if (factory) filter.factoryId = factory;
        if (quality) filter.qualityId = quality;
        if (design) filter.designId = design;
        if (type) filter.type = type;

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
            const inventory = await Inventory.findOne({
                qualityId: item.qualityId,
                designId: item.designId,
                type: "Taka",
            })
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
                    const inventory = await Inventory.findOne({
                        qualityId: item.qualityId,
                        designId: item.designId,
                        matchingId: mq.matchingId,
                        type: "Saree",
                        cut: item.cut,
                    })
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
export async function deductInventoryForOrder(lineItems, session = null) {
    for (const item of lineItems) {
        const type = item.quantityType || item.catalogType;

        if (type === "Taka") {
            await Inventory.findOneAndUpdate(
                {
                    qualityId: item.qualityId,
                    designId: item.designId,
                    type: "Taka",
                },
                {
                    $inc: { totalMetersOrdered: item.quantity || 0 },
                },
                { session }
            );
        } else if (type === "Meter" || type === "Saree") {
            for (const mq of item.matchingQuantities || []) {
                await Inventory.findOneAndUpdate(
                    {
                        qualityId: item.qualityId,
                        designId: item.designId,
                        matchingId: mq.matchingId,
                        type: "Saree",
                        cut: item.cut,
                    },
                    {
                        $inc: { totalSareeOrdered: mq.quantity || 0 },
                    },
                    { session }
                );
            }
        }
    }
}

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
