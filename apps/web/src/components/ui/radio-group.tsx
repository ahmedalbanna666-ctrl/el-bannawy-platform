import { createContext, forwardRef, useContext, type InputHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

interface RadioGroupContextValue {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext(): RadioGroupContextValue | null {
  return useContext(RadioGroupContext);
}

interface RadioGroupItemProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  helperText?: string;
}

const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, label, helperText, id, value, onChange, ...props }, ref) => {
    const generatedId = useId();
    const radioId = id ?? generatedId;
    const group = useRadioGroupContext();
    const isChecked = group ? group.value === value : props.checked;
    const inputOnChange: React.ChangeEventHandler<HTMLInputElement> | undefined =
      group
        ? (e): void => { group.onChange?.(e.target.value); }
        : onChange;

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <input
              ref={ref}
              id={radioId}
              type="radio"
              value={value}
              name={group?.name}
              checked={isChecked}
              onChange={inputOnChange}
              className="peer sr-only"
              {...props}
            />
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-300 bg-transparent transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/20 peer-focus-visible:ring-offset-1 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 dark:border-neutral-600",
                isChecked && "border-primary-500 dark:border-primary-400",
                className,
              )}
            >
              {isChecked && (
                <Circle className="h-2.5 w-2.5 fill-primary-500 text-primary-500 dark:fill-primary-400 dark:text-primary-400" />
              )}
            </span>
          </div>
          <label
            htmlFor={radioId}
            className="cursor-pointer text-sm font-medium text-neutral-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 dark:text-neutral-300"
          >
            {label}
          </label>
        </div>
        {helperText && (
          <p className="ps-8 text-sm text-neutral-400">{helperText}</p>
        )}
      </div>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
}

function RadioGroup({
  name,
  value,
  onChange,
  children,
  className,
  label,
  error,
  helperText,
}: RadioGroupProps): React.ReactNode {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange }}>
      <fieldset className={cn("flex flex-col gap-2", className)}>
        {label && (
          <legend className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </legend>
        )}
        <div className="flex flex-col gap-2">
          {children}
        </div>
        {helperText && (
          <p className="text-sm text-neutral-400">{helperText}</p>
        )}
        {error && (
          <p className="text-sm text-danger-500" role="alert">
            {error}
          </p>
        )}
      </fieldset>
    </RadioGroupContext.Provider>
  );
}
RadioGroup.displayName = "RadioGroup";

export { RadioGroup, RadioGroupItem };
export type { RadioGroupProps, RadioGroupItemProps };
