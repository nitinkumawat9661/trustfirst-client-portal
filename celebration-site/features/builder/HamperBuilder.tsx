"use client"

import { useEffect, useRef, useState } from "react"
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
import { focusCheckoutField, notifyUx, scrollToUxTarget } from "../ux/UxMessenger"

function shortDelay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function HamperBuilder({ state }: { state: ReturnType<typeof useHamperBuilder> }) {
  const order = useOrderSubmit()
  const customer = useCustomerAccount()
  const storeSettings = useStoreSettings()
  const [showAuth, setShowAuth] = useState(false)
  const initialStep = useRef(true)
  const copy = uiContent.builder
  const submitArgs = {
    tier: state.tier,
    selectedProductIds: state.selected,
    selectedNames: state.selectedNames,
    checkout: state.checkout,
    accepted: state.accepted
  }

  useEffect(() => {
    if (!customer.account) return
    state.updateField("phone", customer.account.phone)
    if (!state.checkout.customerName.trim()) state.updateField("customerName", customer.account.displayName)
  }, [customer.account?.id])

  useEffect(() => {
    if (initialStep.current) {
      initialStep.current = false
      return
    }
    window.setTimeout(() => scrollToUxTarget(document.querySelector("[data-builder-step-shell]"), "start"), 40)
  }, [state.step])

  useEffect(() => {
    if (!order.error) return
    notifyUx({ title: "Order place nahi hua", body: order.error, tone: "error", durationMs: 4200 })
  }, [order.error])

  useEffect(() => {
    if (!order.created) return
    notifyUx({ title: "Order successfully place ho gaya ✓", body: `Order ${order.created.orderId} My Celebration dashboard me save ho gaya.`, tone: "success", durationMs: 4500 })
    window.setTimeout(() => scrollToUxTarget(document.querySelector("[data-order-success]"), "center"), 100)
  }, [order.created?.orderId])

  function moveToStep(nextStep: number) {
    const invalidField = state.goToStep(nextStep)
    if (invalidField) {
      notifyUx({ title: "Ek detail check karni hai", body: state.detailsFieldErrors[invalidField] || "Highlighted field complete karein.", tone: "error" })
      window.setTimeout(() => focusCheckoutField(invalidField), 80)
    }
  }

  function moveToPayment() {
    const invalidField = state.goToPayment()
    if (invalidField) {
      notifyUx({ title: "Is field ko complete karein", body: "Hum aapko missing detail par le ja rahe hain.", tone: "error" })
      window.setTimeout(() => focusCheckoutField(invalidField), 80)
    }
  }

  async function submit() {
    if (!customer.account) {
      notifyUx({ title: "Bas login baki hai", body: "Mobile + password se login/signup karein. Aapka hamper selection safe rahega.", tone: "info" })
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
    notifyUx({ title: "Login ho gaya ✓", body: `${account.displayName}, ab aapka order continue ho raha hai.`, tone: "success", durationMs: 2200 })
    await shortDelay(650)
    await order.submit({ ...submitArgs, checkout })
  }

  function openWhatsapp() {
    if (!order.created) return
    const url = order.whatsappUrl(submitArgs, order.created.orderId, order.created.trackingPath, storeSettings.whatsapp)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function startAnotherOrder() {
    order.reset()
    state.resetForNewOrder(customer.account ? { customerName: customer.account.displayName, phone: customer.account.phone } : undefined)
    notifyUx({ title: "Naya hamper ready", body: "Aapka account login hi rahega. Naya budget choose karein.", tone: "info" })
    window.setTimeout(() => scrollToUxTarget(document.getElementById("builder"), "start"), 80)
  }

  return (
    <section id="builder" className="builder">
      <div className="wrap">
        <div className="centerHead"><div className="kicker">{copy.kicker}</div><h2>{copy.title}</h2><p>{copy.body}</p></div>
        {state.catalogLoading && <div className="trackingState">Latest hamper options load ho rahe hain…</div>}
        {state.catalogError && <div className="catalogLoadNotice" role="alert"><span>{state.catalogError}</span><button className="secondary" type="button" disabled={state.catalogLoading} onClick={state.retryCatalog}>{state.catalogLoading ? "Retrying…" : "Retry"}</button></div>}
        <div className="steps fourSteps">{copy.stepLabels.map((label, index) => { const step = index + 1; return <button type="button" key={label} className={`stepBtn ${state.step === step ? "active" : state.step > step ? "done" : ""}`} aria-current={state.step === step ? "step" : undefined} onClick={() => moveToStep(step)}>{label}</button> })}</div>
        <div className="builderCard" data-builder-step-shell>
          {state.step === 1 && <BudgetStep tierId={state.tierId} occasion={state.checkout.occasion} tiers={state.tiers} occasions={state.occasions} onTier={state.selectTier} onOccasion={(value) => state.updateField("occasion", value)} onNext={() => moveToStep(2)} />}
          {state.step === 2 && <ProductStep catalog={state.catalog} tier={state.tier} products={state.filteredProducts} categories={state.categories} category={state.category} search={state.search} selected={state.selected} pointsUsed={state.pointsUsed} onCategory={state.setCategory} onSearch={state.setSearch} onToggle={state.toggleProduct} onBack={() => moveToStep(1)} onNext={() => moveToStep(3)} />}
          {state.step === 3 && <DetailsStep tier={state.tier} checkout={state.checkout} selectedNames={state.selectedNames} occasions={state.occasions} error={state.detailsError} fieldErrors={state.detailsFieldErrors} updateField={state.updateField} onBack={() => moveToStep(2)} onNext={moveToPayment} />}
          {state.step === 4 && <PaymentStep tier={state.tier} checkout={state.checkout} selectedNames={state.selectedNames} accepted={state.accepted} submitting={order.submitting} error={order.error} created={order.created} customerAccount={customer.account} accountLoading={customer.loading} onAccepted={state.setAccepted} onReference={(value) => state.updateField("paymentReference", value)} onBack={() => moveToStep(3)} onSubmit={submit} onWhatsapp={openWhatsapp} onLogin={() => setShowAuth(true)} onNewOrder={startAnotherOrder} />}
        </div>
      </div>

      {showAuth && <div className="customerAuthOverlay" role="dialog" aria-modal="true" aria-label="Login to place order"><button className="customerAuthBackdrop" type="button" aria-label="Close login" onClick={() => setShowAuth(false)} /><div className="customerAuthSheet"><button className="customerAuthClose" type="button" onClick={() => setShowAuth(false)} aria-label="Close">×</button><CustomerAuthPanel busy={customer.busy} error={customer.error} initialPhone={state.checkout.phone} initialName={state.checkout.customerName} onAuthenticate={customer.authenticate} onClearError={() => customer.setError("")} onSuccess={authenticated} /></div></div>}
    </section>
  )
}
