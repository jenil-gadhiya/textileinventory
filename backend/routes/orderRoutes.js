import express from "express";
import {
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder
} from "../controllers/orderController.js";

const router = express.Router();

router.route("/").get(getOrders).post(createOrder);
router.route("/:id").get(getOrder).put(updateOrder).delete(deleteOrder);

export default router;
