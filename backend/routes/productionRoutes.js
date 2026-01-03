import express from "express";
import {
    getProductions,
    getProduction,
    createProduction,
    updateProduction,
    deleteProduction
} from "../controllers/productionController.js";

const router = express.Router();

router.get("/", getProductions);
router.get("/:id", getProduction);
router.post("/", createProduction);
router.put("/:id", updateProduction);
router.delete("/:id", deleteProduction);

export default router;
