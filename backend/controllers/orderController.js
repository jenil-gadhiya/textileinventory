import { Order } from "../models/Order.js";
// import mongoose from "mongoose"; // Removed as transactions are no longer used in createOrder
// Removed as stock logic is no longer in createOrder
// import {
//     validateStockAvailability,
//     deductInventoryForOrder,
// } from "./inventoryController.js";

export const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find()
            .populate("partyId", "partyName")
            .populate("brokerId", "brokerName")
            .populate("salesmanId", "brokerName")
            .populate("lineItems.qualityId", "fabricName")
            .populate("lineItems.designId", "designNumber designName")
            .populate("lineItems.matchingQuantities.matchingId", "matchingName")
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("partyId")
            .populate("brokerId")
            .populate("salesmanId")
            .populate("lineItems.qualityId")
            .populate("lineItems.designId")
            .populate("lineItems.matchingQuantities.matchingId");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
    } catch (error) {
        next(error);
    }
};

// CHANGED: Order creation NO longer deducts stock
// Stock will be deducted when Challan is created
export const createOrder = async (req, res, next) => {
    try {
        // Simply create order - NO stock validation or deduction
        const order = new Order(req.body);
        await order.save();

        // Return populated order
        const populated = await Order.findById(order._id)
            .populate("partyId")
            .populate("brokerId")
            .populate("salesmanId")
            .populate("lineItems.qualityId")
            .populate("lineItems.designId")
            .populate("lineItems.matchingQuantities.matchingId");

        res.status(201).json(populated);
    } catch (error) {
        next(error);
    }
};

export const updateOrder = async (req, res, next) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate("partyId")
            .populate("brokerId")
            .populate("salesmanId")
            .populate("lineItems.qualityId")
            .populate("lineItems.designId")
            .populate("lineItems.matchingQuantities.matchingId");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
    } catch (error) {
        next(error);
    }
};

export const deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json({ message: "Order deleted successfully" });
    } catch (error) {
        next(error);
    }
};
