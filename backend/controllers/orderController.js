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
    const METERS_PER_TAKA = 120;

    for (const item of lineItems) {
        const type = (item.catalogType === "Taka" || item.quantityType === "Taka" || item.quantityType === "Meter") ? "Taka" : "Saree";

        if (type === "Taka") {
            // Calculate quantities to reverse
            let qtyMeters = 0;
            let qtyTaka = 0;

            if (item.quantityType === "Taka") {
                qtyTaka = item.quantity || 0;
                qtyMeters = qtyTaka * METERS_PER_TAKA;
            } else {
                qtyMeters = item.quantity || 0;
                qtyTaka = Math.round(qtyMeters / METERS_PER_TAKA);
            }

            const query = {
                qualityId: item.qualityId,
                designId: item.designId,
                type: "Taka",
            };
            if (item.factoryId) query.factoryId = item.factoryId;

            const inventory = await Inventory.findOne(query).session(session);

            if (inventory) {
                await Inventory.findByIdAndUpdate(
                    inventory._id,
                    {
                        $inc: {
                            totalMetersOrdered: -qtyMeters,
                            totalTakaOrdered: -qtyTaka
                        },
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
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Reverse Stock Reservation (Non-Transactional)
        try {
            await reverseInventoryReservation(order.lineItems.map(item => {
                // Calculate pending quantity to reverse
                if (item.catalogType === "Saree") {
                    return {
                        ...item.toObject(),
                        matchingQuantities: item.matchingQuantities.map(mq => ({
                            ...mq,
                            quantity: Math.max(0, (mq.quantity || 0) - (mq.dispatchedQuantity || 0))
                        }))
                    };
                } else {
                    // Taka or Meter
                    return {
                        ...item.toObject(),
                        quantity: Math.max(0, (item.quantity || 0) - (item.dispatchedQuantity || 0))
                    };
                }
            }), null); // No session
        } catch (revError) {
            console.error("Error reversing inventory during order delete", revError);
        }

        await Order.findByIdAndDelete(req.params.id);

        res.json({ message: "Order deleted successfully" });
    } catch (error) {
        next(error);
    }
};
