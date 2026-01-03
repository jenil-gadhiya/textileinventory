import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { }

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-surface-200 px-3 text-sm text-body placeholder:text-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70",
      "hover:border-border/30",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";



