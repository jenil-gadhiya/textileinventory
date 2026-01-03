import { http } from "./http";
import { ImageItem } from "@/types/stock";

export const fetchImages = async (): Promise<ImageItem[]> => {
  const { data } = await http.get<ImageItem[]>("/images");
  return data;
};

export const uploadImage = async (form: FormData) => {
  const { data } = await http.post<ImageItem>("/images", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const deleteImage = async (id: string) => {
  await http.delete(`/images/${id}`);
};



