import { Production } from "../models/Production.js";
import { StockPiece } from "../models/StockPiece.js";
import mongoose from "mongoose";
import { updateInventoryFromProduction } from "./inventoryController.js";

export const getProductions = async (req, res, next) => {
    try {
        const productions = await Production.find()
            .populate("factoryId")
            .populate("qualityId")
            .populate("designId")
            .populate("matchingQuantities.matchingId")
            .sort({ createdAt: -1 });
        res.json(productions);
    } catch (error) {
        next(error);
    }
};

export const getProduction = async (req, res, next) => {
    try {
        const production = await Production.findById(req.params.id)
            .populate("factoryId")
            .populate("qualityId")
            .populate("designId")
            .populate("matchingQuantities.matchingId");
        if (!production) {
            return res.status(404).json({ message: "Production not found" });
        }
        res.json(production);
    } catch (error) {
        next(error);
    }
};

export const createProduction = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log("Creating production with data:", JSON.stringify(req.body, null, 2));

        // STEP 1: Create production entry
        const production = new Production(req.body);
        await production.save({ session });

        // STEP 2: Update inventory (increase stock)
        await updateInventoryFromProduction(production, session);

        // STEP 2.5: Create StockPieces for Taka production
        if ((production.stockType === "Taka" || production.stockType === "Taka-Pic") &&
            production.takaDetails && production.takaDetails.length > 0) {

            const stockPieces = production.takaDetails.map(td => ({
                takaNo: td.takaNo,
                meter: td.meter,
                status: "Available",
                qualityId: production.qualityId,
                designId: production.designId,
                factoryId: production.factoryId,
                productionId: production._id,
            }));

            await StockPiece.insertMany(stockPieces, { session });
            console.log(`Created ${stockPieces.length} StockPieces for production ${production._id}`);
        }

        // STEP 3: Commit transaction
        await session.commitTransaction();

        // STEP 4: Return populated production
        const populated = await Production.findById(production._id)
            .populate("factoryId")
            .populate("qualityId")
            .populate("designId")
            .populate("matchingQuantities.matchingId");

        res.status(201).json(populated);
    } catch (error) {
        // Error occurred - rollback all changes
        await session.abortTransaction();
        console.error("Error creating production:", error.message);
        console.error("Full error:", error);
        next(error);
    } finally {
        session.endSession();
    }
};

export const updateProduction = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // STEP 1: Get the old production data
        const oldProduction = await Production.findById(req.params.id).session(session);
        if (!oldProduction) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Production not found" });
        }

        // STEP 2: Reverse old inventory (subtract old production from inventory)
        await reverseInventoryFromProduction(oldProduction, session);

        // STEP 3: Delete old StockPieces if Taka
        if ((oldProduction.stockType === "Taka" || oldProduction.stockType === "Taka-Pic")) {
            await StockPiece.deleteMany({ productionId: oldProduction._id }, { session });
            console.log(`Deleted old StockPieces for production ${oldProduction._id}`);
        }

        // STEP 4: Update production with new data
        const updatedProduction = await Production.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true, session }
        );

        // STEP 5: Add new inventory (add new production to inventory)
        await updateInventoryFromProduction(updatedProduction, session);

        // STEP 6: Create new StockPieces for Taka production
        if ((updatedProduction.stockType === "Taka" || updatedProduction.stockType === "Taka-Pic") &&
            updatedProduction.takaDetails && updatedProduction.takaDetails.length > 0) {

            const stockPieces = updatedProduction.takaDetails.map(td => ({
                takaNo: td.takaNo,
                meter: td.meter,
                status: "Available",
                qualityId: updatedProduction.qualityId,
                designId: updatedProduction.designId,
                factoryId: updatedProduction.factoryId,
                productionId: updatedProduction._id,
            }));

            await StockPiece.insertMany(stockPieces, { session });
            console.log(`Created ${stockPieces.length} new StockPieces for production ${updatedProduction._id}`);
        }

        // STEP 7: Commit transaction
        await session.commitTransaction();

        // STEP 8: Return populated production
        const production = await Production.findById(updatedProduction._id)
            .populate("factoryId")
            .populate("qualityId")
            .populate("designId")
            .populate("matchingQuantities.matchingId");

        res.json(production);
    } catch (error) {
        await session.abortTransaction();
        console.error("Error updating production:", error);
        next(error);
    } finally {
        session.endSession();
    }
};

// Helper function to reverse inventory changes
async function reverseInventoryFromProduction(production, session) {
    const Inventory = mongoose.model("Inventory");

    if (production.stockType === "Taka" || production.stockType === "Taka-Pic") {
        // Find and subtract from inventory
        const inventory = await Inventory.findOne({
            factoryId: production.factoryId,
            qualityId: production.qualityId,
            type: "Taka"
        }).session(session);

        if (inventory) {
            await Inventory.findByIdAndUpdate(
                inventory._id,
                {
                    $inc: {
                        totalMetersProduced: -production.totalMeters,
                        totalTakaProduced: -production.takaDetails.length
                    }
                },
                { session }
            );
        }
    } else if (production.stockType === "Saree") {
        // Subtract saree inventory
        for (const mq of production.matchingQuantities || []) {
            const inventory = await Inventory.findOne({
                factoryId: production.factoryId,
                qualityId: production.qualityId,
                designId: production.designId,
                matchingId: mq.matchingId,
                type: "Saree",
                cut: production.cut
            }).session(session);

            if (inventory) {
                await Inventory.findByIdAndUpdate(
                    inventory._id,
                    { $inc: { totalSareeProduced: -mq.quantity } },
                    { session }
                );
            }
        }
    }
}

export const deleteProduction = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // STEP 1: Get the production data before deleting
        const production = await Production.findById(req.params.id).session(session);
        if (!production) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Production not found" });
        }

        // STEP 2: Reverse inventory (subtract production from inventory)
        await reverseInventoryFromProduction(production, session);

        // STEP 3: Delete StockPieces if Taka
        if ((production.stockType === "Taka" || production.stockType === "Taka-Pic")) {
            await StockPiece.deleteMany({ productionId: production._id }, { session });
            console.log(`Deleted StockPieces for production ${production._id}`);
        }

        // STEP 4: Delete the production entry
        await Production.findByIdAndDelete(req.params.id, { session });

        // STEP 5: Commit transaction
        await session.commitTransaction();

        res.json({ message: "Production deleted successfully" });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error deleting production:", error);
        next(error);
    } finally {
        session.endSession();
    }
};
