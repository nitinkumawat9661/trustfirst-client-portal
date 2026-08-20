"use client";

import { Button, Input } from "@trustfirst/ui";
import { Plus, Search, Star } from "lucide-react";
import { type Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HardwareProductSummary } from "@/server/hardware";
import {
  isStrongProductSearchMatch,
  normalizeProductSearchText,
  rankProductSearchEntry,
} from "./product-search";

const MAX_RESULTS = 20;
const MAX_RECENT = 20;
const PRODUCT_SEARCH_DEBOUNCE_MS = 300;

type ProductSearchMemory = {
  favorites: string[];
  recent: string[];
};

export function HardwareProductCombobox({
  inputRef,
  label,
  onCreate,
  onQueryChange,
  onSelect,
  products,
  storageKey,
  value,
}: {
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  onCreate?: ((name: string) => void) | undefined;
  onQueryChange: (query: string) => void;
  onSelect: (product: HardwareProductSummary) => void;
  products: HardwareProductSummary[];
  storageKey: string;
  value: string;
}) {
  const [query, setQuery] = useState(value);
  const [searchQuery, setSearchQuery] = useState(value);
  const [searchPending, setSearchPending] = useState(false);
  const [brand, setBrand] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [memory, setMemory] = useState<ProductSearchMemory>(() => readMemory(storageKey));
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  useEffect(() => {
    if (open) return;
    setQuery(value);
    setSearchQuery(value);
    setSearchPending(false);
  }, [open, value]);

  const duplicateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const key = normalizeProductSearchText(product.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const brands = useMemo(
    () => unique(products.map((product) => product.brandName).filter(isString)).sort(localeCompare),
    [products],
  );
  const categories = useMemo(
    () => unique(products.map((product) => product.categoryName).filter(isString)).sort(localeCompare),
    [products],
  );
  const popularCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      if (!product.categoryName) continue;
      counts.set(product.categoryName, (counts.get(product.categoryName) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
  }, [products]);

  const displayedQuery = open ? query : value;
  const normalizedQuery = normalizeProductSearchText(searchQuery);
  const rankProducts = useCallback((searchText: string) => {
    const normalizedSearchText = normalizeProductSearchText(searchText);
    const recentRank = new Map(memory.recent.map((id, index) => [id, index]));
    const favoriteSet = new Set(memory.favorites);
    const filtered = products.filter((product) =>
      (brand === "ALL" || product.brandName === brand)
      && (category === "ALL" || product.categoryName === category),
    );

    if (!normalizedSearchText) {
      return filtered
        .filter((product) => favoriteSet.has(product.id) || recentRank.has(product.id))
        .sort((left, right) => {
          const favoriteDifference = Number(favoriteSet.has(right.id)) - Number(favoriteSet.has(left.id));
          if (favoriteDifference) return favoriteDifference;
          return (recentRank.get(left.id) ?? 999) - (recentRank.get(right.id) ?? 999);
        })
        .slice(0, MAX_RESULTS)
        .map((product) => ({ product, score: 0 }));
    }

    return filtered
      .map((product) => ({
        product,
        score: rankProductSearchEntry({
          brandName: product.brandName,
          categoryName: product.categoryName,
          keywords: [product.hsnCode ?? "", product.unitCode ?? ""],
          label: product.name,
          salesPriceCents: product.salesPriceCents,
          sku: product.sku,
        }, searchText),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        const scoreDifference = right.score - left.score;
        if (scoreDifference) return scoreDifference;
        const favoriteDifference = Number(favoriteSet.has(right.product.id)) - Number(favoriteSet.has(left.product.id));
        if (favoriteDifference) return favoriteDifference;
        const recentDifference = (recentRank.get(left.product.id) ?? 999) - (recentRank.get(right.product.id) ?? 999);
        if (recentDifference) return recentDifference;
        return localeCompare(left.product.name, right.product.name);
      });
  }, [brand, category, memory.favorites, memory.recent, products]);

  const rankedResults = useMemo(
    () => searchPending ? [] : rankProducts(searchQuery),
    [rankProducts, searchPending, searchQuery],
  );
  const results = rankedResults.map((entry) => entry.product);
  const topMatchScore = rankedResults[0]?.score ?? 0;

  function select(product: HardwareProductSummary) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setQuery(product.name);
    setSearchQuery(product.name);
    setSearchPending(false);
    setActiveIndex(0);
    onQueryChange(product.name);
    onSelect(product);
    setOpen(false);
    const nextMemory = {
      ...memory,
      recent: [product.id, ...memory.recent.filter((id) => id !== product.id)].slice(0, MAX_RECENT),
    };
    setMemory(nextMemory);
    writeMemory(storageKey, nextMemory);
  }

  function toggleFavorite(productId: string) {
    const favorites = memory.favorites.includes(productId)
      ? memory.favorites.filter((id) => id !== productId)
      : [productId, ...memory.favorites];
    const nextMemory = { ...memory, favorites };
    setMemory(nextMemory);
    writeMemory(storageKey, nextMemory);
  }

  const exactName = products.some((product) => normalizeProductSearchText(product.name) === normalizedQuery);
  const strongMatch = isStrongProductSearchMatch(topMatchScore);
  const showCreateAction = !searchPending && Boolean(onCreate && normalizedQuery) && !exactName && !strongMatch;
  const displayLabel = label.replace(/\s*\/\s*barcode/giu, "");

  return (
    <label className="relative grid gap-2 text-sm font-medium">
      {displayLabel}
      <Search className="pointer-events-none absolute left-3 top-9 size-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        autoComplete="off"
        className="pl-9"
        placeholder="Type product, brand, category, SKU, model, size or colour"
        value={displayedQuery}
        onBlur={() => {
          closeTimer.current = setTimeout(() => setOpen(false), 160);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          onQueryChange(nextQuery);
          setActiveIndex(0);
          if (searchTimer.current) clearTimeout(searchTimer.current);

          if (!normalizeProductSearchText(nextQuery)) {
            setSearchQuery("");
            setSearchPending(false);
            setOpen(false);
            return;
          }

          setSearchPending(true);
          setOpen(true);
          searchTimer.current = setTimeout(() => {
            setSearchQuery(nextQuery);
            setSearchPending(false);
          }, PRODUCT_SEARCH_DEBOUNCE_MS);
        }}
        onFocus={() => {
          if (searchTimer.current) clearTimeout(searchTimer.current);
          setQuery(value);
          setSearchQuery(value);
          setSearchPending(false);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
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
          if (
            event.key !== "Enter" ||
            event.shiftKey ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          ) return;
          event.preventDefault();
          event.stopPropagation();

          const immediateRanked = searchPending ? rankProducts(query) : rankedResults;
          const immediateResults = immediateRanked.map((entry) => entry.product);
          const product = immediateResults[activeIndex] ?? immediateResults[0];
          if (product) {
            select(product);
            return;
          }

          const immediateNormalized = normalizeProductSearchText(query);
          const immediateExact = products.some(
            (candidate) => normalizeProductSearchText(candidate.name) === immediateNormalized,
          );
          const immediateStrong = isStrongProductSearchMatch(immediateRanked[0]?.score ?? 0);
          if (onCreate && immediateNormalized && !immediateExact && !immediateStrong) onCreate(query.trim());
        }}
      />

      {open ? (
        <div className="absolute left-0 right-0 top-[4.45rem] z-40 overflow-hidden rounded-md border border-border bg-card shadow-xl">
          <div className="grid gap-2 border-b border-border bg-muted/40 p-2 sm:grid-cols-2">
            <select
              className={filterClassName}
              value={brand}
              onChange={(event) => {
                setBrand(event.target.value);
                setActiveIndex(0);
              }}
            >
              <option value="ALL">All brands</option>
              {brands.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              className={filterClassName}
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setActiveIndex(0);
              }}
            >
              <option value="ALL">All categories</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {!normalizedQuery && !searchPending ? (
              <div className="flex flex-wrap gap-1 sm:col-span-2">
                {popularCategories.map((name) => (
                  <button
                    className="rounded-full border border-border bg-background px-2 py-1 text-xs font-normal hover:bg-muted"
                    key={name}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setCategory(name);
                      setActiveIndex(0);
                    }}
                    type="button"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : searchPending ? (
              <p className="text-xs font-normal text-muted-foreground sm:col-span-2">
                Finish typing — results will appear automatically.
              </p>
            ) : (
              <p className="text-xs font-normal text-muted-foreground sm:col-span-2">
                Closest matches appear first. Spelling mistakes, partial words, and words in any order are supported.
              </p>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-1">
            {results.map((product, index) => {
              const favorite = memory.favorites.includes(product.id);
              const variants = duplicateCounts.get(normalizeProductSearchText(product.name)) ?? 1;
              return (
                <div
                  className={`grid grid-cols-[minmax(0,1fr)_36px] items-stretch rounded-md ${index === activeIndex ? "bg-muted" : "hover:bg-muted/70"}`}
                  key={product.id}
                >
                  <button
                    className="min-w-0 px-3 py-2 text-left"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(product)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-start justify-between gap-3">
                      <span className="min-w-0 font-semibold leading-5">{product.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{money(product.salesPriceCents)}</span>
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {[product.brandName, product.sku, product.categoryName].filter(Boolean).join(" • ")}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                      <span>Stock {product.currentStock} {product.unitCode ?? "PCS"}</span>
                      {variants > 1 ? <span className="font-medium text-amber-700 dark:text-amber-300">{variants} variants</span> : null}
                    </span>
                  </button>
                  <button
                    aria-label={favorite ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
                    className="grid place-items-center"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggleFavorite(product.id)}
                    type="button"
                  >
                    <Star className={`size-4 ${favorite ? "fill-current text-amber-500" : "text-muted-foreground"}`} />
                  </button>
                </div>
              );
            })}
            {!results.length && !searchPending ? (
              <p className="px-3 py-4 text-sm font-normal text-muted-foreground">
                No matching product. Try another name, brand, category, SKU, model, size, or colour.
              </p>
            ) : null}
            {showCreateAction ? (
              <Button
                className="mt-1 w-full justify-start"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onCreate?.(query.trim())}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Plus className="size-4" />Create product &quot;{query.trim()}&quot;
              </Button>
            ) : null}
          </div>
          <p className="border-t border-border px-3 py-2 text-[11px] font-normal text-muted-foreground">
            {searchPending ? "Waiting for typing to finish • " : normalizedQuery ? `${results.length} matching products • ` : ""}↑/↓ choose • Enter select • Esc close
          </p>
        </div>
      ) : null}
    </label>
  );
}

function readMemory(key: string): ProductSearchMemory {
  if (typeof window === "undefined") return { favorites: [], recent: [] };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Partial<ProductSearchMemory>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter(isString) : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent.filter(isString).slice(0, MAX_RECENT) : [],
    };
  } catch {
    return { favorites: [], recent: [] };
  }
}

function writeMemory(key: string, memory: ProductSearchMemory) {
  try {
    window.localStorage.setItem(key, JSON.stringify(memory));
  } catch {
    // Billing remains functional when storage is unavailable.
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function isString(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

function localeCompare(left: string, right: string) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(amountCents / 100);
}

const filterClassName = "h-9 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";
