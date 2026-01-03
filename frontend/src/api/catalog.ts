import { http } from "./http";
import { Catalog } from "@/types/stock";

export const fetchCatalog = async (): Promise<Catalog[]> => {
  const { data } = await http.get<Catalog[]>("/catalog");
  return data;
};

export const getCatalog = async (id: string): Promise<Catalog> => {
  const { data } = await http.get<Catalog>(`/catalog/${id}`);
  return data;
};

export const createCatalog = async (payload: {
  stockType: "Saree" | "Taka";
  qualityId: string;
  designId: string;
  matchingIds?: string[];
  designIds?: string[];
  cut?: number;
}) => {
  const { data } = await http.post<Catalog[]>("/catalog", payload);
  return data;
};

export const updateCatalog = async (id: string, payload: Partial<Catalog>) => {
  const { data } = await http.put<Catalog>(`/catalog/${id}`, payload);
  return data;
};

export const deleteCatalog = async (id: string) => {
  await http.delete(`/catalog/${id}`);
};

