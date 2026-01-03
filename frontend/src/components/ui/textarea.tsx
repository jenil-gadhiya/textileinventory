import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-xl border border-border/10 bg-surface-200 px-3 py-2 text-sm text-body placeholder:text-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70 hover:border-border/30",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";



