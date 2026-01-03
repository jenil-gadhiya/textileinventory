import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FieldProps {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export function Field({ label, description, error, children, required, className }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Label>
          {label}
          {required && <span className="ml-1 text-neon-cyan">*</span>}
        </Label>
        {description && <span className="text-xs text-slate-400">{description}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}



