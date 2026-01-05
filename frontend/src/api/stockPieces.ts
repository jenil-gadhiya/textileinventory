// StockPiece API functions
import { http } from "./http";

export interface StockPiece {
    id: string;
    takaNo: string;
    meter: number;
    status: "Available" | "Sold";
    qualityId: {
        id: string;
        fabricName: string;
    };
    designId?: {
        id: string;
        designNumber: string;
        designName?: string;
    };
    factoryId: {
        id: string;
        factoryName: string;
    };
    productionId: string;
    challanId?: string;
}

export async function fetchAvailableStockPieces(
    qualityId?: string,
    designId?: string,
    factoryId?: string
): Promise<StockPiece[]> {
    const params = new URLSearchParams();
    if (qualityId) params.append("qualityId", qualityId);
    if (designId) params.append("designId", designId);
    if (factoryId) params.append("factoryId", factoryId);

    const response = await http.get(`/stock-pieces/available?${params}`);
    return response.data;
}

export async function updateStockPieceStatus(
    id: string,
    status: "Available" | "Sold",
    challanId?: string
): Promise<StockPiece> {
    const response = await http.patch(`/stock-pieces/${id}/status`, { status, challanId });
    return response.data;
}
