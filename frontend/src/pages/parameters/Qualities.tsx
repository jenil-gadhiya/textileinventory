import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useStockStore } from "@/store/useStockStore";

export function QualitiesPage() {
  const { qualities, addQuality, updateQuality, deleteQuality } = useStockStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = qualities.find((q) => q.id === editingId);
  const [form, setForm] = useState({ fabricName: "", loomType: "", fabricType: "" });

  useEffect(() => {
    if (editing) {
      setForm({
        fabricName: editing.fabricName,
        loomType: editing.loomType,
        fabricType: editing.fabricType
      });
    } else {
      setForm({ fabricName: "", loomType: "", fabricType: "" });
    }
  }, [editing]);

  const submit = async () => {
    if (editing) {
      await updateQuality(editing.id, form);
    } else {
      await addQuality(form);
    }
    setEditingId(null);
    setForm({ fabricName: "", loomType: "", fabricType: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Names" subtitle="Fabric, loom and type master." />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{editing ? "Edit Quality" : "Add Quality"}</CardTitle>
              <CardDescription>Keep qualities in sync across devices.</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 px-6 pb-6 sm:grid-cols-3">
            <Field label="Fabric Name" required>
              <Input
                value={form.fabricName}
                onChange={(e) => setForm((f) => ({ ...f, fabricName: e.target.value }))}
              />
            </Field>
            <Field label="Loom Type" required>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-body">
                  <input
                    type="radio"
                    name="loomType"
                    value="Power Loom"
                    checked={form.loomType === "Power Loom"}
                    onChange={(e) => setForm((f) => ({ ...f, loomType: e.target.value }))}
                  />
                  Power Loom
                </label>

                <label className="flex items-center gap-2 text-body">
                  <input
                    type="radio"
                    name="loomType"
                    value="Rapier"
                    checked={form.loomType === "Rapier"}
                    onChange={(e) => setForm((f) => ({ ...f, loomType: e.target.value }))}
                  />
                  Rapier
                </label>
              </div>
            </Field>

            <Field label="Fabric Type" required>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-body">
                  <input
                    type="radio"
                    name="fabricType"
                    value="Top Dyed"
                    checked={form.fabricType === "Top Dyed"}
                    onChange={(e) => setForm((f) => ({ ...f, fabricType: e.target.value }))}
                  />
                  Top Dyed
                </label>

                <label className="flex items-center gap-2 text-body">
                  <input
                    type="radio"
                    name="fabricType"
                    value="Grey"
                    checked={form.fabricType === "Grey"}
                    onChange={(e) => setForm((f) => ({ ...f, fabricType: e.target.value }))}
                  />
                  Grey
                </label>
              </div>
            </Field>

            <div className="sm:col-span-3 flex justify-end gap-3">
              {editing && (
                <Button variant="secondary" type="button" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              )}
              <Button onClick={submit}>{editing ? "Update Quality" : "Add Quality"}</Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <DataTable
        data={qualities}
        columns={[
          { key: "fabricName", header: "Fabric" },
          { key: "loomType", header: "Loom" },
          { key: "fabricType", header: "Fabric" },
          {
            key: "id",
            header: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(row.id)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteQuality(row.id)}>
                  Delete
                </Button>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}



