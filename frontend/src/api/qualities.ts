import { http } from "./http";
import { Quality } from "@/types/stock";

export const fetchQualities = async (): Promise<Quality[]> => {
  const { data } = await http.get<Quality[]>("/qualities");
  return data;
};

export const createQuality = async (payload: Omit<Quality, "id">) => {
  const { data } = await http.post<Quality>("/qualities", payload);
  return data;
};

export const updateQuality = async (id: string, payload: Partial<Quality>) => {
  const { data } = await http.put<Quality>(`/qualities/${id}`, payload);
  return data;
};

export const deleteQuality = async (id: string) => {
  await http.delete(`/qualities/${id}`);
};



