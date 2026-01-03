import { http } from "./http";
import { Machine } from "@/types/stock";

export const fetchMachines = async (): Promise<Machine[]> => {
  const { data } = await http.get<Machine[]>("/machines");
  return data;
};

export const createMachine = async (payload: Omit<Machine, "id">) => {
  const { data } = await http.post<Machine>("/machines", payload);
  return data;
};

export const updateMachine = async (id: string, payload: Partial<Machine>) => {
  const { data } = await http.put<Machine>(`/machines/${id}`, payload);
  return data;
};

export const deleteMachine = async (id: string) => {
  await http.delete(`/machines/${id}`);
};



