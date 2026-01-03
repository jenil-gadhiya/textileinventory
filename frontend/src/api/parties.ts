import { http } from "./http";
import { Party } from "@/types/stock";

export const fetchParties = async (): Promise<Party[]> => {
  const { data } = await http.get<Party[]>("/parties");
  return data;
};

export const createParty = async (payload: Omit<Party, "id">) => {
  const { data } = await http.post<Party>("/parties", payload);
  return data;
};

export const updateParty = async (id: string, payload: Partial<Party>) => {
  const { data } = await http.put<Party>(`/parties/${id}`, payload);
  return data;
};

export const deleteParty = async (id: string) => {
  await http.delete(`/parties/${id}`);
};



