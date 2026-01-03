import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockStore } from "@/store/useStockStore";
import { PageHeader } from "@/components/PageHeader";

const schema = z.object({
  machineNumber: z.string().min(1, "Required"),
  machineType: z.string().min(1, "Required"),
  shift: z.enum(["A", "B", "C"]),
  remarks: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function MachineFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { machines, addMachine, updateMachine } = useStockStore();
  const editingMachine = machines.find((m) => m.id === id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shift: "A"
    }
  });

  useEffect(() => {
    if (editingMachine) {
      reset(editingMachine);
    }
  }, [editingMachine, reset]);

  const onSubmit = async (values: FormValues) => {
    if (editingMachine) {
      await updateMachine(editingMachine.id, values);
    } else {
      await addMachine(values);
    }
    navigate("/machines");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={editingMachine ? "Edit Machine" : "Add Machine"}
        subtitle="Manage your loom, rapier or dobby masters."
      />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Machine Details</CardTitle>
              <CardDescription>Keep your machine masters up to date.</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <Field label="Machine Number" required error={errors.machineNumber?.message}>
              <Input placeholder="M-01" {...register("machineNumber")} />
            </Field>
            <Field label="Machine Type" required error={errors.machineType?.message}>
              <Input placeholder="Loom / Dobby / Rapier" {...register("machineType")} />
            </Field>
            <Field label="Shift" required error={errors.shift?.message}>
              <Select {...register("shift")}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </Select>
            </Field>
            <Field label="Remarks" error={errors.remarks?.message} className="sm:col-span-2">
              <Textarea placeholder="Notes about speed, maintenance etc." {...register("remarks")} />
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate("/machines")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {editingMachine ? "Update Machine" : "Add Machine"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

