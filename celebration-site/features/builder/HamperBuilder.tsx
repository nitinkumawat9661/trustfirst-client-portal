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

function builderStepUrl(step: number) {
  const url = new URL(window.location.href)
  url.hash = `builder-step-${step}`
  return `${url.pathname}${url.search}${url.hash}`
}

function historyBuilderStep(value: unknown) {
  const step = Number(value)
  return Number.isInteger(step) && step >= 1 && step <= 4 ? step : null
}

export function HamperBuilder({ state }: { state: ReturnType<typeof useHamperBuilder> }) {
  const order = useOrderSubmit()
  const customer = useCustomerAccount()
  const storeSettings = useStoreSettings()
  const [showAuth, setShowAuth] = useState(false)
  const initialStep = useRef(true)
  const previousStep = useRef(state.step)
  const historyInitialized = useRef(false)
  const applyingHistory = useRef(false)
  const authSheetRef = useRef<HTMLDivElement>(null)
  const authReturnFocus = useRef<HTMLElement | null>(null)
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
    if (!state.draftRestored) return
    notifyUx({
      title: "Aapka hamper draft restore ho gaya ✓",
      body: "Budget, selected items aur occasion wapas aa gaye. Privacy ke liye delivery details aur payment info save nahi ki gayi.",
      tone: "success",
      durationMs: 5000
    })
    state.dismissDraftRestored()
  }, [state.draftRestored])

  useEffect(() => {
    if (initialStep.current) {
      initialStep.current = false
      previousStep.current = state.step
      return
    }

    window.setTimeout(() => scrollToUxTarget(document.querySelector("[data-builder-step-shell]"), "start"), 40)

    if (applyingHistory.current) {
      previousStep.current = state.step
      applyingHistory.current = false
      return
    }

    if (previousStep.current === state.step) return

    if (!historyInitialized.current) {
      window.history.replaceState(
        { ...(window.history.state || {}), celebrationBuilder: true, celebrationBuilderStep: 1 },
        "",
        builderStepUrl(1)
      )
      historyInitialized.current = true
    }

    window.history.pushState(
      { ...(window.history.state || {}), celebrationBuilder: true, celebrationBuilderStep: state.step },
      "",
      builderStepUrl(state.step)
    )
    previousStep.current = state.step
  }, [state.step])

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const eventState = event.state as { celebrationBuilder?: boolean; celebrationBuilderStep?: number } | null
      if (!eventState?.celebrationBuilder) return
      const nextStep = historyBuilderStep(eventState.celebrationBuilderStep)
      if (!nextStep) return
      historyInitialized.current = true
      applyingHistory.current = true
      previousStep.current = nextStep
      state.setStep(nextStep)
      window.setTimeout(() => scrollToUxTarget(document.querySelector("[data-builder-step-shell]"), "start"), 40)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [state.setStep])

  function openAuth() {
    authReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    customer.setError("")
    setShowAuth(true)
  }

  function closeAuth(restoreFocus = true) {
    setShowAuth(false)
    if (!restoreFocus) return
    window.setTimeout(() => authReturnFocus.current?.focus({ preventScroll: true }), 40)
  }

  useEffect(() => {
    if (!showAuth) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleDialogKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeAuth()
        return
      }
      if (event.key !== "Tab") return

      const sheet = authSheetRef.current
      if (!sheet) return
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter((item) => item.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", handleDialogKeyboard)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleDialogKeyboard)
    }
  }, [showAuth])

  useEffect(() => {
    if (!order.error) return
    notifyUx({ title: "Order place nahi hua", body: order.error, tone: "error", durationMs: 4200 })
  }, [order.error])

  useEffect(() => {
    if (!order.created) return
    state.clearDraft()
    notifyUx({ title: "Order successfully place ho gaya ✓", body: `Order ${order.created.orderId} My Celebration dashboard me save ho gaya.`, tone: "success", durationMs: 4500 })
    window.setTimeout(() => {
      const success = document.querySelector<HTMLElement>("[data-order-success]")
      scrollToUxTarget(success, "center")
      window.setTimeout(() => success?.focus({ preventScroll: true }), 280)
    }, 100)
  }, [order.created?.orderId])

  function moveToStep(nextStep: number) {
    const currentHistory = window.history.state as { celebrationBuilder?: boolean; celebrationBuilderStep?: number } | null
    if (nextStep === state.step - 1 && currentHistory?.celebrationBuilder && currentHistory.celebrationBuilderStep === state.step) {
      window.history.back()
      return
    }

    const invalidField = state.goToStep(nextStep)
    if (invalidField) {
      notifyUx({ title: "Ek detail check karni hai", body: "Highlighted field complete karein. Hum aapko wahi le ja rahe hain.", tone: "error" })
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
      openAuth()
      return
    }
    await order.submit({ ...submitArgs, checkout: { ...state.checkout, phone: customer.account.phone } })
  }

  async function authenticated(account: NonNullable<typeof customer.account>) {
    const customerName = state.checkout.customerName.trim() || account.displayName
    const checkout = { ...state.checkout, phone: account.phone, customerName }
    state.updateField("phone", account.phone)
    state.updateField("customerName", customerName)
    closeAuth()
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
          {state.step === 4 && <PaymentStep tier={state.tier} checkout={state.checkout} selectedNames={state.selectedNames} accepted={state.accepted} submitting={order.submitting} error={order.error} created={order.created} customerAccount={customer.account} accountLoading={customer.loading} onAccepted={state.setAccepted} onReference={(value) => state.updateField("paymentReference", value)} onBack={() => moveToStep(3)} onSubmit={submit} onWhatsapp={openWhatsapp} onLogin={openAuth} onNewOrder={startAnotherOrder} />}
        </div>
      </div>

      {showAuth && <div className="customerAuthOverlay" role="dialog" aria-modal="true" aria-label="Login to place order"><button className="customerAuthBackdrop" type="button" aria-label="Close login" onClick={() => closeAuth()} /><div className="customerAuthSheet" ref={authSheetRef}><button className="customerAuthClose" type="button" onClick={() => closeAuth()} aria-label="Close">×</button><CustomerAuthPanel busy={customer.busy} error={customer.error} initialPhone={state.checkout.phone} initialName={state.checkout.customerName} autoFocusPhone onAuthenticate={customer.authenticate} onClearError={() => customer.setError("")} onSuccess={authenticated} /></div></div>}
    </section>
  )
}
