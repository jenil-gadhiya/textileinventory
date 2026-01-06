import { Challan } from "../models/Challan.js";
import { Order } from "../models/Order.js";
import { Inventory } from "../models/Inventory.js";
import { StockPiece } from "../models/StockPiece.js";
import mongoose from "mongoose";

// GET /api/challans - List all challans
export const getChallans = async (req, res, next) => {
    try {
        const challans = await Challan.find()
            .populate("orderId", "orderNo")
            .populate("partyId", "partyName")
            .populate("items.qualityId", "fabricName")
            .populate("items.designId", "designNumber")
            .populate("items.matchingQuantities.matchingId", "matchingName")
            .sort({ createdAt: -1 });
        res.json(challans);
    } catch (error) {
        next(error);
    }
};

// GET /api/challans/:id - Get single challan
export const getChallan = async (req, res, next) => {
    try {
        const challan = await Challan.findById(req.params.id)
            .populate("orderId")
            .populate("partyId")
            .populate("items.qualityId")
            .populate("items.designId")
            .populate("items.matchingQuantities.matchingId");

        if (!challan) {
            return res.status(404).json({ message: "Challan not found" });
        }

        res.json(challan);
    } catch (error) {
        next(error);
    }
};

// POST /api/challans - Create challan from order
export const createChallan = async (req, res, next) => {
    try {
        const { orderId, items, ...challanData } = req.body;

        // STEP 1: Validate stock for challan quantities
        const validationResult = await validateChallanStock(items); // No session

        if (!validationResult.valid) {
            return res.status(400).json({
                message: "Insufficient stock for one or more items",
                insufficientItems: validationResult.insufficientItems,
            });
        }

        // STEP 2: Create challan
        const challan = new Challan({
            orderId,
            ...challanData,
            items,
        });
        await challan.save();

        // STEP 3: Deduct stock based on challan quantities
        await deductInventoryForChallan(items); // No session

        // STEP 4: Update order dispatch status
        await updateOrderDispatchStatus(orderId, items); // No session

        const populated = await Challan.findById(challan._id)
            .populate("orderId")
            .populate("partyId")
            .populate("items.qualityId")
            .populate("items.designId")
            .populate("items.matchingQuantities.matchingId");

        res.status(201).json(populated);
    } catch (error) {
        console.error("Error creating challan:", error);
        // Manual rollback attempt logic could be added here if needed, 
        // e.g., deleting the challan if deduction fails. 
        // For now, we rely on error logging/reporting.
        next(error);
    }
};

// PUT /api/challans/:id - Update challan
export const updateChallan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { items, ...updateData } = req.body;

        const oldChallan = await Challan.findById(id);
        if (!oldChallan) {
            return res.status(404).json({ message: "Challan not found" });
        }

        // REVERT OLD STOCK (No Session)
        // We put back the stock as if the challan never happened
        for (const item of oldChallan.items) {
            if (item.type === "Taka" && item.selectedPieces && item.selectedPieces.length > 0) {
                // Restore StockPieces
                for (const piece of item.selectedPieces) {
                    await StockPiece.findByIdAndUpdate(
                        piece.stockPieceId,
                        { status: "Available", challanId: null }
                    );
                }

                // Restore Inventory (Meters & Pieces)
                await Inventory.findOneAndUpdate(
                    {
                        qualityId: item.qualityId,
                        designId: item.designId,
                        type: "Taka"
                    },
                    {
                        $inc: {
                            totalMetersProduced: item.challanQuantity,
                            totalTakaProduced: item.selectedPieces.length,
                            totalMetersOrdered: item.challanQuantity,
                            totalTakaOrdered: item.selectedPieces.length
                        }
                    }
                );
            } else if (item.type === "Saree" && item.matchingQuantities) {
                // Restore Saree Inventory
                for (const mq of item.matchingQuantities) {
                    await Inventory.findOneAndUpdate(
                        {
                            qualityId: item.qualityId,
                            designId: item.designId,
                            matchingId: mq.matchingId,
                            type: "Saree",
                            cut: item.cut
                        },
                        {
                            $inc: {
                                totalSareeProduced: mq.challanQuantity,
                                totalSareeOrdered: mq.challanQuantity
                            }
                        }
                    );
                }
            }
        }

        // Revert order dispatched quantities temporarily
        const order = await Order.findById(oldChallan.orderId);
        if (order) {
            for (const item of oldChallan.items) {
                const orderItem = order.lineItems[item.orderLineItemIndex];
                if (orderItem) {
                    if (item.type === "Taka") {
                        orderItem.dispatchedQuantity = Math.max(0, (orderItem.dispatchedQuantity || 0) - item.challanQuantity);
                    } else if (item.matchingQuantities) {
                        for (const mq of item.matchingQuantities) {
                            const orderMq = orderItem.matchingQuantities?.find(
                                omq => omq.matchingId?.toString() === mq.matchingId?.toString()
                            );
                            if (orderMq) {
                                orderMq.dispatchedQuantity = Math.max(0, (orderMq.dispatchedQuantity || 0) - mq.challanQuantity);
                            }
                        }
                    }
                }
            }
            await order.save();
        }

        // Validate New Item Stock
        const validationResult = await validateChallanStock(items);
        if (!validationResult.valid) {
            return res.status(400).json({
                message: "Insufficient stock for one or more items",
                insufficientItems: validationResult.insufficientItems,
            });
        }

        // Apply New Stock Deduction
        await deductInventoryForChallan(items);

        // Update Order Dispatch Status with new items
        await updateOrderDispatchStatus(oldChallan.orderId, items);

        // Update Challan Document
        const updatedChallan = await Challan.findByIdAndUpdate(
            id,
            { ...updateData, items },
            { new: true }
        )
            .populate("orderId")
            .populate("partyId")
            .populate("items.qualityId")
            .populate("items.designId")
            .populate("items.matchingQuantities.matchingId");

        res.json(updatedChallan);

    } catch (error) {
        next(error);
    }
};

