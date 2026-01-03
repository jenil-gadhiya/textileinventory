import { http } from "./http";
import { Production } from "@/types/stock";

export const fetchProductions = async (): Promise<Production[]> => {
    const { data } = await http.get<Production[]>("/productions");
    return data.map((p) => ({ ...p, id: (p as any)._id }));
};

export const getProduction = async (id: string): Promise<Production> => {
    const { data } = await http.get<Production>(`/productions/${id}`);
    return { ...data, id: (data as any)._id };
};

export const createProduction = async (
    payload: Omit<Production, "id" | "createdAt" | "updatedAt">
): Promise<Production> => {
    const { data } = await http.post<Production>("/productions", payload);
    return { ...data, id: (data as any)._id };
};

export const updateProduction = async (
    id: string,
    payload: Partial<Production>
): Promise<Production> => {
    const { data } = await http.put<Production>(`/productions/${id}`, payload);
    return { ...data, id: (data as any)._id };
};

export const deleteProduction = async (id: string) => {
    await http.delete(`/productions/${id}`);
};

export const getCatalogByQuality = async (qualityId: string) => {
    const { data } = await http.get(`/catalog/quality/${qualityId}`);
    return data.map((item: any) => ({ ...item, id: item._id }));
};
