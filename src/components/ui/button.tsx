import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium tracking-tight outline-none select-none disabled:pointer-events-none disabled:opacity-40 transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-out active:not-disabled:scale-[0.96] focus-visible:shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_var(--color-steel)]",
  {
    variants: {
      variant: {
        default: "bg-fg text-bg hover:bg-steel",
        ghost: "bg-transparent text-fg hover:bg-raised",
        outline: "bg-transparent text-fg hairline hairline-hover",
        subtle: "bg-raised text-fg hover:bg-surface",
      },
      size: {
        default: "h-11 rounded-md px-4 text-sm",
        sm: "h-9 rounded-sm px-3 text-sm",
        lg: "h-12 rounded-lg px-5 text-sm",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
