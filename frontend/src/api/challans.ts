// Challan API functions
const API_BASE = "http://localhost:5005/api";

export interface ChallanItem {
    orderLineItemIndex: number;
    qualityId: string;
    designId?: string;
    type: "Taka" | "Saree";
    orderedQuantity: number;
    challanQuantity: number;
    matchingQuantities?: Array<{
        matchingId: string;
        orderedQuantity: number;
        challanQuantity: number;
    }>;
    cut?: number;
}

export interface Challan {
    id: string;
    challanNo: string;
    challanDate: string;
    orderId: string;
    partyId: string;
    items: ChallanItem[];
    status: string;
    transportDetails?: string;
    vehicleNumber?: string;
    remarks?: string;
}

export async function fetchChallans(): Promise<Challan[]> {
    const response = await fetch(`${API_BASE}/challans`);
    if (!response.ok) throw new Error("Failed to fetch challans");
    return response.json();
}

export async function fetchChallan(id: string): Promise<Challan> {
    const response = await fetch(`${API_BASE}/challans/${id}`);
    if (!response.ok) throw new Error("Failed to fetch challan");
    return response.json();
}

export async function createChallan(challanData: any): Promise<Challan> {
    const response = await fetch(`${API_BASE}/challans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challanData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw error;
    }

    return response.json();
}

export async function deleteChallan(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/challans/${id}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        const error = await response.json();
        throw error;
    }
}
