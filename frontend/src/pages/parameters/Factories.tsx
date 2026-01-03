import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useStockStore } from "@/store/useStockStore";

const emptyForm = {
  factoryName: "",
  gstNo: "",
  factoryNo: "",
  prefix: "",
  address: "",
  contactPerson: "",
  phone: "",
  email: ""
};

export function FactoriesPage() {
  const { factories, addFactory, updateFactory, deleteFactory } = useStockStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = factories.find((f) => f.id === editingId);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editing) {
      setForm({
        factoryName: editing.factoryName || "",
        gstNo: editing.gstNo || "",
        factoryNo: editing.factoryNo || "",
        prefix: editing.prefix || "",
        address: editing.address || "",
        contactPerson: editing.contactPerson || "",
        phone: editing.phone || "",
        email: editing.email || ""
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  const submit = async () => {
    if (!form.factoryName) return;
    if (editing) {
      await updateFactory(editing.id, form);
    } else {
      await addFactory(form);
    }
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Factory" subtitle="Factory master with GST and contact details." />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{editing ? "Edit Factory" : "Add Factory"}</CardTitle>
              <CardDescription>Changes sync instantly via API.</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
            <Field label="Factory Name" required>
              <Input
                value={form.factoryName}
                onChange={(e) => setForm((f) => ({ ...f, factoryName: e.target.value }))}
              />
            </Field>
            <Field label="Factory No">
              <Input
                value={form.factoryNo}
                onChange={(e) => setForm((f) => ({ ...f, factoryNo: e.target.value }))}
              />
            </Field>
            <Field label="Prefix">
              <Input
                value={form.prefix}
                onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
              />
            </Field>
            <Field label="GST No">
              <Input value={form.gstNo} onChange={(e) => setForm((f) => ({ ...f, gstNo: e.target.value }))} />
            </Field>
            <Field label="Contact Person">
              <Input
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-3">
              {editing && (
                <Button variant="secondary" type="button" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              )}
              <Button onClick={submit}>{editing ? "Update Factory" : "Add Factory"}</Button>
            </div>
          </div >
        </Card >
      </motion.div >

      <DataTable
        data={factories}
        columns={[
          { key: "factoryName", header: "Name" },
          { key: "factoryNo", header: "No" },
          { key: "prefix", header: "Prefix" },
          { key: "phone", header: "Phone" },
          { key: "gstNo", header: "GST" },
          {
            key: "id",
            header: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(row.id)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteFactory(row.id)}>
                  Delete
                </Button>
              </div>
            )
          }
        ]}
      />
    </div >
  );
}



