import { http } from "./http";
import { Order } from "@/types/stock";

export const fetchOrders = async (): Promise<Order[]> => {
    const { data } = await http.get<Order[]>("/orders");
    return data.map((order: any) => ({
        ...order,
        id: order._id
    }));
};

export const getOrder = async (id: string): Promise<Order> => {
    const { data } = await http.get<Order>(`/orders/${id}`);
    return { ...data, id: (data as any)._id };
};

export const createOrder = async (
    payload: Omit<Order, "id" | "orderNo" | "createdAt" | "updatedAt">
): Promise<Order> => {
    const { data } = await http.post<Order>("/orders", payload);
    return { ...data, id: (data as any)._id };
};

export const updateOrder = async (
    id: string,
    payload: Partial<Omit<Order, "id" | "orderNo" | "createdAt" | "updatedAt">>
): Promise<Order> => {
    const { data } = await http.put<Order>(`/orders/${id}`, payload);
    return { ...data, id: (data as any)._id };
};

export const deleteOrder = async (id: string): Promise<void> => {
    await http.delete(`/orders/${id}`);
};
