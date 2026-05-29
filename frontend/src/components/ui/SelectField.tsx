import { cn } from "~/ui";
import type { ComponentProps, ReactNode } from "react";
import { FormField } from "./FormField";

export type SelectFieldOption = {
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

export type SelectFieldProps = Omit<ComponentProps<"select">, "children"> & {
  children?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
  hint?: ReactNode;
  label: ReactNode;
  options?: SelectFieldOption[];
};

const selectControlClassName =
  "h-10 w-full rounded-[10px] border border-input bg-background px-3 text-sm";

export function SelectField({
  children,
  className,
  error,
  fieldClassName,
  hint,
  label,
  options,
  ...props
}: SelectFieldProps) {
  return (
    <FormField
      className={fieldClassName}
      error={error}
      hint={hint}
      label={label}
    >
      <select className={cn(selectControlClassName, className)} {...props}>
        {children ??
          options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
      </select>
    </FormField>
  );
}
