"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export type ComboboxTypeaheadOption = {
  value: string;
  label: string;
};

export type ComboboxTypeaheadProps = {
  value: string;
  onValueChange: (next: string) => void;
  options: readonly ComboboxTypeaheadOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: "default" | "compact";
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  /** If true, clearing the input commits "". */
  allowEmpty?: boolean;
  /** If true, typing text that exactly matches an option label commits that value (quest-style). */
  commitOnExactLabel?: boolean;
  /** When the list is open, Escape also stops propagation (e.g. Radix Dialog). */
  stopEscapePropagation?: boolean;
  id?: string;
};

/**
 * Filterable text input with a dropdown list. The list is portaled to `document.body` with
 * `position: fixed` so it works inside transformed UI (e.g. dialogs with translate) and is not
 * clipped by `overflow: auto` ancestors.
 */
export function ComboboxTypeahead({
  value,
  onValueChange,
  options,
  placeholder = "Search…",
  disabled = false,
  size = "default",
  className,
  inputClassName,
  listClassName,
  allowEmpty = false,
  commitOnExactLabel = false,
  stopEscapePropagation = false,
  id,
}: ComboboxTypeaheadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  queryRef.current = query;

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [selectedLabel, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (containerRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const [listPos, setListPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updateListPos = useCallback(() => {
    if (!open || !inputRef.current) {
      setListPos(null);
      return;
    }
    const r = inputRef.current.getBoundingClientRect();
    setListPos({ top: r.bottom + 2, left: r.left, width: r.width });
  }, [open]);

  useLayoutEffect(() => {
    updateListPos();
  }, [updateListPos, open, query, filtered.length]);

  useEffect(() => {
    if (!open) return;
    updateListPos();
    const fn = () => updateListPos();
    window.addEventListener("resize", fn);
    window.addEventListener("scroll", fn, true);
    return () => {
      window.removeEventListener("resize", fn);
      window.removeEventListener("scroll", fn, true);
    };
  }, [open, updateListPos]);

  const compact = size === "compact";
  const rowText = compact ? "text-[10px]" : "text-[11px]";
  const hasResults = filtered.length > 0;

  const pick = (v: string) => {
    onValueChange(v);
    setOpen(false);
  };

  const listboxId = id ? `${id}-listbox` : undefined;

  const listEl =
    open && !disabled && mounted && listPos ? (
      <ul
        ref={listRef}
        id={listboxId}
        data-combobox-typeahead-portal=""
        role="listbox"
        className={cn(
          "max-h-60 overflow-y-auto overscroll-y-contain rounded border border-gray-600 bg-gray-900 py-0.5 shadow-xl",
          listClassName,
        )}
        style={{
          position: "fixed",
          top: listPos.top,
          left: listPos.left,
          width: listPos.width,
          zIndex: 10002,
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {!hasResults ? (
          <li className={cn("px-2 py-1.5 text-gray-500", rowText)}>No matches</li>
        ) : (
          filtered.map((o) => (
            <li key={o.value === "" ? "__empty" : o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-gray-200 hover:bg-gray-800",
                  rowText,
                )}
                onPointerDown={(ev) => {
                  if (ev.button !== 0) return;
                  ev.preventDefault();
                  ev.stopPropagation();
                  pick(o.value);
                }}
              >
                {o.label}
              </button>
            </li>
          ))
        )}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        disabled={disabled}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          const trimmed = v.trim();
          if (!trimmed) {
            if (allowEmpty) onValueChange("");
            return;
          }
          if (commitOnExactLabel) {
            const exact = options.find(
              (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
            );
            if (exact) onValueChange(exact.value);
          }
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (open) {
              e.preventDefault();
              if (stopEscapePropagation) e.stopPropagation();
              setOpen(false);
              setQuery(selectedLabel);
            }
          } else if (e.key === "Enter" && open && hasResults) {
            e.preventDefault();
            pick(filtered[0].value);
          }
        }}
        onBlur={() => {
          queueMicrotask(() => {
            const ae = document.activeElement;
            if (containerRef.current?.contains(ae)) return;
            if (listRef.current?.contains(ae)) return;
            setOpen(false);
            const q = queryRef.current.trim();
            if (!q) {
              if (allowEmpty) return;
              setQuery(selectedLabel);
              return;
            }
            const valid = options.some(
              (o) =>
                o.value === q || o.label.toLowerCase() === q.toLowerCase(),
            );
            if (!valid) setQuery(selectedLabel);
          });
        }}
        className={cn(
          "rounded border border-gray-600 bg-gray-950 text-gray-100 placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-gray-500",
          compact ? "h-7 px-2 py-1 text-[10px]" : "h-8 px-2 py-1 text-[11px]",
          inputClassName,
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
 />
      {listEl ? createPortal(listEl, document.body) : null}
    </div>
  );
}
