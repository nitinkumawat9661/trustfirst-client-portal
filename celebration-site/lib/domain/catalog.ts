import rawCatalog from "../../content/catalog.json"
import { paymentConfig } from "../../config/payment"

export type Tier = {
  id: string
  price: number
  name: string
  size: string
  maxChoices: number
  pointBudget: number
  label?: string
}

export type GiftProduct = {
  id: string
  name: string
  category: string
  minTier: number
  points: number
  note: string
  icon: string
}

export type CategoryOption = { id: string; label: string }
export type SelectionRuleReason = "minTier" | "maxChoices" | "pointBudget" | null
export type SelectionRule = { ok: boolean; reason: SelectionRuleReason; value?: number }

type CatalogFile = {
  settings: {
    defaultTierId: string
    defaultOccasion: string
    allCategory: CategoryOption
  }
  tiers: Tier[]
  products: GiftProduct[]
  occasions: string[]
}

const catalog = rawCatalog as CatalogFile

export const catalogSettings = catalog.settings
export const tiers = catalog.tiers
export const products = catalog.products
export const occasions = catalog.occasions
export const categories: CategoryOption[] = [
  catalogSettings.allCategory,
  ...Array.from(new Set(products.map((item) => item.category))).map((label) => ({ id: label, label }))
]

export function tierById(id: string) {
  return tiers.find((item) => item.id === id)
}

export function productById(id: string) {
  return products.find((item) => item.id === id)
}

export function selectedPoints(ids: string[]) {
  return ids.reduce((total, id) => total + (productById(id)?.points ?? 0), 0)
}

export function canSelectProduct(tier: Tier, selectedIds: string[], product: GiftProduct): SelectionRule {
  if (product.minTier > tier.price) return { ok: false, reason: "minTier", value: product.minTier }
  if (selectedIds.includes(product.id)) return { ok: true, reason: null }
  if (selectedIds.length >= tier.maxChoices) return { ok: false, reason: "maxChoices", value: tier.maxChoices }
  if (selectedPoints(selectedIds) + product.points > tier.pointBudget) return { ok: false, reason: "pointBudget" }
  return { ok: true, reason: null }
}

export function normalizeSelection(tier: Tier, ids: string[]) {
  const kept: string[] = []
  for (const id of ids) {
    const product = productById(id)
    if (!product) continue
    if (canSelectProduct(tier, kept, product).ok) kept.push(id)
  }
  return kept
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat(paymentConfig.locale, {
    style: "currency",
    currency: paymentConfig.currencyCode,
    maximumFractionDigits: 0
  }).format(value)
}
