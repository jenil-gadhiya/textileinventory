import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { fetchBrokers, deleteBroker } from "@/api/brokers";
import { Broker } from "@/types/stock";

export function BrokerListPage() {
    const navigate = useNavigate();
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBrokers();
    }, []);

    const loadBrokers = async () => {
        try {
            setLoading(true);
            const data = await fetchBrokers();
            setBrokers(data);
        } catch (error) {
            console.error("Error loading brokers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this broker?")) {
            try {
                await deleteBroker(id);
                loadBrokers();
            } catch (error) {
                console.error("Error deleting broker:", error);
                alert("Failed to delete broker");
            }
        }
    };

    const handleEdit = (id: string) => {
        navigate(`/brokers/edit/${id}`);
    };

    const tableData = brokers.map((broker) => ({
        id: broker.id,
        brokerName: broker.brokerName,
        phoneNumber: broker.phoneNumber || "-",
        broker: broker, // Keep reference for actions
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Brokers"
                subtitle="Manage broker contacts"
                actions={
                    <Button onClick={() => navigate("/brokers/create")}>
                        + Add Broker
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
                            { key: "brokerName", header: "Broker Name" },
                            { key: "phoneNumber", header: "Phone Number" },
                            {
                                key: "broker" as any,
                                header: "Actions",
                                render: (row: any) => (
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleEdit(row.broker.id)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => handleDelete(row.broker.id, e)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        emptyMessage="No brokers yet. Add your first broker."
                    />
                )}
            </Card>
        </div>
    );
}
