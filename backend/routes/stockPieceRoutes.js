import express from "express";
import {
    getAvailableStockPieces,
    updateStockPieceStatus
} from "../controllers/stockPieceController.js";

const router = express.Router();

// Get available stock pieces for a quality/design
router.get("/available", getAvailableStockPieces);

// Update stock piece status
router.patch("/:id/status", updateStockPieceStatus);

export default router;
