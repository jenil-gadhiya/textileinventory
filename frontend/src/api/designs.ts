import { http } from "./http";
import { Design } from "@/types/stock";

export const fetchDesigns = async (): Promise<Design[]> => {
  const { data } = await http.get<Design[]>("/designs");
  return data;
};

export const createDesign = async (payload: Omit<Design, "id">) => {
  const { data } = await http.post<Design>("/designs", payload);
  return data;
};

export const updateDesign = async (id: string, payload: Partial<Design>) => {
  const { data } = await http.put<Design>(`/designs/${id}`, payload);
  return data;
};

export const deleteDesign = async (id: string) => {
  await http.delete(`/designs/${id}`);
};



