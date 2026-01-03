import { Inventory } from "../models/Inventory.js";
import { Order } from "../models/Order.js";
import { Production } from "../models/Production.js";
import { Broker } from "../models/Broker.js";

// Helper to correct Taka counts (same logic as inventoryController)
const correctInventoryItem = (item) => {
    let json = item.toJSON ? item.toJSON() : item;

    // Sanity check logic
    if (json.type === "Taka" && json.totalTakaOrdered > 20 && Math.abs(json.totalTakaOrdered - json.totalMetersOrdered) < 5) {
        const avgLen = (json.totalMetersProduced && json.totalTakaProduced)
            ? (json.totalMetersProduced / json.totalTakaProduced)
            : 100;
        const estimatedOrdered = Math.round(json.totalMetersOrdered / avgLen);

        // Recalculate available based on corrected ordered count
        const correctedAvailable = Math.max(0, (json.totalTakaProduced || 0) - estimatedOrdered);
        return { ...json, availableTaka: correctedAvailable };
    }

    // Ensure non-negative
    if (json.type === "Taka") {
        return { ...json, availableTaka: Math.max(0, json.availableTaka || 0) };
    }
    return json;
};

export const getDashboardStats = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        // Default to last 30 days if not provided
        const toDate = to ? new Date(to) : new Date();
        const fromDate = from ? new Date(from) : new Date(new Date().setDate(toDate.getDate() - 30));

        const fromDateStr = fromDate.toISOString().split('T')[0];
        const toDateStr = toDate.toISOString().split('T')[0];

        // 1. Calculate Current Stock (Snapshot)
        const allInventory = await Inventory.find({});

        let totalSareePieces = 0;
        let totalTakaPieces = 0;
        let totalTakaMeters = 0;

        for (const item of allInventory) {
            const doc = correctInventoryItem(item);

            if (doc.type === "Saree") {
                totalSareePieces += (doc.availableSaree || 0);
            } else if (doc.type === "Taka") {
                totalTakaPieces += (doc.availableTaka || 0);
                totalTakaMeters += (doc.availableMeters || 0);
            }
        }

        // 2. Order Stats (Filtered by Date)
        const orders = await Order.find({
            date: { $gte: fromDateStr, $lte: toDateStr }
        })
            .populate("partyId", "partyName")
            .populate("lineItems.qualityId", "fabricName");

        let pendingCount = 0;
        let pendingValue = 0;
        let completedCount = 0;
        let completedValue = 0;
        let totalOrderValue = 0;
        let totalMetersOrdered = 0;
        const partyMap = {};
        const qualityMap = {};

        for (const o of orders) {
            const value = o.totalAmount || 0;
            totalOrderValue += value;

            if (o.status === "completed") {
                completedCount++;
                completedValue += value;
            } else {
                pendingCount++;
                pendingValue += value;
            }

            // Party Summary
            if (o.partyId && typeof o.partyId === "object") {
                const pid = o.partyId._id.toString();
                const pname = o.partyId.partyName;
                if (!partyMap[pid]) {
                    partyMap[pid] = { id: pid, name: pname, orderCount: 0, totalValue: 0, completedCount: 0, pendingCount: 0 };
                }
                partyMap[pid].orderCount++;
                partyMap[pid].totalValue += value;
                if (o.status === "completed") partyMap[pid].completedCount++;
                else partyMap[pid].pendingCount++;
            }

            // Quality analysis for Top Qualities & Avg Rate
            for (const item of o.lineItems) {
                const m = item.totalMeters || 0;
                totalMetersOrdered += m;

                if (item.qualityId && typeof item.qualityId === 'object') {
                    const qid = item.qualityId._id.toString();
                    const fabricName = item.qualityId.fabricName || "Unknown";

                    if (!qualityMap[qid]) {
                        qualityMap[qid] = { name: fabricName, quantity: 0, value: 0 };
                    }
                    qualityMap[qid].quantity += m;
                    qualityMap[qid].value += (item.orderValue || 0);
                }
            }
        }

        const partySummary = Object.values(partyMap).sort((a, b) => b.totalValue - a.totalValue);
        const topQualities = Object.values(qualityMap).sort((a, b) => b.value - a.value).slice(0, 5);
        const avgSalesRate = totalMetersOrdered ? (totalOrderValue / totalMetersOrdered) : 0;

        // 3. Broker Stats
        const totalBrokers = await Broker.countDocuments({});

        // 4. Production Stats (Trend)
        const productionDocs = await Production.find({
            date: { $gte: fromDateStr, $lte: toDateStr }
        });

        const productionMap = {};
        for (const p of productionDocs) {
            productionMap[p.date] = (productionMap[p.date] || 0) + (p.totalMeters || 0);
        }

        const productionTrend = Object.entries(productionMap)
            .map(([date, meters]) => ({ date, meters }))
            .sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            dateRange: { from: fromDate, to: toDate },
            stock: {
                totalSareePieces,
                totalTakaPieces,
                totalTakaMeters
            },
            orders: {
                total: { count: orders.length, value: totalOrderValue },
                pending: { count: pendingCount, value: pendingValue },
                completed: { count: completedCount, value: completedValue }
            },
            partySummary,
            productionTrend,
            totalBrokers,
            avgSalesRate,
            topQualities
        });

    } catch (error) {
        next(error);
    }
};
