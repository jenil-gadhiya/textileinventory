import { http } from "./http";
import { Salesman } from "@/types/stock";

export const fetchSalesmen = async (): Promise<Salesman[]> => {
    const { data } = await http.get<Salesman[]>("/salesmen");
    return data;
};

export const createSalesman = async (payload: Omit<Salesman, "id" | "createdAt" | "updatedAt">) => {
    const { data } = await http.post<Salesman>("/salesmen", payload);
    return data;
};

export const updateSalesman = async (id: string, payload: Partial<Salesman>) => {
    const { data } = await http.put<Salesman>(`/salesmen/${id}`, payload);
    return data;
};

export const deleteSalesman = async (id: string) => {
    await http.delete(`/salesmen/${id}`);
};
