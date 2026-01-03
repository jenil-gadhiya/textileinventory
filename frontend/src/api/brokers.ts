import { http } from "./http";
import { Broker } from "@/types/stock";

export const fetchBrokers = async (): Promise<Broker[]> => {
    const { data } = await http.get<Broker[]>("/brokers");
    // Backend already transforms _id to id via toJSON, no need to map
    return data;
};

export const getBroker = async (id: string): Promise<Broker> => {
    const { data } = await http.get<Broker>(`/brokers/${id}`);
    return data;
};

export const createBroker = async (
    payload: Omit<Broker, "id" | "createdAt" | "updatedAt">
): Promise<Broker> => {
    const { data } = await http.post<Broker>("/brokers", payload);
    return data;
};

export const updateBroker = async (
    id: string,
    payload: Partial<Omit<Broker, "id" | "createdAt" | "updatedAt">>
): Promise<Broker> => {
    const { data } = await http.put<Broker>(`/brokers/${id}`, payload);
    return data;
};

export const deleteBroker = async (id: string): Promise<void> => {
    await http.delete(`/brokers/${id}`);
};
