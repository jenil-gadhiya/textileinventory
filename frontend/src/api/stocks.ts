import { http } from "./http";
import { StockEntry } from "@/types/stock";

export const fetchStocks = async (): Promise<StockEntry[]> => {
  const { data } = await http.get<StockEntry[]>("/stocks");
  return data;
};

export const createStock = async (payload: Omit<StockEntry, "id" | "createdAt" | "updatedAt">) => {
  const { data } = await http.post<StockEntry>("/stocks", payload);
  return data;
};

export const updateStock = async (id: string, payload: Partial<StockEntry>) => {
  const { data } = await http.put<StockEntry>(`/stocks/${id}`, payload);
  return data;
};

export const deleteStock = async (id: string) => {
  await http.delete(`/stocks/${id}`);
};



