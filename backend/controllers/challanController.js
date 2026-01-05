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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orderId, items, ...challanData } = req.body;

        // STEP 1: Validate stock for challan quantities
        const validationResult = await validateChallanStock(items, session);

        if (!validationResult.valid) {
            await session.abortTransaction();
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
        await challan.save({ session });

        // STEP 3: Deduct stock based on challan quantities
        await deductInventoryForChallan(items, session);

        // STEP 4: Update order dispatch status
        await updateOrderDispatchStatus(orderId, items, session);

        // STEP 5: Commit transaction
        await session.commitTransaction();

        const populated = await Challan.findById(challan._id)
            .populate("orderId")
            .populate("partyId")
            .populate("items.qualityId")
            .populate("items.designId")
            .populate("items.matchingQuantities.matchingId");

        res.status(201).json(populated);
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// Helper: Validate stock for challan
// Helper: Validate stock for challan - Validate against Physical Stock (Produced)
async function validateChallanStock(items, session) {
    const insufficientItems = [];

    for (const item of items) {
        if (item.type === "Taka") {
            // Find ALL inventory records across all factories and sum their stock
            const inventories = await Inventory.find({
                qualityId: item.qualityId,
                type: "Taka",
            })
                .populate("qualityId", "fabricName")
                .session(session);

            let required = item.challanQuantity || 0;
            if ((item.quantityType === "Taka" || !item.quantityType) && item.selectedPieces && item.selectedPieces.length > 0) {
                required = item.selectedPieces.reduce((sum, p) => sum + (p.meter || 0), 0);
            }
            // Use Total Produced as available stock (We are fulfilling a reservation, so we ignore 'Ordered' count)
            const available = inventories.reduce((sum, inv) => sum + (inv.totalMetersProduced || 0), 0);

            if (available < required) {
                insufficientItems.push({
                    qualityName: inventories[0]?.qualityId?.fabricName || "Unknown",
                    type: "Taka",
                    required,
                    available, // This is physical stock
                    shortage: required - available,
                });
            }
        } else if (item.type === "Saree") {
            for (const mq of item.matchingQuantities || []) {
                // Find ALL inventory records across all factories (ignore cut) and sum their stock
                const inventories = await Inventory.find({
                    qualityId: item.qualityId,
                    designId: item.designId,
                    matchingId: mq.matchingId,
                    type: "Saree",
                })
                    .populate("qualityId", "fabricName")
                    .populate("matchingId", "matchingName")
                    .session(session);

                const required = mq.challanQuantity || 0;
                // Use Total Produced
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
// Helper: Deduct inventory for challan (Consumes Stock + Reservation)
async function deductInventoryForChallan(challanItems, session = null) {
    for (const item of challanItems) {
        if (item.type === "Taka") {
            // Count how many pieces are being dispatched
            const piecesCount = item.selectedPieces ? item.selectedPieces.length : 0;

            // Mark selected pieces as "Sold"
            if (item.selectedPieces && item.selectedPieces.length > 0) {
                for (const piece of item.selectedPieces) {
                    if (piece.stockPieceId) {
                        await StockPiece.findByIdAndUpdate(
                            piece.stockPieceId,
                            { status: "Sold", challanId: item.challanId },
                            { session }
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

            // Find inventories, sort by Total Produced (Physical Stock) to deduct from where we have items
            const inventories = await Inventory.find({
                qualityId: item.qualityId,
                type: "Taka",
            }).session(session);

            inventories.sort((a, b) => b.totalMetersProduced - a.totalMetersProduced);

            for (const inv of inventories) {
                if (remainingToDeduct <= 0) break;

                // We limit deduction to what is physically there (totalMetersProduced)
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
                        },
                        { session }
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
                }).session(session);

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
                            },
                            { session }
                        );
                        remainingToDeduct -= deductFromThis;
                    }
                }
            }
        }
    }
}

// Helper: Update order dispatch status
async function updateOrderDispatchStatus(orderId, challanItems, session) {
    const order = await Order.findById(orderId).session(session);

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
        order.status = "completed"; // Mark order as completed
    } else if (anyDispatched) {
        order.dispatchStatus = "partial";
    }

    await order.save({ session });
}

// PUT /api/challans/:id - Update challan
export const updateChallan = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { items, ...updateData } = req.body;

        // 1. Get existing challan
        const oldChallan = await Challan.findById(id).session(session);
        if (!oldChallan) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Challan not found" });
        }

        // 2. REVERT OLD STOCK - Restore Produced and Ordered counts (Add them back)
        // This is the opposite of 'deductInventoryForChallan'
        // We put back the stock as if the challan never happened, so it is "Produced" and "Reserved (Ordered)" again.
        for (const item of oldChallan.items) {
            if (item.type === "Taka" && item.selectedPieces && item.selectedPieces.length > 0) {
                // Restore StockPieces
                for (const piece of item.selectedPieces) {
                    await StockPiece.findByIdAndUpdate(
                        piece.stockPieceId,
                        { status: "Available", challanId: null },
                        { session }
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
                    },
                    { session }
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
                        },
                        { session }
                    );
                }
            }
        }

        // Revert Order Dispatched Quantities
        const order = await Order.findById(oldChallan.orderId).session(session);
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
            // We don't save order here yet, we'll do it after re-applying new values
        }

        // 3. VALIDATE NEW STOCK
        const validationResult = await validateChallanStock(items, session);
        if (!validationResult.valid) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "Insufficient stock for one or more items",
                insufficientItems: validationResult.insufficientItems,
            });
        }

        // 4. APPLY NEW STOCK
        await deductInventoryForChallan(items, session);

        // 5. UPDATE ORDER WITH NEW QUANTITIES
        // We reuse the update helper but pass the *already modified* order object if possible?
        // Actually `updateOrderDispatchStatus` fetches the order again.
        // We must save the "Revert" changes to the order first?
        // Yes, because `updateOrderDispatchStatus` does `Order.findById`.
        // So we must save the reverted order state first.
        if (order) await order.save({ session });

        // Now apply new
        await updateOrderDispatchStatus(oldChallan.orderId, items, session);

        // 6. UPDATE CHALLAN DOCUMENT
        // Merge items into updateData
        const updatedChallan = await Challan.findByIdAndUpdate(
            id,
            { ...updateData, items },
            { new: true, session }
        )
            .populate("orderId")
            .populate("partyId")
            .populate("items.qualityId")
            .populate("items.designId")
            .populate("items.matchingQuantities.matchingId");

        await session.commitTransaction();
        res.json(updatedChallan);

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// DELETE /api/challans/:id - Delete challan and reverse inventory
export const deleteChallan = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get the challan before deleting
        const challan = await Challan.findById(req.params.id).session(session);
        if (!challan) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Challan not found" });
        }

        // Reverse inventory deductions (Add back logic)
        for (const item of challan.items) {
            if (item.type === "Taka" && item.selectedPieces && item.selectedPieces.length > 0) {
                // Restore StockPieces back to Available status
                for (const piece of item.selectedPieces) {
                    await StockPiece.findByIdAndUpdate(
                        piece.stockPieceId,
                        { status: "Available" },
                        { session }
                    );
                }

                // Add back to inventory (reverse the deduction)
                const totalMeters = item.challanQuantity;
                await Inventory.findOneAndUpdate(
                    {
                        qualityId: item.qualityId,
                        designId: item.designId,
                        type: "Taka"
                    },
                    {
                        $inc: {
                            totalMetersProduced: totalMeters,
                            totalTakaProduced: item.selectedPieces.length,
                            totalMetersOrdered: totalMeters,
                            totalTakaOrdered: item.selectedPieces.length
                        }
                    },
                    { session }
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
                        },
                        { session }
                    );
                }
            }
        }

        // Update order dispatch status
        const order = await Order.findById(challan.orderId).session(session);
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
                if (item.matchingQuantities) {
                    return item.matchingQuantities.every(
                        mq => mq.dispatchedQuantity >= mq.quantity
                    );
                }
                return item.dispatchedQuantity >= item.quantity;
            });

            const anyDispatched = order.lineItems.some(item => {
                if (item.matchingQuantities) {
                    return item.matchingQuantities.some(mq => mq.dispatchedQuantity > 0);
                }
                return item.dispatchedQuantity > 0;
            });

            if (allDispatched) {
                order.dispatchStatus = "completed";
                order.status = "completed";
            } else if (anyDispatched) {
                order.dispatchStatus = "partial";
                order.status = "pending"; // Set back to pending if not fully dispatched
            } else {
                order.dispatchStatus = "pending";
                order.status = "pending"; // Set back to pending if nothing dispatched
            }

            await order.save({ session });
        }

        // Delete the challan
        await Challan.findByIdAndDelete(req.params.id, { session });

        await session.commitTransaction();
        res.json({ message: "Challan deleted successfully" });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error deleting challan:", error);
        next(error);
    } finally {
        session.endSession();
    }
};
