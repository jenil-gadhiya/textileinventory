import { http } from "./http";
import { Factory } from "@/types/stock";

export const fetchFactories = async (): Promise<Factory[]> => {
  const { data } = await http.get<Factory[]>("/factories");
  return data;
};

export const createFactory = async (payload: Omit<Factory, "id">) => {
  const { data } = await http.post<Factory>("/factories", payload);
  return data;
};

export const updateFactory = async (id: string, payload: Partial<Factory>) => {
  const { data } = await http.put<Factory>(`/factories/${id}`, payload);
  return data;
};

export const deleteFactory = async (id: string) => {
  await http.delete(`/factories/${id}`);
};



