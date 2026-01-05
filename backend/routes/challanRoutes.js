import express from "express";
import {
    getChallans,
    getChallan,
    createChallan,
    updateChallan,
    deleteChallan,
} from "../controllers/challanController.js";
import { generateChallanPDF } from "../controllers/challanPDFController.js";

const router = express.Router();

// Get all challans
router.get("/", getChallans);

// Get single challan (must be before /:id/pdf to avoid conflict)
router.get("/:id/pdf", generateChallanPDF);

// Get single challan detail
router.get("/:id", getChallan);

// Create challan from order
router.post("/", createChallan);

// Update challan
router.put("/:id", updateChallan);

// Delete challan
router.delete("/:id", deleteChallan);

export default router;
