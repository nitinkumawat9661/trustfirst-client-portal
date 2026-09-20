"use client"

import { useState } from "react"
import { uiContent } from "../../lib/domain/content"
import { BudgetStep } from "./steps/BudgetStep"
import { ProductStep } from "./steps/ProductStep"
import { DetailsStep } from "./steps/DetailsStep"
import { PaymentStep } from "./steps/PaymentStep"
import { useOrderSubmit } from "../checkout/useOrderSubmit"
import { useHamperBuilder } from "./useHamperBuilder"
import { useCustomerAccount } from "../account/useCustomerAccount"
import { CustomerAuthPanel } from "../account/CustomerAuthPanel"
import { useStoreSettings } from "../shell/useStoreSettings"

export function HamperBuilder({ state }: { state: ReturnType<typeof useHamperBuilder> }) {
  const order = useOrderSubmit()
  const customer = useCustomerAccount()
  const storeSettings = useStoreSettings()
  const [showAuth, setShowAuth] = useState(false)
  const copy = uiContent.builder
  const submitArgs = {
    tier: state.tier,
    selectedProductIds: state.selected,
    selectedNames: state.selectedNames,
    checkout: state.checkout,
    accepted: state.accepted
  }

  async function submit() {
    if (!customer.account) {
      setShowAuth(true)
      return
    }
    await order.submit({ ...submitArgs, checkout: { ...state.checkout, phone: customer.account.phone } })
  }

  async function authenticated(account: NonNullable<typeof customer.account>) {
    const customerName = state.checkout.customerName.trim() || account.displayName
    const checkout = { ...state.checkout, phone: account.phone, customerName }
    state.updateField("phone", account.phone)
    state.updateField("customerName", customerName)
    setShowAuth(false)
    await order.submit({ ...submitArgs, checkout })
  }

  function openWhatsapp() {
    if (!order.created) return
    const url = order.whatsappUrl(submitArgs, order.created.orderId, order.created.trackingPath, storeSettings.whatsapp)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <section id="builder" className="builder">
      <div className="wrap">
        <div className="centerHead"><div className="kicker">{copy.kicker}</div><h2>{copy.title}</h2><p>{copy.body}</p></div>
        {state.catalogLoading && <div className="trackingState">Latest hamper options load ho rahe hain…</div>}
        <div className="steps fourSteps">{copy.stepLabels.map((label, index) => { const step = index + 1; return <button key={label} className={`stepBtn ${state.step === step ? "active" : state.step > step ? "done" : ""}`} onClick={() => state.goToStep(step)}>{label}</button> })}</div>
        <div className="builderCard">
          {state.step === 1 && <BudgetStep tierId={state.tierId} occasion={state.checkout.occasion} tiers={state.tiers} occasions={state.occasions} onTier={state.selectTier} onOccasion={(value) => state.updateField("occasion", value)} onNext={() => state.setStep(2)} />}
          {state.step === 2 && <ProductStep catalog={state.catalog} tier={state.tier} products={state.filteredProducts} categories={state.categories} category={state.category} search={state.search} selected={state.selected} pointsUsed={state.pointsUsed} onCategory={state.setCategory} onSearch={state.setSearch} onToggle={state.toggleProduct} onBack={() => state.setStep(1)} onNext={() => state.setStep(3)} />}
          {state.step === 3 && <DetailsStep tier={state.tier} checkout={state.checkout} selectedNames={state.selectedNames} occasions={state.occasions} error={state.detailsError} updateField={state.updateField} onBack={() => state.goToStep(2)} onNext={state.goToPayment} />}
          {state.step === 4 && <PaymentStep tier={state.tier} checkout={state.checkout} selectedNames={state.selectedNames} accepted={state.accepted} submitting={order.submitting} error={order.error} created={order.created} customerAccount={customer.account} accountLoading={customer.loading} onAccepted={state.setAccepted} onReference={(value) => state.updateField("paymentReference", value)} onBack={() => state.goToStep(3)} onSubmit={submit} onWhatsapp={openWhatsapp} onLogin={() => setShowAuth(true)} />}
        </div>
      </div>

      {showAuth && <div className="customerAuthOverlay" role="dialog" aria-modal="true" aria-label="Login to place order"><button className="customerAuthBackdrop" type="button" aria-label="Close login" onClick={() => setShowAuth(false)} /><div className="customerAuthSheet"><button className="customerAuthClose" type="button" onClick={() => setShowAuth(false)} aria-label="Close">×</button><CustomerAuthPanel busy={customer.busy} error={customer.error} initialPhone={state.checkout.phone} initialName={state.checkout.customerName} onAuthenticate={customer.authenticate} onSuccess={authenticated} /></div></div>}
    </section>
  )
}
