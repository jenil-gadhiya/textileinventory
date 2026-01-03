import { Production } from "../models/Production.js";
import { StockPiece } from "../models/StockPiece.js";
import { Inventory } from "../models/Inventory.js";

export const migrateTakaStock = async (req, res, next) => {
    try {
        console.log("Starting Taka Stock Migration...");

        // 1. Clear existing StockPieces
        await StockPiece.deleteMany({});
        console.log("Cleared existing StockPieces.");

        // 2. Fetch all Taka Productions
        const productions = await Production.find({
            stockType: { $in: ["Taka", "Taka-Pic"] }
        }).sort({ createdAt: 1 }).lean();

        console.log(`Found ${productions.length} Taka productions.`);

        let createdPieces = 0;

        for (const prod of productions) {
            if (prod.takaDetails && prod.takaDetails.length > 0) {

                const pieceDocs = prod.takaDetails
                    .filter(td => td.takaNo && td.meter && prod.qualityId && prod.factoryId)
                    .map(td => ({
                        takaNo: td.takaNo,
                        meter: td.meter,
                        status: "Available",
                        qualityId: prod.qualityId,
                        designId: prod.designId, // Might be undefined
                        factoryId: prod.factoryId,
                        productionId: prod._id,
                    }));

                if (pieceDocs.length > 0) {
                    try {
                        await StockPiece.insertMany(pieceDocs);
                        createdPieces += pieceDocs.length;
                    } catch (e) {
                        console.error(`Failed to insert pieces for production ${prod._id}:`, e.message);
                        // Continue to next production
                    }
                }
            }
        }

        console.log(`Created ${createdPieces} StockPieces. Now reconciling sold items...`);

        // 3. Reconcile with Inventory "Sold" counts
        const inventories = await Inventory.find({ type: "Taka" });

        for (const inv of inventories) {
            const soldMeters = inv.totalMetersOrdered || 0;
            if (soldMeters > 0) {
                const query = {
                    qualityId: inv.qualityId,
                    factoryId: inv.factoryId,
                    status: "Available"
                };

                if (inv.designId) {
                    query.designId = inv.designId;
                } else {
                    query.designId = { $exists: false };
                }

                const pieces = await StockPiece.find(query).sort({ _id: 1 }); // FIFO

                let remainingSold = soldMeters;
                let markedSold = 0;

                for (const piece of pieces) {
                    if (remainingSold <= 0) break;

                    piece.status = "Sold";
                    await piece.save();

                    remainingSold -= piece.meter;
                    markedSold++;
                }
                console.log(`Inventory ${inv._id}: Sold ${soldMeters}m. Marked ${markedSold} pieces as Sold.`);
            }
        }

        res.json({ message: "Migration complete", createdPieces });

    } catch (error) {
        console.error("Migration failed:", error);
        next(error);
    }
};
