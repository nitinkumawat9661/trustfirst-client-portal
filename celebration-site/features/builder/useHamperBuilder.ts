"use client"

import { useMemo, useState } from "react"
import { canSelectProduct, catalogSettings, categories, normalizeSelection, occasions, productById, products, selectedPoints, tierById, tiers } from "../../lib/domain/catalog"
import { storeContent } from "../../lib/domain/content"
import type { CheckoutData } from "./types"
import { validateCheckoutDetails } from "./validation"

function configuredDefaultTier() {
  const tier = tierById(catalogSettings.defaultTierId)
  if (!tier) throw new Error("Configured default tier does not exist")
  return tier
}

const defaultTier = configuredDefaultTier()

export function useHamperBuilder() {
  const [tierId, setTierId] = useState(defaultTier.id)
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState(catalogSettings.allCategory.id)
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
    occasion: catalogSettings.defaultOccasion,
    message: "",
    paymentReference: ""
  })

  const tier = tierById(tierId) || defaultTier
  const selectedNames = selected.map((id) => productById(id)?.name).filter(Boolean) as string[]
  const filteredProducts = useMemo(() => products.filter((item) => {
    const byCategory = category === catalogSettings.allCategory.id || item.category === category
    const bySearch = !search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase())
    return byCategory && bySearch
  }), [category, search])

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
    const nextTier = tierById(id)
    if (!nextTier) return
    setTierId(id)
    setSelected((current) => normalizeSelection(nextTier, current))
  }

  function toggleProduct(productId: string) {
    const product = productById(productId)
    if (!product) return
    if (selected.includes(productId)) {
      setSelected((current) => current.filter((id) => id !== productId))
      return
    }
    if (canSelectProduct(tier, selected, product).ok) setSelected((current) => [...current, productId])
  }

  return {
    tier,
    tierId,
    tiers,
    products,
    occasions,
    categories,
    selected,
    selectedNames,
    pointsUsed: selectedPoints(selected),
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
