import { Order } from "../models/Order.js";
import {
    validateStockAvailability,
    reserveInventoryForOrder,
} from "./inventoryController.js";

export const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find()
            .populate("partyId", "partyName")
            .populate("factoryId", "factoryName")
            .populate("brokerId", "brokerName")
            .populate("salesmanId", "salesmanName")
            .populate("lineItems.qualityId", "fabricName")
            .populate("lineItems.designId", "designNumber designName")
            .populate("lineItems.matchingQuantities.matchingId", "matchingName")
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("partyId")
            .populate("factoryId")
            .populate("brokerId")
            .populate("salesmanId")
            .populate("lineItems.qualityId")
            .populate("lineItems.designId")
            .populate("lineItems.matchingQuantities.matchingId");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
    } catch (error) {
        next(error);
    }
};

// CHANGED: Order creation NOW deducts stock (reserves it)
// Stock will be physically reduced when Challan is created
// CHANGED: Order creation NOW deducts stock (reserves it)
// Stock will be physically reduced when Challan is created
export const createOrder = async (req, res, next) => {
    console.log("[CreateOrder] Start (No Transaction)");

    try {
        const order = new Order(req.body);
        await order.save();
        console.log("[CreateOrder] Order Saved:", order._id);

        // Reserve inventory for this order
        try {
            await reserveInventoryForOrder(order.lineItems); // No session
            console.log("[CreateOrder] Inventory Reserved");
        } catch (reserveError) {
            console.error("[CreateOrder] Reserve Failed (Order orphaned?):", reserveError);
            // Ideally we should delete the order if reservation fails, 
            // but for now let's just propagate error to know WHY.
            // Or better: try to delete the order to rollback manually.
            await Order.findByIdAndDelete(order._id);
            throw reserveError;
        }

        // Return populated order
        const populated = await Order.findById(order._id)
            .populate("partyId")
            .populate("factoryId")
            .populate("brokerId")
            .populate("salesmanId")
            .populate("lineItems.qualityId")
            .populate("lineItems.designId")
            .populate("lineItems.matchingQuantities.matchingId");

        res.status(201).json(populated);
    } catch (error) {
        console.error("[CreateOrder] Error:", error);
        next(error);
    }
};

export const updateOrder = async (req, res, next) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate("partyId")
            .populate("factoryId")
            .populate("brokerId")
            .populate("salesmanId")
            .populate("lineItems.qualityId")
            .populate("lineItems.designId")
            .populate("lineItems.matchingQuantities.matchingId");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
    } catch (error) {
        next(error);
    }
};

// Helper to reverse inventory reservation when order is deleted
async function reverseInventoryReservation(lineItems, session) {
    const Inventory = mongoose.model("Inventory");

    for (const item of lineItems) {
        const type = item.quantityType || item.catalogType;

        if (type === "Taka") {
            // Find inventory to release reservation from
            const query = {
                qualityId: item.qualityId,
                designId: item.designId,
                type: "Taka",
            };
            if (item.factoryId) query.factoryId = item.factoryId;

            // We decrease Ordered count.
            // Since we don't know exactly which doc was incremented (if duplicates exist),
            // we find one (preferably the one with ordered count > 0) or just the first match.
            // Given the uniqueness constraints usually applied, query should hit the main record.
            const inventory = await Inventory.findOne(query).session(session);

            if (inventory) {
                await Inventory.findByIdAndUpdate(
                    inventory._id,
                    {
                        $inc: { totalMetersOrdered: -(item.quantity || 0) },
                    },
                    { session }
                );
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

                const inventory = await Inventory.findOne(query).session(session);

                if (inventory) {
                    await Inventory.findByIdAndUpdate(
                        inventory._id,
                        {
                            $inc: { totalSareeOrdered: -(mq.quantity || 0) },
                        },
                        { session }
                    );
                }
            }
        }
    }
}

export const deleteOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(req.params.id).session(session);
        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Order not found" });
        }

        // 1. Check if order can be deleted (only if pending?)
        // If partially dispatched or completed, we probably shouldn't delete it
        // OR we should only release the *remaining* reservation?
        // But users might "force delete".
        // If dispatched, stock is already deducted.
        // If we delete order, we should theoretically REVERSE dispatch too?
        // Usually you delete Challans first (reversing dispatch).
        // If Order has dispatchStatus 'pending', we just reverse reservation.
        // If 'partial', we reverse reservation of the WHOLE amount? No, only the ordered amount?
        // Reservation is tracking "Total quantity ordered". "Available" = "Produced" - "Ordered".
        // Dispatch "Consumes" the reservation (Produced -= qty, Ordered -= qty).
        // So "Ordered" represents "Pending + Dispatched"? Or just "Pending"?
        // In `deductInventoryForChallan`: `totalMetersOrdered: -deductFromThis`.
        // So "Ordered" represents ONLY "Pending to be dispatched".
        // Once dispatched, it is removed from "Ordered".
        // So `totalMetersOrdered` is essentially "Backlog".
        // So if we delete the order, we simply remove whatever `quantity` was added to `Ordered`.
        // BUT wait. `reserve` added `item.quantity`.
        // `deduct` (dispatch) removed `challanQuantity`.
        // So the remaining `Ordered` count in DB *is* the pending amount.
        // BUT `reverseInventoryReservation` (my helper above) subtracts `item.quantity` (original full amount).
        // If we dispatched some, `totalMetersOrdered` is already lower.
        // If we subtract full amount, `totalMetersOrdered` becomes negative!
        // CORRECTION: We should subtract `item.quantity - item.dispatchedQuantity`.
        // Because that is what remains in "Ordered" state.

        await reverseInventoryReservation(order.lineItems.map(item => {
            // Calculate pending quantity to reverse
            // For Taka: item.quantity - item.dispatchedQuantity
            // For Saree: mq.quantity - mq.dispatchedQuantity

            if (item.catalogType === "Saree") { // Saree or Taka-Saree?
                // Logic inside helper iterates matchingQuantities.
                // We need to map item to reflect CURRENT pending quantities?
                // Or modify helper to handle dispatched?
                // Better to map here.
                return {
                    ...item.toObject(),
                    matchingQuantities: item.matchingQuantities.map(mq => ({
                        ...mq,
                        quantity: Math.max(0, (mq.quantity || 0) - (mq.dispatchedQuantity || 0))
                    }))
                };
            } else {
                // Taka
                return {
                    ...item.toObject(),
                    quantity: Math.max(0, (item.quantity || 0) - (item.dispatchedQuantity || 0))
                };
            }
        }), session);

        await Order.findByIdAndDelete(req.params.id, { session });

        await session.commitTransaction();
        res.json({ message: "Order deleted successfully" });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};
