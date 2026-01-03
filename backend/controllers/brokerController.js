import { Broker } from "../models/Broker.js";

export const getBrokers = async (req, res, next) => {
    try {
        const brokers = await Broker.find().sort({ createdAt: -1 });
        res.json(brokers);
    } catch (error) {
        next(error);
    }
};

export const getBroker = async (req, res, next) => {
    try {
        const broker = await Broker.findById(req.params.id);
        if (!broker) {
            return res.status(404).json({ message: "Broker not found" });
        }
        res.json(broker);
    } catch (error) {
        next(error);
    }
};

export const createBroker = async (req, res, next) => {
    try {
        const broker = await Broker.create(req.body);
        res.status(201).json(broker);
    } catch (error) {
        next(error);
    }
};

export const updateBroker = async (req, res, next) => {
    try {
        const broker = await Broker.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!broker) {
            return res.status(404).json({ message: "Broker not found" });
        }
        res.json(broker);
    } catch (error) {
        next(error);
    }
};

export const deleteBroker = async (req, res, next) => {
    try {
        const broker = await Broker.findByIdAndDelete(req.params.id);
        if (!broker) {
            return res.status(404).json({ message: "Broker not found" });
        }
        res.json({ message: "Broker deleted successfully" });
    } catch (error) {
        next(error);
    }
};
