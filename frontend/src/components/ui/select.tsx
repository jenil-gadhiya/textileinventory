import { forwardRef, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-border/10 bg-surface-200 px-3 text-sm text-body transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70 hover:border-border/30",
        "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg width='16' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.9rem_center]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);

Select.displayName = "Select";



