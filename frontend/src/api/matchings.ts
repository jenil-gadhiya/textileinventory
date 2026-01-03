import { http } from "./http";
import { Matching } from "@/types/stock";

export const fetchMatchings = async (): Promise<Matching[]> => {
  const { data } = await http.get<Matching[]>("/matchings");
  return data;
};

export const createMatching = async (payload: Omit<Matching, "id">) => {
  const { data } = await http.post<Matching>("/matchings", payload);
  return data;
};

export const updateMatching = async (id: string, payload: Partial<Matching>) => {
  const { data } = await http.put<Matching>(`/matchings/${id}`, payload);
  return data;
};

export const deleteMatching = async (id: string) => {
  await http.delete(`/matchings/${id}`);
};



