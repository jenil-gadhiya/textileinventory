import mongoose from "mongoose";
import dotenv from "dotenv";
import { Production } from "../models/Production.js";
import { Order } from "../models/Order.js";
import { Challan } from "../models/Challan.js";
import { Inventory } from "../models/Inventory.js";
import { StockPiece } from "../models/StockPiece.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/textile_os";

async function recalculate() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
        dbName: process.env.MONGO_DB || "textile_os"
    });
    console.log("Connected.");

    // 1. Clear existing Inventory counts (or we can just overwrite, but clearing is safer to remove stale composites)
    // Actually, destroying inventory docs checks referential integrity? No, Inventory is leaf.
    // Better: We calculate everything in memory Map, then Bulk Write.
    // If an inventory item exists in DB but not in Map -> It should be 0.

    console.log("Fetching all data...");
    const productions = await Production.find({});
    const challans = await Challan.find({});
    const orders = await Order.find({ status: { $ne: "completed" } }); // Only pending/partial orders contribute to Reserved

    console.log(`Fetched ${productions.length} productions, ${challans.length} challans, ${orders.length} active orders.`);

    // 2. Build Inventory Map and Lookup Key
    const invMap = {}; // inventoryId -> { doc, calculated: { ... } }
    const keyToIds = {}; // key -> [inventoryId]

    const getInvKey = (type, q, d, f, m, cut) => {
        return `${type}|${q}|${d || ''}|${f || ''}|${m || ''}|${cut || ''}`;
    };

    console.log("Initializing In-Memory Map...");
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
    console.log(`Mapped ${allInventory.length} inventory records.`);

    // 3. Process Productions (Add to Produced)
    console.log("Processing Productions...");
    for (const p of productions) {
        let key = "";
        let qtyMeters = p.totalMeters || 0;
        let qtyTaka = p.takaDetails ? p.takaDetails.length : 0;
        let qtySaree = 0; // For Saree type, counting pieces varies per matching logic below

        if (p.stockType === "Taka" || p.stockType === "Taka-Pic") {
            key = getInvKey("Taka", p.qualityId?.toString(), p.designId?.toString(), p.factoryId?.toString(), null, null);
            const ids = keyToIds[key];
            if (ids && ids.length > 0) {
                // Usually unique. If duplicates, add to first?
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

    // 4. Process Challans (Subtract from Produced)
    console.log("Processing Challans...");
    for (const c of challans) {
        for (const item of c.items) {
            const type = item.type;
            let toDeduct = item.challanQuantity || 0;
            let toDeductTaka = item.selectedPieces ? item.selectedPieces.length : 0;

            // Find candidates
            let candidates = [];

            // Candidates must match Q/D/Matching/Cut
            const baseValues = Object.values(invMap).map(x => x).filter(data => {
                const i = data.doc;
                if (type === "Taka") {
                    return i.type === "Taka" &&
                        i.qualityId?.toString() === item.qualityId?.toString() &&
                        i.designId?.toString() === item.designId?.toString();
                } else { // Saree
                    // Challan item matchingQuantities list... Saree type challenge: items has matchingQuantities array.
                    // But inventory logic (deduct) iterates matchingQuantities.
                    // Here we are inside item loop.
                    return false; // Handled below
                }
            });

            if (type === "Taka") {
                // Sort candidates by CURRENT calculated produced (Logic: Deduct from largest stock)
                // This mirrors 'deductInventoryForChallan' logic roughly (though that uses DB state, which changes over time).
                // Simulation is approximate.
                let matchingCandidates = baseValues.sort((a, b) => b.calculated.totalMetersProduced - a.calculated.totalMetersProduced);

                for (const cand of matchingCandidates) {
                    if (toDeduct <= 0) break;
                    const available = cand.calculated.totalMetersProduced;
                    const taking = Math.min(available, toDeduct);
                    if (taking > 0) {
                        cand.calculated.totalMetersProduced -= taking;
                        // Proportional Taka deduction? Or exact?
                        // Challan item.selectedPieces doesn't say which factory.
                        // We assume proportional for rebuilding.
                        // Or strict: just deduct from first.
                        const piecesTaking = (toDeductTaka > 0 && item.challanQuantity > 0)
                            ? Math.ceil((taking / item.challanQuantity) * toDeductTaka)
                            : 0;
                        cand.calculated.totalTakaProduced -= piecesTaking;

                        toDeduct -= taking;
                        // Reduce remaining pieces target for next iteration (approx)
                        toDeductTaka -= piecesTaking;
                    }
                }
            } else if (type === "Saree") {
                for (const mq of item.matchingQuantities || []) {
                    let mqDeduct = mq.challanQuantity || 0;
                    // Find candidates for this matching
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

    // 5. Process Orders (Add to Ordered)
    console.log("Processing Orders...");
    for (const o of orders) {
        for (const item of o.lineItems) {
            const type = item.quantityType || item.catalogType;
            let pendingQty = 0;

            if (type === "Taka") {
                pendingQty = Math.max(0, (item.quantity || 0) - (item.dispatchedQuantity || 0));

                if (pendingQty > 0) {
                    const qId = item.qualityId?.toString();
                    const dId = item.designId?.toString();
                    const fId = item.factoryId?.toString();

                    // Filter candidates
                    let candidates = Object.values(invMap).filter(data => {
                        const i = data.doc;
                        return i.type === "Taka" &&
                            i.qualityId?.toString() === qId &&
                            i.designId?.toString() === dId &&
                            (!fId || i.factoryId?.toString() === fId);
                    });

                    // Sort by Available (Produced - Ordered)? Simulation uses 'availableMeters' 
                    // Current Calculated Available = Prod - Ord
                    candidates.sort((a, b) => {
                        const availA = a.calculated.totalMetersProduced - a.calculated.totalMetersOrdered;
                        const availB = b.calculated.totalMetersProduced - b.calculated.totalMetersOrdered;
                        return availB - availA;
                    });

                    if (candidates.length > 0) {
                        candidates[0].calculated.totalMetersOrdered += pendingQty;
                    }
                }
            } else {
                // Saree
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

    // 6. Write to DB
    console.log("Saving changes to DB...");
    let updatedCount = 0;
    for (const id in invMap) {
        const { doc, calculated } = invMap[id];

        // Ensure non-negative
        calculated.totalMetersProduced = Math.max(0, calculated.totalMetersProduced);
        calculated.totalTakaProduced = Math.max(0, calculated.totalTakaProduced);
        calculated.totalSareeProduced = Math.max(0, calculated.totalSareeProduced);
        calculated.totalMetersOrdered = Math.max(0, calculated.totalMetersOrdered);
        calculated.totalTakaOrdered = 0; // Always 0
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
                totalTakaOrdered: 0,
                totalSareeOrdered: calculated.totalSareeOrdered
            });
            updatedCount++;
        }
    }
    console.log(`Recalculated and updated ${updatedCount} records.`);

    // Sync StockPieces status?
    // This is for Taka.
    // Status should be 'Sold' if in Challan, 'Available' otherwise.
    // StockPiece has 'challanId'.
    // If challanId is set, must be Sold.
    // If challanId is null, must be Available.
    console.log("Syncing StockPieces...");
    // Update all where challanId is null AND status != Available -> Available
    const r1 = await StockPiece.updateMany(
        { challanId: null, status: { $ne: "Available" } },
        { status: "Available" }
    );
    // Update all where challanId is NOT null AND status != Sold -> Sold
    const r2 = await StockPiece.updateMany(
        { challanId: { $ne: null }, status: { $ne: "Sold" } },
        { status: "Sold" }
    );
    console.log(`Reset ${r1.modifiedCount} to Available, ${r2.modifiedCount} to Sold.`);

    await mongoose.disconnect();
    console.log("Done.");
}

recalculate();
