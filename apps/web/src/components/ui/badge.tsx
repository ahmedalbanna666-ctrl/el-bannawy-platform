import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-primary-500/10 text-primary-600 dark:text-primary-400",
        secondary: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
        success: "bg-success-500/10 text-success-600 dark:text-success-400",
        warning: "bg-warning-500/10 text-warning-600 dark:text-warning-400",
        danger: "bg-danger-500/10 text-danger-600 dark:text-danger-400",
        info: "bg-info-500/10 text-info-600 dark:text-info-400",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: ReactNode;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
export type { BadgeProps };