// DELETE /api/challans/:id - Delete challan and reverse inventory
export const deleteChallan = async (req, res, next) => {
    try {
        const challan = await Challan.findById(req.params.id);
        if (!challan) {
            return res.status(404).json({ message: "Challan not found" });
        }

        // Reverse inventory deductions (Add back logic)
        for (const item of challan.items) {
            if (item.type === "Taka") {
                if (item.selectedPieces && item.selectedPieces.length > 0) {
                    // Restore StockPieces back to Available status
                    for (const piece of item.selectedPieces) {
                        await StockPiece.findByIdAndUpdate(
                            piece.stockPieceId,
                            { status: "Available", challanId: null }
                        );
                    }
                }

                // Restore Main Inventory
                const totalMeters = item.challanQuantity;
                const totalPieces = item.selectedPieces ? item.selectedPieces.length : 0; // Use selectedPieces length if available, else 0? Or assume manual?
                // Note: If manual entry without pieces selected (legacy?), totalPieces might be 0.

                // We use findOneAndUpdate without factoryId, it will pick one match.
                // Ideally this should be distributed or tracked, but for now this restores the global count.
                await Inventory.findOneAndUpdate(
                    {
                        qualityId: item.qualityId,
                        designId: item.designId,
                        type: "Taka"
                    },
                    {
                        $inc: {
                            totalMetersProduced: totalMeters,
                            totalTakaProduced: totalPieces,
                            // CRITICAL: We also add back to "Ordered" because the order is no longer dispatched, 
                            // so it reverts to "Pending Order" (Reservation) state.
                            totalMetersOrdered: totalMeters,
                            totalTakaOrdered: totalPieces
                        }
                    }
                );
            } else if (item.type === "Saree" && item.matchingQuantities) {
                // Restore Saree inventory
                for (const mq of item.matchingQuantities) {
                    await Inventory.findOneAndUpdate(
                        {
                            qualityId: item.qualityId,
                            designId: item.designId,
                            matchingId: mq.matchingId,
                            type: "Saree",
                            cut: item.cut
                        },
                        {
                            $inc: {
                                totalSareeProduced: mq.challanQuantity,
                                totalSareeOrdered: mq.challanQuantity
                            }
                        }
                    );
                }
            }
        }

        // Update order dispatch status (Reverse)
        const order = await Order.findById(challan.orderId);
        if (order) {
            // Reverse dispatchedQuantity for each line item
            for (const challanItem of challan.items) {
                const orderItem = order.lineItems[challanItem.orderLineItemIndex];
                if (orderItem) {
                    if (challanItem.type === "Taka") {
                        orderItem.dispatchedQuantity = Math.max(
                            0,
                            (orderItem.dispatchedQuantity || 0) - challanItem.challanQuantity
                        );
                    } else if (challanItem.matchingQuantities) {
                        for (const mq of challanItem.matchingQuantities) {
                            const orderMq = orderItem.matchingQuantities?.find(
                                omq => omq.matchingId?.toString() === mq.matchingId?.toString()
                            );
                            if (orderMq) {
                                orderMq.dispatchedQuantity = Math.max(
                                    0,
                                    (orderMq.dispatchedQuantity || 0) - mq.challanQuantity
                                );
                            }
                        }
                    }
                }
            }

            // Recalculate dispatch status
            const allDispatched = order.lineItems.every(item => {
                const type = item.quantityType || item.catalogType;
                if (type === "Taka") {
                    return item.dispatchedQuantity >= item.quantity;
                } else {
                    return item.matchingQuantities.every(
                        mq => mq.dispatchedQuantity >= mq.quantity
                    );
                }
            });

            const anyDispatched = order.lineItems.some(item => {
                const type = item.quantityType || item.catalogType;
                if (type === "Taka") {
                    return item.dispatchedQuantity > 0;
                } else {
                    return item.matchingQuantities.some(mq => mq.dispatchedQuantity > 0);
                }
            });

            if (allDispatched) {
                order.dispatchStatus = "completed";
                order.status = "completed";
            } else if (anyDispatched) {
                order.dispatchStatus = "partial";
                order.status = "pending";
            } else {
                order.dispatchStatus = "pending";
                order.status = "pending";
            }

            await order.save();
        }

        // Delete the challan
        await Challan.findByIdAndDelete(req.params.id);

        res.json({ message: "Challan deleted successfully" });
    } catch (error) {
        console.error("Error deleting challan:", error);
        next(error);
    }
};

