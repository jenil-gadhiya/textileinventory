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
import { createBroker, updateBroker, getBroker } from "@/api/brokers";

const schema = z.object({
    brokerName: z.string().min(1, "Broker name is required"),
    phoneNumber: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function BrokerFormPage() {
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
            brokerName: "",
            phoneNumber: ""
        }
    });

    useEffect(() => {
        if (id) {
            loadBroker();
        }
    }, [id]);

    const loadBroker = async () => {
        try {
            setFetchLoading(true);
            const data = await getBroker(id!);
            reset({
                brokerName: data.brokerName,
                phoneNumber: data.phoneNumber || ""
            });
        } catch (error) {
            console.error("Error loading broker:", error);
            alert("Failed to load broker");
            navigate("/brokers");
        } finally {
            setFetchLoading(false);
        }
    };

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        try {
            if (isEditMode) {
                await updateBroker(id!, values);
            } else {
                await createBroker(values);
            }
            navigate("/brokers");
        } catch (error: any) {
            console.error("Error saving broker:", error);
            alert(error?.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} broker`);
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">Loading broker...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEditMode ? "Edit Broker" : "Add Broker"}
                subtitle={isEditMode ? "Update broker details" : "Create a new broker contact"}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Broker Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Field label="Broker Name" required error={errors.brokerName?.message}>
                            <Input
                                {...register("brokerName")}
                                placeholder="Enter broker name"
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
                                onClick={() => navigate("/brokers")}
                                disabled={loading || isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || isSubmitting}>
                                {loading || isSubmitting ? "Saving..." : isEditMode ? "Update Broker" : "Create Broker"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
