import express from "express";
import {
    getInventory,
    getInventoryById,
    validateOrderStock,
    deleteInventory,
    recalculateInventory
} from "../controllers/inventoryController.js";
import { generateInventoryPDF } from "../controllers/inventoryPDFController.js";
import { migrateTakaStock } from "../controllers/migrationController.js";

const router = express.Router();

// Migration Route
router.post("/migrate-taka", migrateTakaStock);

// Recalculate Route (Add this)
router.post("/recalculate", recalculateInventory);

// Get all inventory with optional filters
router.get("/", getInventory);

// Get inventory PDF (must be before /:id)
router.get("/pdf", generateInventoryPDF);

// Get specific inventory item
router.get("/:id", getInventoryById);

// Validate stock for order
router.post("/validate", validateOrderStock);

export default router;
// Delete inventory item
router.delete('/:id', deleteInventory);

