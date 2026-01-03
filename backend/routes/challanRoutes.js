import express from "express";
import {
    getChallans,
    getChallan,
    createChallan,
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

// Delete challan
router.delete("/:id", deleteChallan);

export default router;
