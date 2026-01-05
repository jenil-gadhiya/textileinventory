import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockStore } from "@/store/useStockStore";
import { PageHeader } from "@/components/PageHeader";

const schema = z.object({
  partyName: z.string().min(1, "Required"),
  partyCode: z.string().optional(),
  brokerName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNo: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function PartyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, addParty, updateParty } = useStockStore();
  const editing = parties.find((p) => p.id === id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    if (editing) reset(editing);
  }, [editing, reset]);

  const onSubmit = async (values: FormValues) => {
    if (editing) {
      await updateParty(editing.id, values);
    } else {
      await addParty(values);
    }
    navigate("/parties");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={editing ? "Edit Party" : "Add Party"}
        subtitle="Manage your customer/vendor masters."
      />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Party Details</CardTitle>
              <CardDescription>Keep codes, GST and contact aligned.</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <Field label="Party Name" required error={errors.partyName?.message}>
              <Input placeholder="Party name" {...register("partyName")} />
            </Field>
            <Field label="Party Code" error={errors.partyCode?.message}>
              <Input placeholder="Code" {...register("partyCode")} />
            </Field>
            <Field label="Broker Name" error={errors.brokerName?.message}>
              <Input placeholder="Broker" {...register("brokerName")} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input placeholder="Contact" {...register("phone")} />
            </Field>
            <Field label="GST Number" error={errors.gstNo?.message}>
              <Input placeholder="GSTIN" {...register("gstNo")} />
            </Field>
            <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
              <Textarea placeholder="Full address" {...register("address")} />
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate("/parties")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {editing ? "Update Party" : "Add Party"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

