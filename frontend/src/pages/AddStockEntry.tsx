import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockStore } from "@/store/useStockStore";
import { QuantityType, ShiftType, StockStatus } from "@/types/stock";

const schema = z.object({
  machineNumber: z.string().min(1),
  machineType: z.string().min(1),
  shift: z.enum(["A", "B", "C"]),
  designNumber: z.string().min(1),
  designName: z.string().min(1),
  itemName: z.string().min(1),
  color: z.string().min(1),
  hsnCode: z.string().min(1),
  lotNumber: z.string().min(1),
  rollNumber: z.string().min(1),
  quantityMeters: z.number().nonnegative(),
  quantityWeightKg: z.number().nonnegative(),
  ratePerMeter: z.number().nonnegative(),
  ratePerKg: z.number().nonnegative(),
  quantityType: z.enum(["Meter", "Kg"]),
  totalAmount: z.number().nonnegative(),
  partyName: z.string().min(1),
  partyCode: z.string().optional(),
  brokerName: z.string().min(1),
  status: z.enum(["In", "Out"]),
  entryDate: z.string().min(1),
  entryTime: z.string().min(1),
  employeeName: z.string().min(1),
  remarks: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

const chipStyles: Record<StockStatus, string> = {
  In: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  Out: "bg-rose-500/15 text-rose-200 border border-rose-400/30"
};

export function AddStockEntryPage() {
  const { machines, parties, addEntry } = useStockStore();
  const [partySearch, setPartySearch] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shift: "A",
      quantityType: "Meter",
      quantityMeters: 0,
      quantityWeightKg: 0,
      ratePerMeter: 0,
      ratePerKg: 0,
      totalAmount: 0,
      status: "In",
      entryDate: new Date().toISOString().slice(0, 10),
      entryTime: new Date().toISOString().slice(11, 16)
    }
  });

  const quantityType = watch("quantityType");
  const quantityMeters = watch("quantityMeters");
  const quantityWeightKg = watch("quantityWeightKg");
  const ratePerMeter = watch("ratePerMeter");
  const ratePerKg = watch("ratePerKg");

  useEffect(() => {
    const total =
      quantityType === "Meter"
        ? (quantityMeters || 0) * (ratePerMeter || 0)
        : (quantityWeightKg || 0) * (ratePerKg || 0);
    setValue("totalAmount", Number(total.toFixed(2)));
  }, [quantityMeters, quantityWeightKg, ratePerMeter, ratePerKg, quantityType, setValue]);

  const filteredParties = useMemo(
    () =>
      parties.filter((p) =>
        p.partyName.toLowerCase().includes(partySearch.toLowerCase().trim())
      ),
    [parties, partySearch]
  );

  const onSubmit = async (values: FormValues) => {
    await addEntry(values);
    reset({
      ...values,
      rollNumber: "",
      remarks: "",
      quantityMeters: 0,
      quantityWeightKg: 0,
      totalAmount: 0
    });
  };

  const loadMachine = (machineNumber: string) => {
    const m = machines.find((item) => item.machineNumber === machineNumber);
    if (m) {
      setValue("machineType", m.machineType);
      setValue("shift", m.shift);
    }
  };

  const loadParty = (partyName: string) => {
    const p = parties.find((item) => item.partyName === partyName);
    if (p) {
      setValue("partyCode", p.partyCode || "");
      setValue("brokerName", p.brokerName ?? "");
    }
  };

  const sections = [
    {
      title: "Machine Information",
      fields: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Machine Number" required error={errors.machineNumber?.message}>
            <Select
              {...register("machineNumber", {
                onChange: (e) => loadMachine(e.target.value)
              })}
            >
              <option value="">Select machine</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.machineNumber}>
                  {machine.machineNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Machine Type" required error={errors.machineType?.message}>
            <Input placeholder="Loom, Rapier, etc." {...register("machineType")} />
          </Field>
          <Field label="Shift" required error={errors.shift?.message}>
            <Select {...register("shift")}>
              {(["A", "B", "C"] as ShiftType[]).map((shift) => (
                <option key={shift} value={shift}>
                  Shift {shift}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )
    },
    {
      title: "Design / Item Details",
      fields: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Design Number" required error={errors.designNumber?.message}>
            <Input placeholder="DN-1203" {...register("designNumber")} />
          </Field>
          <Field label="Design Name" required error={errors.designName?.message}>
            <Input placeholder="Galaxy Weave" {...register("designName")} />
          </Field>
          <Field label="Item Name" required error={errors.itemName?.message}>
            <Input placeholder="Shirting Fabric" {...register("itemName")} />
          </Field>
          <Field label="Color" required error={errors.color?.message}>
            <Input placeholder="Navy Blue" {...register("color")} />
          </Field>
          <Field label="HSN Code" required error={errors.hsnCode?.message}>
            <Input placeholder="5208" {...register("hsnCode")} />
          </Field>
          <Field label="Lot Number" required error={errors.lotNumber?.message}>
            <Input placeholder="LOT-23A" {...register("lotNumber")} />
          </Field>
        </div>
      )
    },
    {
      title: "Stock Entry Details",
      fields: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Roll Number" required error={errors.rollNumber?.message}>
            <Input placeholder="RN-050" {...register("rollNumber")} />
          </Field>
          <Field label="Quantity (Meters)" error={errors.quantityMeters?.message}>
            <Input
              type="number"
              step="0.01"
              {...register("quantityMeters", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Quantity (Kg)" error={errors.quantityWeightKg?.message}>
            <Input
              type="number"
              step="0.01"
              {...register("quantityWeightKg", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Rate per Meter" error={errors.ratePerMeter?.message}>
            <Input
              type="number"
              step="0.01"
              placeholder="₹"
              {...register("ratePerMeter", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Rate per Kg" error={errors.ratePerKg?.message}>
            <Input
              type="number"
              step="0.01"
              placeholder="₹"
              {...register("ratePerKg", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Quantity Type" required error={errors.quantityType?.message}>
            <Select {...register("quantityType")}>
              {(["Meter", "Kg"] as QuantityType[]).map((qt) => (
                <option key={qt} value={qt}>
                  {qt}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Total Amount" required error={errors.totalAmount?.message}>
            <Input type="number" step="0.01" {...register("totalAmount")} readOnly />
          </Field>
        </div>
      )
    },
    {
      title: "Party Information",
      fields: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Party Name" required error={errors.partyName?.message}>
            <div className="space-y-2">
              <Input
                placeholder="Search party"
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
              />
              <Select
                {...register("partyName", {
                  onChange: (e) => loadParty(e.target.value)
                })}
              >
                <option value="">Select party</option>
                {filteredParties.map((party) => (
                  <option key={party.id} value={party.partyName}>
                    {party.partyName}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
          <Field label="Party Code" error={errors.partyCode?.message}>
            <Input placeholder="Auto-filled" {...register("partyCode")} />
          </Field>
          <Field label="Broker Name" required error={errors.brokerName?.message}>
            <Input placeholder="Broker" {...register("brokerName")} />
          </Field>
        </div>
      )
    },
    {
      title: "Operation Details",
      fields: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Status" required error={errors.status?.message}>
            <div className="grid grid-cols-2 gap-2">
              {(["In", "Out"] as StockStatus[]).map((status) => (
                <label
                  key={status}
                  className={`flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-sm transition-all ${chipStyles[status]}`}
                >
                  <input
                    type="radio"
                    value={status}
                    className="sr-only"
                    {...register("status")}
                  />
                  {status}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Entry Date" required error={errors.entryDate?.message}>
            <Input type="date" {...register("entryDate")} />
          </Field>
          <Field label="Entry Time" required error={errors.entryTime?.message}>
            <Input type="time" {...register("entryTime")} />
          </Field>
          <Field label="Employee Name" required error={errors.employeeName?.message}>
            <Input placeholder="Handled by" {...register("employeeName")} />
          </Field>
          <Field label="Remarks" error={errors.remarks?.message} className="sm:col-span-3">
            <Textarea placeholder="Notes, QC details, etc." {...register("remarks")} />
          </Field>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Stock Control</p>
          <h2 className="text-2xl font-semibold text-white">Add Stock Entry</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" type="button" onClick={() => reset()}>
            Reset
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {sections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35 }}
          >
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>Capture precise data with guided fields.</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-cyan/60 to-neon-purple/60 blur-xl" />
              </CardHeader>
              <div className="space-y-4">{section.fields}</div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

