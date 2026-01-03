import express from "express";
import {
    getBrokers,
    getBroker,
    createBroker,
    updateBroker,
    deleteBroker
} from "../controllers/brokerController.js";
import { cleanupInvalidBrokers } from "../controllers/cleanupController.js";

const router = express.Router();

// Specific routes MUST come before parameterized routes
router.post("/cleanup/invalid", cleanupInvalidBrokers); // Changed to POST to avoid conflicts

router.get("/", getBrokers);
router.post("/", createBroker);
router.get("/:id", getBroker);
router.put("/:id", updateBroker);
router.delete("/:id", deleteBroker);

export default router;
