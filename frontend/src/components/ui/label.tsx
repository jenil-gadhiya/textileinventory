import { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends LabelHTMLAttributes<HTMLLabelElement> { }

export function Label({ className, ...props }: Props) {
  return (
    <label
      className={cn("text-sm font-medium text-muted tracking-tight", className)}
      {...props}
    />
  );
}



