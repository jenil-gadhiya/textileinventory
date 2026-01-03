import express from "express";
import {
    getSalesmen,
    getSalesman,
    createSalesman,
    updateSalesman,
    deleteSalesman,
} from "../controllers/salesmanController.js";

const router = express.Router();

router.route("/")
    .get(getSalesmen)
    .post(createSalesman);

router.route("/:id")
    .get(getSalesman)
    .put(updateSalesman)
    .delete(deleteSalesman);

export default router;
