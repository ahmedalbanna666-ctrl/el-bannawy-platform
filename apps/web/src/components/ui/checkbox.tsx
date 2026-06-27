import { forwardRef, type InputHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, label, helperText, error, indeterminate, id, checked, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              checked={checked}
              data-indeterminate={indeterminate ? true : undefined}
              className={cn(
                "peer sr-only",
                className,
              )}
              {...props}
            />
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border-2 border-neutral-300 bg-transparent transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/20 peer-focus-visible:ring-offset-1 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 dark:border-neutral-600",
                (checked ?? indeterminate) &&
                  "border-primary-500 bg-primary-500 dark:border-primary-400 dark:bg-primary-400",
                error &&
                  "border-danger-500 peer-focus-visible:ring-danger-500/20",
              )}
            >
              {indeterminate ? (
                <Minus className="h-3 w-3 text-white" />
              ) : checked ? (
                <Check className="h-3 w-3 text-white" />
              ) : null}
            </span>
          </div>
          {label && (
            <label
              htmlFor={checkboxId}
              className="cursor-pointer text-sm font-medium text-neutral-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 dark:text-neutral-300"
            >
              {label}
            </label>
          )}
        </div>
        {helperText && (
          <p className="ps-8 text-sm text-neutral-400">{helperText}</p>
        )}
        {error && (
          <p className="ps-8 text-sm text-danger-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
export type { CheckboxProps };
