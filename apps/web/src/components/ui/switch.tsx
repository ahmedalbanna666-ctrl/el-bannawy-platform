"use client";

import { forwardRef, type InputHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  helperText?: string;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, helperText, id, checked, ...props }, ref) => {
    const generatedId = useId();
    const switchId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <input
              ref={ref}
              id={switchId}
              type="checkbox"
              role="switch"
              checked={checked}
              className="peer sr-only"
              {...props}
            />
            <span
              className={cn(
                "block h-6 w-11 cursor-pointer rounded-full border-2 border-neutral-300 bg-neutral-200 transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/20 peer-focus-visible:ring-offset-1 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-700",
                checked &&
                  "border-primary-500 bg-primary-500 dark:border-primary-400 dark:bg-primary-400",
                className,
              )}
            >
              <span
                className={cn(
                  "block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150",
                  checked && "translate-x-[22px]",
                )}
              />
            </span>
          </div>
          {label && (
            <label
              htmlFor={switchId}
              className="cursor-pointer text-sm font-medium text-neutral-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 dark:text-neutral-300"
            >
              {label}
            </label>
          )}
        </div>
        {helperText && (
          <p className="ps-14 text-sm text-neutral-400">{helperText}</p>
        )}
      </div>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };
