"use client"

import { useEffect, useMemo, useState } from "react"
import { canSelectProduct, categoriesForCatalog, defaultCatalog, normalizeSelection, productById, selectedPoints, tierById, visibleProducts, visibleTiers, type CatalogConfig } from "../../lib/domain/catalog"
import { storeContent } from "../../lib/domain/content"
import type { CheckoutData } from "./types"
import { validateCheckoutDetails } from "./validation"

function defaultTierFor(catalog: CatalogConfig) {
  const tier = tierById(catalog, catalog.settings.defaultTierId) || visibleTiers(catalog)[0]
  if (!tier) throw new Error("Configured catalog has no active tier")
  return tier
}

export function useHamperBuilder() {
  const initialTier = defaultTierFor(defaultCatalog)
  const [catalog, setCatalog] = useState<CatalogConfig>(defaultCatalog)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [tierId, setTierId] = useState(initialTier.id)
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState(defaultCatalog.settings.allCategory.id)
  const [search, setSearch] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [detailsError, setDetailsError] = useState("")
  const [checkout, setCheckout] = useState<CheckoutData>({
    customerName: "",
    phone: "",
    receiverName: "",
    address: "",
    city: "",
    state: storeContent.checkout.defaultState,
    pincode: "",
    requiredDate: "",
    occasion: defaultCatalog.settings.defaultOccasion,
    message: "",
    paymentReference: ""
  })

  useEffect(() => {
    let cancelled = false
    fetch("/api/catalog", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog")
        return response.json() as Promise<{ ok: boolean; catalog?: CatalogConfig }>
      })
      .then((payload) => {
        if (cancelled || !payload.ok || !payload.catalog) return
        const next = payload.catalog
        const nextTier = tierById(next, tierId) || defaultTierFor(next)
        setCatalog(next)
        setTierId(nextTier.id)
        setSelected((current) => normalizeSelection(next, nextTier, current))
        setCategory(next.settings.allCategory.id)
        setCheckout((current) => ({
          ...current,
          occasion: next.occasions.includes(current.occasion) ? current.occasion : next.settings.defaultOccasion
        }))
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setCatalogLoading(false) })
    return () => { cancelled = true }
  }, [])

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
    if (detailsError) setDetailsError("")
  }

  function goToPayment() {
    const error = validateCheckoutDetails(checkout)
    setDetailsError(error)
    if (!error) setStep(4)
  }

  function goToStep(nextStep: number) {
    if (nextStep === 4) {
      goToPayment()
      return
    }
    setDetailsError("")
    setStep(nextStep)
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

  return {
    catalog,
    catalogLoading,
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
    filteredProducts,
    setStep,
    goToStep,
    goToPayment,
    setCategory,
    setSearch,
    setAccepted,
    updateField,
    selectTier,
    toggleProduct
  }
}
