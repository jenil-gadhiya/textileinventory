// Inventory API functions
import { http } from "./http";

export interface InventoryItem {
    id: string;
    qualityId: {
        id: string;
        fabricName: string;
    };
    designId?: {
        id: string;
        designNumber: string;
        designName?: string;
    };
    factoryId?: {
        id: string;
        factoryName: string;
    };
    matchingId?: {
        id: string;
        matchingName: string;
    };
    type: "Taka" | "Saree";
    totalMetersProduced: number;
    totalMetersOrdered: number;
    totalSareeProduced: number;
    totalSareeOrdered: number;
    cut?: number;
    availableMeters: number;
    availableSaree: number;
    // Taka specific
    totalTakaProduced: number;
    totalTakaOrdered: number;
    availableTaka: number;
}

export interface InsufficientStockItem {
    qualityId?: string;
    designId?: string;
    matchingId?: string;
    qualityName: string;
    designNumber?: string;
    matchingName?: string;
    cut?: number;
    type: string;
    required: number;
    available: number;
    shortage: number;
}

export interface ValidationResult {
    valid: boolean;
    insufficientItems: InsufficientStockItem[];
}

export async function fetchInventory(params?: {
    factory?: string;
    quality?: string;
    design?: string;
    type?: string;
}): Promise<InventoryItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.factory) queryParams.append("factory", params.factory);
    if (params?.quality) queryParams.append("quality", params.quality);
    if (params?.design) queryParams.append("design", params.design);
    if (params?.type) queryParams.append("type", params.type);

    const url = `/inventory${queryParams.toString() ? `?${queryParams}` : ""}`;
    const response = await http.get(url);
    return response.data;
}

export async function validateOrderStock(lineItems: any[]): Promise<ValidationResult> {
    const response = await http.post(`/inventory/validate`, { lineItems });
    return response.data;
}

export async function deleteInventory(id: string): Promise<void> {
    await http.delete(`/inventory/${id}`);
}

export async function recalculateInventory(): Promise<any> {
    const response = await http.post("/inventory/recalculate", {});
    return response.data;
}
