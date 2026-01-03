import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
const assetBase = (import.meta.env.VITE_API_URL || "http://localhost:5005/api").replace(/\/api$/, "");
import { Field } from "@/components/form/Field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useStockStore } from "@/store/useStockStore";
import { fetchImages, uploadImage, deleteImage } from "@/api/images";
import { ImageItem } from "@/types/stock";

export function ImagesPage() {
  const { qualities, designs } = useStockStore();
  const [qualityId, setQualityId] = useState("");
  const [designId, setDesignId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);

  const loadImages = async () => {
    const data = await fetchImages();
    setImages(data);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const submit = async () => {
    if (!file || !qualityId || !designId) return;
    const form = new FormData();
    form.append("image", file);
    form.append("qualityId", qualityId);
    form.append("designId", designId);
    await uploadImage(form);
    setFile(null);
    setQualityId("");
    setDesignId("");
    await loadImages();
  };

  const remove = async (id: string) => {
    await deleteImage(id);
    await loadImages();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Images" subtitle="Attach design visuals to qualities." />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>Files are stored on the server uploads folder.</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 px-6 pb-6 sm:grid-cols-3">
            <Field label="Quality" required>
              <Select value={qualityId} onChange={(e) => setQualityId(e.target.value)}>
                <option value="">Select quality</option>
                {qualities.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.fabricName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Design" required>
              <Select value={designId} onChange={(e) => setDesignId(e.target.value)}>
                <option value="">Select design</option>
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.designNumber} - {d.designName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Image File" required>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm text-slate-300"
              />
            </Field>
            <div className="sm:col-span-3 flex justify-end">
              <Button onClick={submit}>Upload</Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <DataTable
        data={images}
        columns={[
          {
            key: "imageUrl",
            header: "Preview",
            render: (row) => (
              <img
                src={`${assetBase}${row.imageUrl}`}
                alt=""
                className="h-12 w-16 rounded-lg object-cover"
              />
            )
          },
          { key: "qualityId", header: "Quality" },
          { key: "designId", header: "Design" },
          {
            key: "id",
            header: "Actions",
            render: (row) => (
              <Button size="sm" variant="ghost" onClick={() => remove(row.id)}>
                Delete
              </Button>
            )
          }
        ]}
      />
    </div>
  );
}

