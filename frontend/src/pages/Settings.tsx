import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/Field";

export function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <div className="space-y-6">
      <PageHeader title="Settings & Profile" subtitle="Personalize your cockpit." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Toggle light or dark (placeholder).</CardDescription>
            </CardHeader>
            <div className="flex items-center gap-3 px-6 pb-6">
              <Button
                variant={theme === "dark" ? "primary" : "secondary"}
                onClick={() => setTheme("dark")}
              >
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "primary" : "secondary"}
                onClick={() => setTheme("light")}
              >
                Light
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Manage basic profile info.</CardDescription>
            </CardHeader>
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <Field label="Name">
                <Input placeholder="Alex Doe" />
              </Field>
              <Field label="Role">
                <Input placeholder="Inventory Manager" />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <Input placeholder="you@example.com" type="email" />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <Button>Save</Button>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}



