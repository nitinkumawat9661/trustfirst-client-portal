"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { canSelectProduct, categoriesForCatalog, defaultCatalog, normalizeSelection, productById, selectedPoints, tierById, visibleProducts, visibleTiers, type CatalogConfig } from "../../lib/domain/catalog"
import { storeContent } from "../../lib/domain/content"
import type { CheckoutData } from "./types"
import { validateCheckoutFields, type CheckoutFieldErrors } from "./validation"

function defaultTierFor(catalog: CatalogConfig) {
  const tier = tierById(catalog, catalog.settings.defaultTierId) || visibleTiers(catalog)[0]
  if (!tier) throw new Error("Configured catalog has no active tier")
  return tier
}

function checkoutDefaults(catalog: CatalogConfig, identity?: { customerName?: string; phone?: string }): CheckoutData {
  return {
    customerName: identity?.customerName || "",
    phone: identity?.phone || "",
    receiverName: "",
    address: "",
    city: "",
    state: storeContent.checkout.defaultState,
    pincode: "",
    requiredDate: "",
    occasion: catalog.settings.defaultOccasion,
    message: "",
    paymentReference: ""
  }
}

export function useHamperBuilder() {
  const initialTier = defaultTierFor(defaultCatalog)
  const [catalog, setCatalog] = useState<CatalogConfig>(defaultCatalog)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [tierId, setTierId] = useState(initialTier.id)
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState(defaultCatalog.settings.allCategory.id)
  const [search, setSearch] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [detailsError, setDetailsError] = useState("")
  const [detailsFieldErrors, setDetailsFieldErrors] = useState<CheckoutFieldErrors>({})
  const [checkout, setCheckout] = useState<CheckoutData>(() => checkoutDefaults(defaultCatalog))

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError("")
    try {
      const response = await fetch("/api/catalog", { cache: "no-store" })
      if (!response.ok) throw new Error("catalog")
      const payload = await response.json() as { ok: boolean; catalog?: CatalogConfig }
      if (!payload.ok || !payload.catalog) throw new Error("catalog")
      const next = payload.catalog
      setCatalog(next)
      setTierId((currentTierId) => {
        const nextTier = tierById(next, currentTierId) || defaultTierFor(next)
        setSelected((current) => normalizeSelection(next, nextTier, current))
        return nextTier.id
      })
      setCategory(next.settings.allCategory.id)
      setCheckout((current) => ({
        ...current,
        occasion: next.occasions.includes(current.occasion) ? current.occasion : next.settings.defaultOccasion
      }))
    } catch {
      setCatalogError("Latest hamper options load nahi ho paaye. Retry karein — tab tak safe fallback options dikh rahe hain.")
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => { loadCatalog() }, [loadCatalog])

  const tiers = visibleTiers(catalog)
  const products = visibleProducts(catalog)
  const occasions = catalog.occasions
  const categories = categoriesForCatalog(catalog)
  const tier = tierById(catalog, tierId) || defaultTierFor(catalog)
  const selectedNames = selected.map((id) => productById(catalog, id)?.name).filter(Boolean) as string[]
  const filteredProducts = useMemo(() => products.filter((item) => {
    const byCategory = category === catalog.settings.allCategory.id || item.category === category
    const bySearch = !search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase())
    return byCategory && bySearch
  }), [catalog.settings.allCategory.id, category, products, search])

  function updateField<K extends keyof CheckoutData>(key: K, value: CheckoutData[K]) {
    setCheckout((current) => ({ ...current, [key]: value }))
    setDetailsError("")
    setDetailsFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function goToPayment(): keyof CheckoutData | null {
    const fieldErrors = validateCheckoutFields(checkout)
    setDetailsFieldErrors(fieldErrors)
    const firstField = Object.keys(fieldErrors)[0] as keyof CheckoutData | undefined
    const firstError = firstField ? fieldErrors[firstField] || "" : ""
    setDetailsError(firstError)
    if (!firstField) setStep(4)
    return firstField || null
  }

  function goToStep(nextStep: number): keyof CheckoutData | null {
    if (nextStep === 4) return goToPayment()
    setDetailsError("")
    setDetailsFieldErrors({})
    setStep(nextStep)
    return null
  }

  function selectTier(id: string) {
    const nextTier = tierById(catalog, id)
    if (!nextTier) return
    setTierId(id)
    setSelected((current) => normalizeSelection(catalog, nextTier, current))
  }

  function toggleProduct(productId: string) {
    const product = productById(catalog, productId)
    if (!product) return
    if (selected.includes(productId)) {
      setSelected((current) => current.filter((id) => id !== productId))
      return
    }
    if (canSelectProduct(catalog, tier, selected, product).ok) setSelected((current) => [...current, productId])
  }

  function resetForNewOrder(identity?: { customerName?: string; phone?: string }) {
    const nextTier = defaultTierFor(catalog)
    setTierId(nextTier.id)
    setSelected([])
    setStep(1)
    setCategory(catalog.settings.allCategory.id)
    setSearch("")
    setAccepted(false)
    setDetailsError("")
    setDetailsFieldErrors({})
    setCheckout(checkoutDefaults(catalog, identity))
  }

  return {
    catalog,
    catalogLoading,
    catalogError,
    retryCatalog: loadCatalog,
    tier,
    tierId,
    tiers,
    products,
    occasions,
    categories,
    selected,
    selectedNames,
    pointsUsed: selectedPoints(catalog, selected),
    step,
    category,
    search,
    checkout,
    accepted,
    detailsError,
    detailsFieldErrors,
    filteredProducts,
    setStep,
    goToStep,
    goToPayment,
    setCategory,
    setSearch,
    setAccepted,
    updateField,
    selectTier,
    toggleProduct,
    resetForNewOrder
  }
}
