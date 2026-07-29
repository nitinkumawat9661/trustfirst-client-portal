"use client";

import { Button, Input } from "@trustfirst/ui";
import { Plus, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProductSearchMetadata } from "./product-search-metadata-bridge";

export type CreatableComboboxOption = {
  id: string;
  label: string;
  keywords?: string[];
};

type SearchWindow = Window & {
  __hardwareProductSearchMetadata?: Record<string, ProductSearchMetadata>;
};

const FAVORITES_KEY = "trustfirst.hardware.product-favorites";
const RECENTS_KEY = "trustfirst.hardware.product-recents";

export function CreatableCombobox({
  createLabel = "Create",
  disabled,
  label,
  onCreate,
  onQueryChange,
  onSelect,
  options,
  placeholder,
  value,
}: {
  createLabel?: string;
  disabled?: boolean;
  label: string;
  onCreate?: ((name: string) => void) | undefined;
  onQueryChange?: ((query: string) => void) | undefined;
  onSelect: (id: string) => void;
  options: CreatableComboboxOption[];
  placeholder?: string;
  value: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [metadataRevision, setMetadataRevision] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readStoredIds(FAVORITES_KEY));
  const [recentIds, setRecentIds] = useState<string[]>(() => readStoredIds(RECENTS_KEY));

  useEffect(() => {
    function metadataReady() {
      setMetadataRevision((current) => current + 1);
    }
    window.addEventListener("hardware-product-search-metadata-ready", metadataReady);
    return () => window.removeEventListener("hardware-product-search-metadata-ready", metadataReady);
  }, []);

  const metadata = useMemo(() => {
    void metadataRevision;
    if (typeof window === "undefined") return {} as Record<string, ProductSearchMetadata>;
    return (window as SearchWindow).__hardwareProductSearchMetadata ?? {};
  }, [metadataRevision]);
  const isProductSearch = options.some((option) => Boolean(metadata[option.id]));
  const displayedQuery = open ? query : value;
  const normalizedQuery = normalize(displayedQuery);

  const brands = useMemo(() => uniqueSorted(options.map((option) => metadata[option.id]?.brandName ?? null)), [metadata, options]);
  const categories = useMemo(() => uniqueSorted(options.map((option) => metadata[option.id]?.categoryName ?? null)), [metadata, options]);

  const matches = useMemo(() => {
    const filtered = options.filter((option) => {
      const product = metadata[option.id];
      if (brandFilter && product?.brandName !== brandFilter) return false;
      if (categoryFilter && product?.categoryName !== categoryFilter) return false;
      return true;
    });

    if (!normalizedQuery) {
      if (!isProductSearch) return [];
      const priority = [...favoriteIds, ...recentIds].filter((id, index, values) => values.indexOf(id) === index);
      const byId = new Map(filtered.map((option) => [option.id, option]));
      const preferred = priority.map((id) => byId.get(id)).filter((option): option is CreatableComboboxOption => Boolean(option));
      const remaining = filtered
        .filter((option) => !priority.includes(option.id))
        .sort((left, right) => left.label.localeCompare(right.label));
      return [...preferred, ...remaining].slice(0, 20);
    }

    return filtered
      .map((option) => ({ option, score: rankOption(option, normalizedQuery, metadata[option.id]) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.option.label.localeCompare(right.option.label))
      .map((entry) => entry.option);
  }, [brandFilter, categoryFilter, favoriteIds, isProductSearch, metadata, normalizedQuery, options, recentIds]);

  const exactMatch = options.some((option) => normalize(option.label) === normalizedQuery);
  const showPanel = open && (isProductSearch || Boolean(normalizedQuery));

  function select(id: string) {
    const option = options.find((candidate) => candidate.id === id);
    if (!option) return;
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(0);
    onSelect(option.id);
    if (metadata[id]) {
      const nextRecent = [id, ...recentIds.filter((candidate) => candidate !== id)].slice(0, 20);
      setRecentIds(nextRecent);
      writeStoredIds(RECENTS_KEY, nextRecent);
    }
  }

  function toggleFavorite(id: string) {
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter((candidate) => candidate !== id)
      : [id, ...favoriteIds].slice(0, 50);
    setFavoriteIds(next);
    writeStoredIds(FAVORITES_KEY, next);
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
        value={displayedQuery}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
          onSelect("");
          onQueryChange?.(event.target.value);
        }}
        onFocus={() => {
          setQuery(value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, Math.max(matches.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key !== "Enter") return;
          event.preventDefault();
          const selected = matches[activeIndex] ?? matches[0];
          if (selected) select(selected.id);
          else if (onCreate && normalizedQuery && !exactMatch) onCreate(query.trim());
        }}
      />
      {showPanel ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[32rem] overflow-y-auto rounded-md border border-border bg-card p-2 shadow-xl">
          {isProductSearch ? (
            <div className="sticky top-0 z-10 mb-2 space-y-2 border-b border-border bg-card pb-2">
              <div className="grid grid-cols-2 gap-2">
                <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" onChange={(event) => { setBrandFilter(event.target.value); setActiveIndex(0); }} value={brandFilter}>
                  <option value="">All brands</option>
                  {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
                <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" onChange={(event) => { setCategoryFilter(event.target.value); setActiveIndex(0); }} value={categoryFilter}>
                  <option value="">All categories</option>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
              {!normalizedQuery ? <p className="text-xs text-muted-foreground">Favorites and recently billed products appear first. Search by name, SKU, model, brand, category, size, colour, or price—even with spelling mistakes.</p> : null}
              {categories.slice(0, 6).length ? (
                <div className="flex flex-wrap gap-1">
                  {categories.slice(0, 6).map((category) => (
                    <button className="rounded border border-border px-2 py-1 text-[11px] hover:bg-muted" key={category} onMouseDown={(event) => event.preventDefault()} onClick={() => setCategoryFilter(category === categoryFilter ? "" : category)} type="button">
                      {category}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {matches.map((option, index) => {
            const product = metadata[option.id];
            const favorite = favoriteIds.includes(option.id);
            return (
              <div className={`flex min-h-12 items-stretch rounded ${index === activeIndex ? "bg-muted" : "hover:bg-muted"}`} key={option.id}>
                <button
                  className="min-w-0 flex-1 px-2 py-2 text-left text-sm"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(option.id)}
                  type="button"
                >
                  <span className="block break-words font-medium">{option.label}</span>
                  {product ? (
                    <>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{[product.brandName, product.categoryName, product.sku].filter(Boolean).join(" • ")}</span>
                      <span className="mt-0.5 block text-xs">{money(product.salesPriceCents)} • Stock {product.currentStock} {product.unitCode ?? "PCS"}</span>
                    </>
                  ) : option.keywords?.length ? <span className="block text-xs text-muted-foreground">{option.keywords.filter(Boolean).join(" • ")}</span> : null}
                </button>
                {product ? (
                  <button aria-label={favorite ? "Remove from favorites" : "Add to favorites"} className="w-10 shrink-0" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleFavorite(option.id)} type="button">
                    <Star className={`mx-auto size-4 ${favorite ? "fill-current text-amber-600" : "text-muted-foreground"}`} />
                  </button>
                ) : null}
              </div>
            );
          })}
          {!matches.length ? <p className="px-2 py-3 text-sm text-muted-foreground">No matching product found.</p> : null}
          {onCreate && normalizedQuery && !exactMatch ? (
            <Button className="mt-1 w-full justify-start" onMouseDown={(event) => event.preventDefault()} onClick={() => onCreate(query.trim())} size="sm" type="button" variant="ghost">
              <Plus className="size-4" />{createLabel} &quot;{query.trim()}&quot;
            </Button>
          ) : null}
        </div>
      ) : null}
    </label>
  );
}

function rankOption(option: CreatableComboboxOption, query: string, product: ProductSearchMetadata | undefined) {
  const label = normalize(option.label);
  const sku = normalize(product?.sku ?? option.keywords?.[0] ?? "");
  const brand = normalize(product?.brandName ?? "");
  const category = normalize(product?.categoryName ?? "");
  const price = product ? String(product.salesPriceCents / 100) : "";
  const haystack = [label, sku, brand, category, price, ...(option.keywords ?? []).map(normalize)].join(" ");
  const tokens = query.split(" ").filter(Boolean);
  if (sku && sku === query) return 1150;
  if (label === query) return 1100;
  if (label.startsWith(query)) return 1000;
  if (sku.startsWith(query)) return 950;
  if (tokens.every((token) => haystack.includes(token))) return 800 + tokens.length;
  if (haystack.includes(query)) return 700;
  return 0;
}

function normalize(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}.]+/gu, " ").replace(/\s+/gu, " ").toLowerCase();
}

function uniqueSorted(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort((left, right) => left.localeCompare(right));
}

function readStoredIds(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Ignore private-mode storage restrictions.
  }
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency", maximumFractionDigits: 2 }).format(amountCents / 100);
}
