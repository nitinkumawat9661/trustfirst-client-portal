"use client"

import { BudgetSection } from "../catalog/BudgetSection"
import { OccasionRail } from "../catalog/OccasionRail"
import { ProductSection } from "../catalog/ProductSection"
import { HamperBuilder } from "../builder/HamperBuilder"
import { useHamperBuilder } from "../builder/useHamperBuilder"
import { CustomRequestSection } from "./CustomRequestSection"
import { FinalCta } from "./FinalCta"
import { Hero } from "./Hero"
import { PromiseSection } from "./PromiseSection"
import { SiteFooter } from "../shell/SiteFooter"
import { SiteHeader } from "../shell/SiteHeader"
import { TrustStrip } from "../shell/TrustStrip"

export function Storefront() {
  const state = useHamperBuilder()
  function goBuilder(step = 1) {
    state.setStep(step)
    setTimeout(() => document.getElementById("builder")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20)
  }
  function pickTier(id: string) {
    state.selectTier(id)
    goBuilder(1)
  }
  return (
    <main>
      <TrustStrip />
      <SiteHeader onCreate={() => goBuilder(1)} />
      <Hero onBuild={() => goBuilder(1)} tiers={state.tiers} products={state.products} />
      <OccasionRail value={state.checkout.occasion} occasions={state.occasions} onChange={(value) => { state.updateField("occasion", value); goBuilder(3) }} />
      <BudgetSection tiers={state.tiers} selectedTierId={state.tierId} onSelect={pickTier} />
      <ProductSection products={state.products} categories={state.categories} allCategoryId={state.catalog.settings.allCategory.id} category={state.category} onCategory={state.setCategory} />
      <CustomRequestSection />
      <HamperBuilder state={state} />
      <PromiseSection />
      <FinalCta onBuild={() => goBuilder(1)} />
      <SiteFooter />
    </main>
  )
}