// ================= HELPERS =================

// Helper: Validate stock for challan - Validate against Physical Stock (Produced)
async function validateChallanStock(items) {
    const insufficientItems = [];

    for (const item of items) {
        if (item.type === "Taka") {
            // Find ALL inventory records across all factories and sum their stock
            const inventories = await Inventory.find({
                qualityId: item.qualityId,
                type: "Taka",
            }).populate("qualityId", "fabricName");

            let required = item.challanQuantity || 0;
            if ((item.quantityType === "Taka" || !item.quantityType) && item.selectedPieces && item.selectedPieces.length > 0) {
                required = item.selectedPieces.reduce((sum, p) => sum + (p.meter || 0), 0);
            }
            // Use Total Produced as available stock
            const available = inventories.reduce((sum, inv) => sum + (inv.totalMetersProduced || 0), 0);

            if (available < required) {
                insufficientItems.push({
                    qualityName: inventories[0]?.qualityId?.fabricName || "Unknown",
                    type: "Taka",
                    required,
                    available,
                    shortage: required - available,
                });
            }
        } else if (item.type === "Saree") {
            for (const mq of item.matchingQuantities || []) {
                const inventories = await Inventory.find({
                    qualityId: item.qualityId,
                    designId: item.designId,
                    matchingId: mq.matchingId,
                    type: "Saree",
                })
                    .populate("qualityId", "fabricName")
                    .populate("matchingId", "matchingName");

                const required = mq.challanQuantity || 0;
                const available = inventories.reduce((sum, inv) => sum + (inv.totalSareeProduced || 0), 0);

                if (available < required) {
                    insufficientItems.push({
                        qualityName: inventories[0]?.qualityId?.fabricName || "Unknown",
                        matchingName: inventories[0]?.matchingId?.matchingName || "Unknown",
                        type: "Saree",
                        required,
                        available,
                        shortage: required - available,
                    });
                }
            }
        }
    }

    return {
        valid: insufficientItems.length === 0,
        insufficientItems,
    };
}

