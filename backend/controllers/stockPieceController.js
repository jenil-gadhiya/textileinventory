import { StockPiece } from "../models/StockPiece.js";

// GET /api/stock-pieces/available?qualityId=xxx&designId=xxx&factoryId=xxx
export const getAvailableStockPieces = async (req, res, next) => {
    try {
        const { qualityId, designId, factoryId } = req.query;

        const query = {
            status: "Available"
        };

        if (qualityId) query.qualityId = qualityId;
        if (designId) query.designId = designId;
        if (factoryId) query.factoryId = factoryId;

        const pieces = await StockPiece.find(query)
            .populate("qualityId", "fabricName")
            .populate("designId", "designNumber designName")
            .populate("factoryId", "factoryName")
            .sort({ createdAt: 1 }); // FIFO order

        res.json(pieces);
    } catch (error) {
        next(error);
    }
};

// PATCH /api/stock-pieces/:id/status
export const updateStockPieceStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, challanId } = req.body;

        const piece = await StockPiece.findByIdAndUpdate(
            id,
            { status, challanId },
            { new: true }
        );

        if (!piece) {
            return res.status(404).json({ message: "Stock piece not found" });
        }

        res.json(piece);
    } catch (error) {
        next(error);
    }
};
