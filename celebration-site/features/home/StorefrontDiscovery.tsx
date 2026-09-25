"use client"

import { useCallback, useEffect, useState } from "react"
import type { Tier } from "../../lib/domain/catalog"
import { BudgetSection } from "../catalog/BudgetSection"
import { OccasionRail } from "../catalog/OccasionRail"
import { BUILDER_OPEN_EVENT, type BuilderOpenDetail } from "../builder/builder-events"
import { LazyStorefrontTail } from "./LazyStorefrontTail"

type TierSocialProof = {
  tierName: string
  orderCount: number
  totalOrders: number
  sharePercent: number
}

type BuilderRequest = {
  active: boolean
  step: number
  version: number
}

function firstTierId(tiers: Tier[], defaultTierId: string) {
  return tiers.find((item) => item.id === defaultTierId)?.id || tiers[0]?.id || defaultTierId
}

function initialOccasion(occasions: string[], defaultOccasion: string) {
  return occasions.includes(defaultOccasion) ? defaultOccasion : (occasions[0] || "")
}

function trackLater(eventName: "storefront_view" | "budget_selected" | "builder_started", tierId?: string) {
  if (typeof window === "undefined") return
  void import("../analytics/conversion").then(({ trackConversion }) => {
    trackConversion(eventName, tierId ? { tierId } : {})
  }).catch(() => undefined)
}

export function StorefrontDiscovery({
  tiers,
  occasions,
  defaultTierId,
  defaultOccasion,
  initialSocialProof = null
}: {
  tiers: Tier[]
  occasions: string[]
  defaultTierId: string
  defaultOccasion: string
  initialSocialProof?: TierSocialProof | null
}) {
  const [selectedTierId, setSelectedTierId] = useState(() => firstTierId(tiers, defaultTierId))
  const [occasion, setOccasion] = useState(() => initialOccasion(occasions, defaultOccasion))
  const [builderRequest, setBuilderRequest] = useState<BuilderRequest>({ active: false, step: 1, version: 0 })

  const openBuilder = useCallback((step = 1, tierId = selectedTierId) => {
    setBuilderRequest((current) => ({ active: true, step, version: current.version + 1 }))
    trackLater("builder_started", tierId)
  }, [selectedTierId])

  useEffect(() => {
    let tracked = false
    let timer = 0
    const send = () => {
      if (tracked) return
      tracked = true
      cleanup()
      trackLater("storefront_view")
    }
    const onScroll = () => {
      if (window.scrollY >= 80) send()
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pointerdown", send)
      window.removeEventListener("keydown", send)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pointerdown", send, { passive: true, once: true })
    window.addEventListener("keydown", send, { once: true })
    timer = window.setTimeout(send, 12000)

    return cleanup
  }, [])

  useEffect(() => {
    function onBuilderOpen(event: Event) {
      const detail = (event as CustomEvent<BuilderOpenDetail>).detail
      openBuilder(detail?.step || 1)
    }
    window.addEventListener(BUILDER_OPEN_EVENT, onBuilderOpen)
    return () => window.removeEventListener(BUILDER_OPEN_EVENT, onBuilderOpen)
  }, [openBuilder])

  function pickTier(id: string) {
    setSelectedTierId(id)
    trackLater("budget_selected", id)
    openBuilder(2, id)
  }

  function pickOccasion(value: string) {
    setOccasion(value)
    openBuilder(1)
  }

  const syncSelection = useCallback((tierId: string, nextOccasion: string) => {
    setSelectedTierId((current) => current === tierId ? current : tierId)
    setOccasion((current) => current === nextOccasion ? current : nextOccasion)
  }, [])

  return (
    <>
      <OccasionRail value={occasion} occasions={occasions} onChange={pickOccasion} />
      <BudgetSection tiers={tiers} selectedTierId={selectedTierId} recommendedTierId={defaultTierId} socialProof={initialSocialProof} onSelect={pickTier} />
      <LazyStorefrontTail
        socialProof={initialSocialProof}
        selectedTierId={selectedTierId}
        occasion={occasion}
        builderActive={builderRequest.active}
        requestedStep={builderRequest.step}
        requestVersion={builderRequest.version}
        onBuild={openBuilder}
        onSelectionSync={syncSelection}
      />
    </>
  )
}
