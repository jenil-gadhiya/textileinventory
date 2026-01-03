import { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/80 focus-visible:ring-offset-2 ring-offset-surface-100",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-neon-cyan to-neon-purple text-slate-900 shadow-lg shadow-cyan-500/20 hover:scale-[1.01]",
        secondary:
          "glass-panel text-body hover:bg-surface-200/50 border-border/10",
        ghost:
          "text-muted hover:bg-surface-200/50 focus-visible:ring-0 focus-visible:ring-offset-0",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20"
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-6 text-base"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> { }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);

Button.displayName = "Button";



