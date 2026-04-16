"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";

export type WholeNumberInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange" | "min" | "max" | "inputMode"
> & {
  value: number;
  onValueChange: (next: number) => void;
  min?: number;
  max: number;
};

/**
 * Integer-only field with natural typing: digits (and temporary empty input) while focused.
 * Min/max clamping and `onValueChange` run on blur only so backspace/edit mid-number works.
 */
export function WholeNumberInput({
  value,
  onValueChange,
  min = 0,
  max,
  className,
  disabled,
  onFocus,
  onBlur,
  ...rest
}: WholeNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const display = draft !== null ? draft : String(value);

  const applyDigits = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setDraft(digits === "" ? "" : digits);
  };

  const commitDraft = () => {
    const s = draft;
    setDraft(null);
    if (s === null) return;
    if (s.trim() === "") {
      onValueChange(Math.max(min, Math.min(max, 0)));
      return;
    }
    const digits = s.replace(/\D/g, "");
    let n = Math.trunc(Number(digits));
    if (!Number.isFinite(n)) n = min;
    onValueChange(Math.max(min, Math.min(max, n)));
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      className={cn(className)}
      value={display}
      onFocus={(e) => {
        setDraft(String(value));
        onFocus?.(e);
      }}
      onChange={(e) => applyDigits(e.target.value)}
      onBlur={(e) => {
        commitDraft();
        onBlur?.(e);
      }}
    />
  );
}
