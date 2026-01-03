import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useStockStore } from "@/store/useStockStore";
import { createCatalog, updateCatalog, getCatalog } from "@/api/catalog";
import { Matching, Catalog } from "@/types/stock";

const schema = z.object({
  stockType: z.enum(["Saree", "Taka"]),
  qualityId: z.string().min(1, "Required"),
  designId: z.string().optional(), // Optional for Taka mode in create
  matchingIds: z.array(z.string()).optional(),
  cut: z.number().min(0.01, "Required").optional()
});

type FormValues = z.infer<typeof schema>;

export function CatalogFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { qualities, designs, matchings, loadAll } = useStockStore();
  const [selectedMatchings, setSelectedMatchings] = useState<string[]>([]);
  const [selectedDesigns, setSelectedDesigns] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const isEditMode = !!id;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting: formIsSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      stockType: "Saree"
    }
  });




  const stockType = watch("stockType");
  const isSaree = stockType === "Saree";

  // Load catalog data for edit mode
  useEffect(() => {
    if (id) {
      loadCatalogData();
    }
  }, [id]);

  const loadCatalogData = async () => {
    try {
      setLoading(true);
      const data = await getCatalog(id!);
      setEditingCatalog(data);

      // Handle populated fields
      const qualityId = typeof data.qualityId === "object" ? data.qualityId.id : data.qualityId;
      const designId = typeof data.designId === "object" ? data.designId.id : data.designId;
      const matchingId = data.matchingId
        ? (typeof data.matchingId === "object" ? data.matchingId.id : data.matchingId)
        : null;

      reset({
        stockType: data.stockType as "Saree" | "Taka",
        qualityId,
        designId,
        matchingIds: matchingId ? [matchingId] : [],
        cut: data.cut || undefined
      });

      if (matchingId) {
        setSelectedMatchings([matchingId]);
      }
    } catch (error) {
      console.error("Error loading catalog:", error);
      alert("Failed to load catalog entry");
      navigate("/catalog");
    } finally {
      setLoading(false);
    }
  };

  // Sort matchings and designs alphabetically
  const sortedMatchings = [...matchings].sort((a, b) =>
    a.matchingName.localeCompare(b.matchingName)
  );
  const sortedDesigns = [...designs].sort((a, b) =>
    a.designNumber.localeCompare(b.designNumber)
  );

  useEffect(() => {
    // Reset selections when switching stock type
    if (isSaree) {
      setSelectedDesigns([]);
      setValue("designId", "");
    } else {
      setSelectedMatchings([]);
      setValue("matchingIds", []);
      setValue("cut", undefined);
    }
  }, [isSaree, setValue]);

  const toggleMatching = (matchingId: string) => {
    const newSelection = selectedMatchings.includes(matchingId)
      ? selectedMatchings.filter((id) => id !== matchingId)
      : [...selectedMatchings, matchingId];
    setSelectedMatchings(newSelection);
    setValue("matchingIds", newSelection);
  };

  const toggleDesign = (designId: string) => {
    const newSelection = selectedDesigns.includes(designId)
      ? selectedDesigns.filter((id) => id !== designId)
      : [...selectedDesigns, designId];
    setSelectedDesigns(newSelection);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isSaree) {
        if (selectedMatchings.length === 0) {
          alert("Please select at least one matching for Saree");
          setIsSubmitting(false);
          return;
        }
        if (!values.cut || values.cut <= 0) {
          alert("Please enter a valid cut value for Saree");
          setIsSubmitting(false);
          return;
        }
      } else {
        // Taka mode
        if (isEditMode) {
          // In edit mode, check the designId field (dropdown)
          if (!values.designId) {
            alert("Please select a design for Taka");
            setIsSubmitting(false);
            return;
          }
        } else {
          // In create mode, check selectedDesigns (checkboxes)
          if (selectedDesigns.length === 0) {
            alert("Please select at least one design for Taka");
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (isEditMode && editingCatalog) {
        // Update existing catalog entry (single entry, single matching)
        if (isSaree && selectedMatchings.length === 0) {
          alert("Please select a matching for Saree");
          setIsSubmitting(false);
          return;
        }
        if (isSaree && (!values.cut || values.cut <= 0)) {
          alert("Please enter a valid cut value for Saree");
          setIsSubmitting(false);
          return;
        }

        await updateCatalog(id!, {
          stockType: values.stockType,
          qualityId: values.qualityId,
          designId: values.designId || "",
          matchingId: isSaree && selectedMatchings.length > 0 ? selectedMatchings[0] : null,
          cut: isSaree ? values.cut : null
        });
      } else {
        // Create new catalog entries
        if (isSaree) {
          // Saree: same quality + same design + multiple matchings
          if (!values.designId) {
            alert("Please select a design for Saree");
            setIsSubmitting(false);
            return;
          }
          await createCatalog({
            stockType: values.stockType,
            qualityId: values.qualityId,
            designId: values.designId,
            matchingIds: selectedMatchings,
            cut: values.cut
          });
        } else {
          // Taka: same quality + multiple designs
          await createCatalog({
            stockType: values.stockType,
            qualityId: values.qualityId,
            designId: "", // Will be ignored on backend for Taka
            designIds: selectedDesigns,
            cut: undefined
          });
        }
      }

      await loadAll();
      navigate("/catalog");
    } catch (error: any) {
      console.error("Error saving catalog:", error);
      alert(error?.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} catalog entry`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading catalog entry...</p>
      </div>
    );
  }

  const addButton = (
    <div className="flex justify-end mb-4">
      <Button onClick={() => navigate("/catalog/create")}>
        + Add Catalog
      </Button>
    </div>
  );

  return (


    <div className="space-y-6">

      <PageHeader
        title={isEditMode ? "Edit Catalog Entry" : "Add Catalog Entry"}
        subtitle={isEditMode ? "Update catalog entry details." : "Create catalog entries for Saree or Taka stock types."}

      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Catalog Details</CardTitle>
              <div className="p-4">
                {isEditMode
                  ? isSaree
                    ? "Update quality, design, matching, and cut value."
                    : "Update quality and design for Taka stock."
                  : isSaree
                    ? "Select quality, design, matchings, and enter cut value."
                    : "Select quality and design for Taka stock."}
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Stock Type" required error={errors.stockType?.message}>
                <Select {...register("stockType")} className="bg-surface-200 text-body dark:bg-slate-800">
                  <option value="Saree">Saree</option>
                  <option value="Taka">Taka</option>
                </Select>
              </Field>

              <Field label="Quality" required error={errors.qualityId?.message}>
                <Select {...register("qualityId")} className="bg-surface-200 text-body dark:bg-slate-800">
                  <option value="">Select Quality</option>
                  {qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.fabricName} ({q.loomType} - {q.fabricType})
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Design selection - dropdown for Saree (edit mode) or single select in edit, checkbox for Taka (create mode) */}
              {(isEditMode || isSaree) && (
                <Field label="Design Number" required error={errors.designId?.message}>
                  <Select {...register("designId")} className="bg-surface-200 text-body dark:bg-slate-800">
                    <option value="">Select Design</option>
                    {designs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.designNumber} {d.designName ? `- ${d.designName}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <AnimatePresence>
                {isSaree && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="sm:col-span-2"
                  >
                    <Field
                      label="Cut"
                      required={isSaree}
                      error={errors.cut?.message}
                    >
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter cut value"
                        className="bg-surface-200 text-body dark:bg-slate-800"
                        {...register("cut", {
                          valueAsNumber: true,
                          required: isSaree
                        })}
                      />
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {isSaree && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {isEditMode ? (
                    <Field
                      label="Matching"
                      required={isSaree}
                      error={errors.matchingIds?.message}
                    >
                      <Select
                        value={selectedMatchings[0] || ""}
                        className="bg-surface-200 text-body dark:bg-slate-800"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            setSelectedMatchings([value]);
                            setValue("matchingIds", [value]);
                          } else {
                            setSelectedMatchings([]);
                            setValue("matchingIds", []);
                          }
                        }}
                      >
                        <option value="">Select Matching</option>
                        {sortedMatchings.map((matching) => (
                          <option key={matching.id} value={matching.id}>
                            {matching.matchingName}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <Field
                      label="Matching List"
                      required={isSaree}
                      error={
                        isSaree && selectedMatchings.length === 0
                          ? "Select at least one matching"
                          : undefined
                      }
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                        {sortedMatchings.map((matching) => (
                          <label
                            key={matching.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMatchings.includes(matching.id)}
                              onChange={() => toggleMatching(matching.id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-neon-cyan focus:ring-neon-cyan/50"
                            />
                            <span className="text-sm text-slate-200">
                              {matching.matchingName}
                            </span>
                          </label>
                        ))}
                        {sortedMatchings.length === 0 && (
                          <p className="text-sm text-slate-400 col-span-full">
                            No matchings available. Add matchings first.
                          </p>
                        )}
                      </div>
                    </Field>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Design checkboxes for Taka mode (create only) */}
            <AnimatePresence>
              {!isSaree && !isEditMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <Field
                    label="Design Numbers"
                    required={!isSaree}
                    error={
                      !isSaree && selectedDesigns.length === 0
                        ? "Select at least one design"
                        : undefined
                    }
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                      {sortedDesigns.map((design) => (
                        <label
                          key={design.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDesigns.includes(design.id)}
                            onChange={() => toggleDesign(design.id)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-neon-cyan focus:ring-neon-cyan/50"
                          />
                          <span className="text-sm text-slate-200">
                            {design.designNumber}
                          </span>
                        </label>
                      ))}
                      {sortedDesigns.length === 0 && (
                        <p className="text-sm text-slate-400 col-span-full">
                          No designs available. Add designs first.
                        </p>
                      )}
                    </div>
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/catalog")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || formIsSubmitting}>
                {isSubmitting ? "Saving..." : isEditMode ? "Update Catalog" : "Save Catalog"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

