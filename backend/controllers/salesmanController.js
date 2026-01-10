import { Salesman } from "../models/Salesman.js";

// GET /api/salesmen
export const getSalesmen = async (req, res, next) => {
    try {
        const salesmen = await Salesman.find().sort({ salesmanName: 1 });
        res.json(salesmen);
    } catch (error) {
        next(error);
    }
};

// GET /api/salesmen/:id
export const getSalesman = async (req, res, next) => {
    try {
        const salesman = await Salesman.findById(req.params.id);
        if (!salesman) {
            return res.status(404).json({ message: "Salesman not found" });
        }
        res.json(salesman);
    } catch (error) {
        next(error);
    }
};

// POST /api/salesmen
export const createSalesman = async (req, res, next) => {
    try {
        const salesman = new Salesman(req.body);
        await salesman.save();
        res.status(201).json(salesman);
    } catch (error) {
        next(error);
    }
};

// PUT /api/salesmen/:id
export const updateSalesman = async (req, res, next) => {
    try {
        const salesman = await Salesman.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!salesman) {
            return res.status(404).json({ message: "Salesman not found" });
        }
        res.json(salesman);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/salesmen/:id
export const deleteSalesman = async (req, res, next) => {
    try {
        const salesman = await Salesman.findByIdAndDelete(req.params.id);
        if (!salesman) {
            return res.status(404).json({ message: "Salesman not found" });
        }
        res.json({ message: "Salesman deleted successfully" });
    } catch (error) {
        next(error);
    }
};
