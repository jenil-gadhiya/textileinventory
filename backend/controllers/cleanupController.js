import { Broker } from "../models/Broker.js";

export const cleanupInvalidBrokers = async (req, res, next) => {
    try {
        // Find all brokers
        const allBrokers = await Broker.find();
        const count = allBrokers.length;

        if (count === 0) {
            return res.json({
                message: "No brokers found",
                deleted: 0
            });
        }

        // Delete ALL brokers - they all have invalid IDs
        await Broker.deleteMany({});

        res.json({
            message: `Deleted all ${count} brokers. Please create new brokers and MongoDB will auto-generate proper ObjectIds`,
            deleted: count,
            deletedBrokers: allBrokers.map(b => ({
                id: b._id,
                name: b.brokerName
            }))
        });
    } catch (error) {
        next(error);
    }
};
