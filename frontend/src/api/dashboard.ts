import { http } from "./http";

export interface DashboardStats {
    dateRange: {
        from: string; // ISO dates
        to: string;
    };
    stock: {
        totalSareePieces: number;
        totalTakaPieces: number;
        totalTakaMeters: number;
    };
    orders: {
        total: { count: number; value: number };
        pending: { count: number; value: number };
        completed: { count: number; value: number };
    };
    partySummary: Array<{
        id: string;
        name: string;
        orderCount: number;
        totalValue: number;
        completedCount: number;
        pendingCount: number;
    }>;
    productionTrend: Array<{ date: string; meters: number }>;
    totalBrokers: number;
    avgSalesRate: number;
    topQualities: Array<{ name: string; quantity: number; value: number }>;
}

export const fetchDashboardStats = async (from?: Date | string, to?: Date | string): Promise<DashboardStats> => {
    // Format dates as YYYY-MM-DD for backend
    const params: any = {};
    if (from) params.from = new Date(from).toISOString().split('T')[0];
    if (to) params.to = new Date(to).toISOString().split('T')[0];

    const { data } = await http.get<DashboardStats>("/dashboard/stats", { params });
    return data;
};
