// StockPiece API functions
const API_BASE = "http://localhost:5005/api";

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
    qualityId: string,
    designId?: string,
    factoryId?: string
): Promise<StockPiece[]> {
    const params = new URLSearchParams();
    params.append("qualityId", qualityId);
    if (designId) params.append("designId", designId);
    if (factoryId) params.append("factoryId", factoryId);

    const response = await fetch(`${API_BASE}/stock-pieces/available?${params}`);
    if (!response.ok) {
        throw new Error("Failed to fetch stock pieces");
    }
    return response.json();
}

export async function updateStockPieceStatus(
    id: string,
    status: "Available" | "Sold",
    challanId?: string
): Promise<StockPiece> {
    const response = await fetch(`${API_BASE}/stock-pieces/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, challanId }),
    });
    if (!response.ok) {
        throw new Error("Failed to update stock piece status");
    }
    return response.json();
}
