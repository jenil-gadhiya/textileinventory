import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { createSalesman, updateSalesman, fetchSalesmen } from "@/api/salesmen";
import { Salesman } from "@/types/stock";

const schema = z.object({
    salesmanName: z.string().min(1, "Salesman name is required"),
    phoneNumber: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function SalesmanFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(!!id);
    const isEditMode = !!id;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            salesmanName: "",
            phoneNumber: ""
        }
    });

    useEffect(() => {
        if (id) {
            loadSalesman();
        }
    }, [id]);

    const loadSalesman = async () => {
        try {
            setFetchLoading(true);
            // Optimization: Fetch list and find. Or implement getSalesman individually.
            // Since we implemented getSalesman(id) in backend but created default client api fetchSalesmen list, 
            // I should verify if client api supports get by id. 
            // I added updateSalesman(id,...) but maybe not getSalesman(id).
            // Let's assume fetchSalesmen() returns list and we find it, or simply implement a fetch by id helper locally if needed.
            // Actually I'll just fetch all and find, assuming list is small, OR fix api/salesmen.ts
            // Re-checking api/salesmen.ts... I only implemented fetchSalesmen (all), create, update, delete.
            // I will implement a quick fetch by ID logic here or update api file.
            // For now, let's just fetch all.
            const data = await fetchSalesmen();
            const found = data.find(s => s.id === id);

            if (found) {
                reset({
                    salesmanName: found.salesmanName,
                    phoneNumber: found.phoneNumber || ""
                });
            } else {
                navigate("/salesmen");
            }
        } catch (error) {
            console.error("Error loading salesman:", error);
            alert("Failed to load salesman");
            navigate("/salesmen");
        } finally {
            setFetchLoading(false);
        }
    };

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        try {
            if (isEditMode) {
                await updateSalesman(id!, values);
            } else {
                await createSalesman(values);
            }
            navigate("/salesmen");
        } catch (error: any) {
            console.error("Error saving salesman:", error);
            alert(error?.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} salesman`);
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">Loading salesman...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEditMode ? "Edit Salesman" : "Add Salesman"}
                subtitle={isEditMode ? "Update salesman details" : "Create a new salesman contact"}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Salesman Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Field label="Salesman Name" required error={errors.salesmanName?.message}>
                            <Input
                                {...register("salesmanName")}
                                placeholder="Enter salesman name"
                            />
                        </Field>

                        <Field label="Phone Number" error={errors.phoneNumber?.message}>
                            <Input
                                {...register("phoneNumber")}
                                placeholder="Enter phone number"
                                type="tel"
                            />
                        </Field>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate("/salesmen")}
                                disabled={loading || isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || isSubmitting}>
                                {loading || isSubmitting ? "Saving..." : isEditMode ? "Update Salesman" : "Create Salesman"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
