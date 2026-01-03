import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { fetchSalesmen, deleteSalesman } from "@/api/salesmen";
import { Salesman } from "@/types/stock";

export function SalesmanListPage() {
    const navigate = useNavigate();
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSalesmen();
    }, []);

    const loadSalesmen = async () => {
        try {
            setLoading(true);
            const data = await fetchSalesmen();
            setSalesmen(data);
        } catch (error) {
            console.error("Error loading salesmen:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this salesman?")) {
            try {
                await deleteSalesman(id);
                loadSalesmen();
            } catch (error) {
                console.error("Error deleting salesman:", error);
                alert("Failed to delete salesman");
            }
        }
    };

    const handleEdit = (id: string) => {
        navigate(`/salesmen/edit/${id}`);
    };

    const tableData = salesmen.map((salesman) => ({
        id: salesman.id,
        salesmanName: salesman.salesmanName,
        phoneNumber: salesman.phoneNumber || "-",
        salesman: salesman, // Keep reference for actions
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Salesmen"
                subtitle="Manage salesman contacts"
                actions={
                    <Button onClick={() => navigate("/salesmen/create")}>
                        + Add Salesman
                    </Button>
                }
            />

            <Card>
                {loading ? (
                    <div className="p-6 text-center text-slate-400">Loading...</div>
                ) : (
                    <DataTable
                        data={tableData}
                        columns={[
                            { key: "salesmanName", header: "Salesman Name" },
                            { key: "phoneNumber", header: "Phone Number" },
                            {
                                key: "salesman" as any,
                                header: "Actions",
                                render: (row: any) => (
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleEdit(row.salesman.id)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => handleDelete(row.salesman.id, e)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        emptyMessage="No salesmen yet. Add your first salesman."
                    />
                )}
            </Card>
        </div>
    );
}