// Helper: Deduct inventory for challan (Smart deduction - deduct from factory with MORE stock first)
async function deductInventoryForChallan(challanItems) {
    for (const item of challanItems) {
        if (item.type === "Taka") {
            const piecesCount = item.selectedPieces ? item.selectedPieces.length : 0;

            // Mark selected pieces as "Sold"
            if (item.selectedPieces && item.selectedPieces.length > 0) {
                for (const piece of item.selectedPieces) {
                    if (piece.stockPieceId) {
                        await StockPiece.findByIdAndUpdate(
                            piece.stockPieceId,
                            { status: "Sold", challanId: item.challanId }
                        );
                    }
                }
            }

            let totalMetersToDeduct = item.challanQuantity || 0;
            if ((item.quantityType === "Taka" || !item.quantityType) && item.selectedPieces && item.selectedPieces.length > 0) {
                totalMetersToDeduct = item.selectedPieces.reduce((sum, p) => sum + (p.meter || 0), 0);
            }

            let remainingToDeduct = totalMetersToDeduct;
            let remainingPiecesToDeduct = piecesCount;

            const inventories = await Inventory.find({
                qualityId: item.qualityId,
                type: "Taka",
            });

            inventories.sort((a, b) => b.totalMetersProduced - a.totalMetersProduced);

            for (const inv of inventories) {
                if (remainingToDeduct <= 0) break;

                const availableInThisFactory = inv.totalMetersProduced;
                const deductFromThis = Math.min(availableInThisFactory, remainingToDeduct);

                const piecesToDeductFromThis = remainingPiecesToDeduct > 0
                    ? Math.ceil((deductFromThis / item.challanQuantity) * piecesCount)
                    : 0;

                if (deductFromThis > 0) {
                    await Inventory.findByIdAndUpdate(
                        inv._id,
                        {
                            $inc: {
                                totalMetersProduced: -deductFromThis,
                                totalTakaProduced: -piecesToDeductFromThis,
                                totalMetersOrdered: -deductFromThis, // Reduce reservation too
                                totalTakaOrdered: -piecesToDeductFromThis
                            }
                        }
                    );
                    remainingToDeduct -= deductFromThis;
                    remainingPiecesToDeduct -= piecesToDeductFromThis;
                }
            }
        } else if (item.type === "Saree") {
            for (const mq of item.matchingQuantities || []) {
                let remainingToDeduct = mq.challanQuantity || 0;

                const inventories = await Inventory.find({
                    qualityId: item.qualityId,
                    designId: item.designId,
                    matchingId: mq.matchingId,
                    type: "Saree",
                });

                inventories.sort((a, b) => b.totalSareeProduced - a.totalSareeProduced);

                for (const inv of inventories) {
                    if (remainingToDeduct <= 0) break;

                    const availableInThisFactory = inv.totalSareeProduced;
                    const deductFromThis = Math.min(availableInThisFactory, remainingToDeduct);

                    if (deductFromThis > 0) {
                        await Inventory.findByIdAndUpdate(
                            inv._id,
                            {
                                $inc: {
                                    totalSareeProduced: -deductFromThis,
                                    totalSareeOrdered: -deductFromThis
                                }
                            }
                        );
                        remainingToDeduct -= deductFromThis;
                    }
                }
            }
        }
    }
}

// Helper: Update order dispatch status
async function updateOrderDispatchStatus(orderId, challanItems) {
    const order = await Order.findById(orderId);

    // Update dispatched quantities
    for (let i = 0; i < challanItems.length; i++) {
        const challanItem = challanItems[i];
        const orderItem = order.lineItems[challanItem.orderLineItemIndex];

        if (orderItem) {
            if (challanItem.type === "Taka") {
                orderItem.dispatchedQuantity =
                    (orderItem.dispatchedQuantity || 0) + challanItem.challanQuantity;
            } else {
                for (const challanMq of challanItem.matchingQuantities || []) {
                    const orderMq = orderItem.matchingQuantities.find(
                        (mq) => mq.matchingId.toString() === challanMq.matchingId.toString()
                    );
                    if (orderMq) {
                        orderMq.dispatchedQuantity =
                            (orderMq.dispatchedQuantity || 0) + challanMq.challanQuantity;
                    }
                }
            }
        }
    }

    // Calculate overall dispatch status
    const allDispatched = order.lineItems.every((item) => {
        const type = item.quantityType || item.catalogType;

        if (type === "Taka") {
            return item.dispatchedQuantity >= item.quantity;
        } else {
            return item.matchingQuantities.every(
                (mq) => mq.dispatchedQuantity >= mq.quantity
            );
        }
    });

    const anyDispatched = order.lineItems.some(
        (item) =>
            item.dispatchedQuantity > 0 ||
            item.matchingQuantities.some((mq) => mq.dispatchedQuantity > 0)
    );

    if (allDispatched) {
        order.dispatchStatus = "completed";
        order.status = "completed";
    } else if (anyDispatched) {
        order.dispatchStatus = "partial";
    }

    await order.save();
}
