// Challan API functions
import { http } from "./http";

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
    selectedPieces?: any[];
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
    const response = await http.get("/challans");
    return response.data;
}

export async function fetchChallan(id: string): Promise<Challan> {
    const response = await http.get(`/challans/${id}`);
    return response.data;
}

export async function createChallan(challanData: any): Promise<Challan> {
    const response = await http.post("/challans", challanData);
    return response.data;
}

export async function updateChallan(id: string, challanData: any): Promise<Challan> {
    const response = await http.put(`/challans/${id}`, challanData);
    return response.data;
}

export async function deleteChallan(id: string): Promise<void> {
    await http.delete(`/challans/${id}`);
}
