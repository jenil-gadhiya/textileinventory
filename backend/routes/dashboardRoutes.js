import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = express.Router();

// GET /api/dashboard/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/stats", getDashboardStats);

export default router;
