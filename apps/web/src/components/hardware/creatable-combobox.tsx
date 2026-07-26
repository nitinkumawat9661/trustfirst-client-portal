"use client";

import { Button, Input } from "@trustfirst/ui";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type CreatableComboboxOption = {
  id: string;
  label: string;
  keywords?: string[];
};

export function CreatableCombobox({
  createLabel = "Create",
  disabled,
  label,
  onCreate,
  onSelect,
  options,
  placeholder,
  value,
}: {
  createLabel?: string;
  disabled?: boolean;
  label: string;
  onCreate: (name: string) => void;
  onSelect: (id: string) => void;
  options: CreatableComboboxOption[];
  placeholder?: string;
  value: string;
}) {
  const [queryState, setQueryState] = useState({ query: value, value });
  let query = queryState.query;
  if (queryState.value !== value) {
    query = value;
    setQueryState({ query: value, value });
  }
  const normalizedQuery = normalize(query);
  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return options.filter((option) => {
      const haystack = [option.label, ...(option.keywords ?? [])].map(normalize).join(" ");
      return haystack.includes(normalizedQuery);
    }).slice(0, 8);
  }, [normalizedQuery, options]);
  const exactMatch = options.some((option) => normalize(option.label) === normalizedQuery);

  function select(id: string) {
    const option = options.find((candidate) => candidate.id === id);
    if (!option) return;
    setQueryState({ query: option.label, value });
    onSelect(option.id);
  }

  return (
    <label className="relative grid gap-2 text-sm font-medium">
      {label}
      <Search className="pointer-events-none absolute left-3 top-9 size-4 text-muted-foreground" />
      <Input
        autoComplete="off"
        className="pl-9"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQueryState({ query: event.target.value, value });
          onSelect("");
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const first = matches[0];
          if (first) select(first.id);
          else if (normalizedQuery && !exactMatch) onCreate(query.trim());
        }}
      />
      {normalizedQuery ? (
        <div className="rounded-md border border-border bg-card p-2 shadow-sm">
          {matches.map((option) => (
            <button
              className="block min-h-9 w-full rounded px-2 text-left text-sm hover:bg-muted"
              key={option.id}
              onClick={() => select(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
          {!exactMatch ? (
            <Button className="mt-1 w-full justify-start" onClick={() => onCreate(query.trim())} size="sm" type="button" variant="ghost">
              <Plus className="size-4" />{createLabel} &quot;{query.trim()}&quot;
            </Button>
          ) : null}
        </div>
      ) : null}
    </label>
  );
}

function normalize(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}
