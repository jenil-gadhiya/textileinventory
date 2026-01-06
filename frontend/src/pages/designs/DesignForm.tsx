import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { createDesign } from "@/api/designs";
import { useStockStore } from "@/store/useStockStore";

interface DesignNumberInput {
  id: string;
  value: string;
}

export function DesignFormPage() {
  const navigate = useNavigate();
  const { loadAll } = useStockStore();
  const [inputs, setInputs] = useState<DesignNumberInput[]>([{ id: "1", value: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addNewInput = () => {
    const newId = Date.now().toString();
    setInputs((prev) => [...prev, { id: newId, value: "" }]);
    setTimeout(() => {
      inputRefs.current[newId]?.focus();
    }, 10);
  };

  const removeInput = (id: string) => {
    if (inputs.length === 1) {
      setInputs([{ id: "1", value: "" }]);
      return;
    }
    setInputs((prev) => prev.filter((input) => input.id !== id));
  };

  const updateInput = (id: string, value: string) => {
    // Allow alphanumeric values
    setInputs((prev) =>
      prev.map((input) => (input.id === id ? { ...input, value } : input))
    );
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const currentIndex = inputs.findIndex((input) => input.id === id);
      const currentInput = inputs[currentIndex];

      if (currentInput.value.trim() && currentIndex === inputs.length - 1) {
        addNewInput();
      } else if (currentIndex < inputs.length - 1) {
        const nextInput = inputs[currentIndex + 1];
        inputRefs.current[nextInput.id]?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validNumbers = inputs
        .map((input) => input.value.trim())
        .filter((val) => val.length > 0);

      if (validNumbers.length === 0) {
        alert("Please enter at least one design number");
        setIsSubmitting(false);
        return;
      }

      for (const num of validNumbers) {
        await createDesign({
          designNumber: num,
          designName: "",
          itemName: "",
          hsnCode: "",
          color: "",
          gsm: "",
          lotNumber: ""
        });
      }

      await loadAll();
      setInputs([{ id: Date.now().toString(), value: "" }]);
      navigate("/designs");
    } catch (error: any) {
      console.error("Error adding designs:", error);
      alert(error?.response?.data?.message || "Failed to add designs");
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="space-y-6">

      <PageHeader
        title="Add Design Numbers"
        subtitle="Quickly add multiple design numbers. Type design numbers and press TAB or ENTER to add more."
      />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Design Numbers</CardTitle>
              <CardDescription>Enter design numbers. Press TAB or ENTER to add another.</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
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
                    <div className="flex-1">
                      <Input
                        ref={(el) => {
                          inputRefs.current[input.id] = el;
                        }}
                        type="text"
                        placeholder={`Design Number ${index + 1}`}
                        value={input.value}
                        onChange={(e) => updateInput(input.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(input.id, e)}
                        className="bg-transparent text-body border-border/50"
                      />
                    </div>
                    {inputs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInput(input.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0 p-0"
                      >
                        <span className="text-lg">❌</span>
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/designs")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add All Designs"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

