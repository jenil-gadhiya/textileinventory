import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useStockStore } from "@/store/useStockStore";

interface MatchingInput {
  id: string;
  value: string;
}

export function MatchingsPage() {
  const { matchings, addMatching, updateMatching, deleteMatching } = useStockStore();

  // Bulk Entry State
  const [inputs, setInputs] = useState<MatchingInput[]>([{ id: "1", value: "" }]);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = matchings.find((m) => m.id === editingId);

  // If editing → switch to single input mode
  useEffect(() => {
    if (editing) {
      setInputs([{ id: editing.id, value: editing.matchingName }]);
    } else {
      setInputs([{ id: Date.now().toString(), value: "" }]);
    }
  }, [editing]);

  const addNewInput = () => {
    const newId = Date.now().toString();
    setInputs((prev) => [...prev, { id: newId, value: "" }]);
    setTimeout(() => inputRefs.current[newId]?.focus(), 10);
  };

  const removeInput = (id: string) => {
    if (inputs.length === 1) {
      setInputs([{ id: Date.now().toString(), value: "" }]);
      return;
    }
    setInputs((prev) => prev.filter((input) => input.id !== id));
  };

  const updateInput = (id: string, value: string) => {
    setInputs((prev) =>
      prev.map((input) => (input.id === id ? { ...input, value } : input))
    );
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const idx = inputs.findIndex((i) => i.id === id);
      const curr = inputs[idx];

      if (curr.value.trim() && idx === inputs.length - 1) addNewInput();
      else if (idx < inputs.length - 1)
        inputRefs.current[inputs[idx + 1].id]?.focus();
    }
  };

  const submit = async () => {
    const validList = inputs.map((i) => i.value.trim()).filter(Boolean);
    if (validList.length === 0) return;

    setIsSubmitting(true);

    try {
      if (editing) {
        await updateMatching(editing.id, { matchingName: validList[0] });
        setEditingId(null);
      } else {
        for (const name of validList) {
          await addMatching({ matchingName: name });
        }
      }

      setInputs([{ id: Date.now().toString(), value: "" }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [search, setSearch] = useState("");
  const filteredMatchings = matchings.filter((m) =>
    m.matchingName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matching Names"
        subtitle={
          editing
            ? "Edit a single matching entry."
            : "Add multiple matching names quickly. Press TAB or ENTER to create more boxes."
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                {editing ? "Edit Matching" : "Add Matching Names"}
              </CardTitle>
              <CardDescription>
                {editing
                  ? "Update this matching entry."
                  : "Type a matching name, press TAB to add another."}
              </CardDescription>
            </div>
          </CardHeader>

          <div className="px-6 pb-6 space-y-3">
            <AnimatePresence mode="popLayout">
              {inputs.map((input, index) => (
                <motion.div
                  key={input.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Input
                    ref={(el) => (inputRefs.current[input.id] = el)}
                    placeholder={`Matching Name ${index + 1}`}
                    value={input.value}
                    onChange={(e) => updateInput(input.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(input.id, e)}
                  />

                  {inputs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInput(input.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 p-0"
                    >
                      ❌
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex justify-end gap-3 pt-4 border-t">
              {editing && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
              )}

              <Button onClick={submit} disabled={isSubmitting}>
                {editing
                  ? "Update Matching"
                  : isSubmitting
                    ? "Adding..."
                    : "Add All Matchings"}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="flex justify-end">
        <Input
          placeholder="Search matchings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        data={filteredMatchings}
        columns={[
          { key: "matchingName", header: "Matching" },
          {
            key: "id",
            header: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(row.id)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMatching(row.id)}>
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


