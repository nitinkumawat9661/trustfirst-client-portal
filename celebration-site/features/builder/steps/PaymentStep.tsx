"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { publicEnv } from "../../../config/public-env"
import { routes } from "../../../config/routes"
import { buildUpiUrl } from "../../../lib/domain/payment"
import { formatMoney, type Tier } from "../../../lib/domain/catalog"
import { storeContent, uiContent } from "../../../lib/domain/content"
import { scrollToUxTarget } from "../../ux/UxMessenger"
import type { CustomerAccountView } from "../../account/useCustomerAccount"
import type { CheckoutData } from "../types"
import { validatePaymentReference } from "../validation"

type CreatedOrder = { orderId: string; trackingToken: string; trackingPath: string }

export function PaymentStep({
  tier,
  checkout,
  selectedNames,
  accepted,
  submitting,
  error,
  created,
  customerAccount,
  accountLoading,
  onAccepted,
  onReference,
  onBack,
  onSubmit,
  onWhatsapp,
  onLogin,
  onNewOrder
}: {
  tier: Tier
  checkout: CheckoutData
  selectedNames: string[]
  accepted: boolean
  submitting: boolean
  error: string
  created: CreatedOrder | null
  customerAccount: CustomerAccountView | null
  accountLoading: boolean
  onAccepted: (value: boolean) => void
  onReference: (value: string) => void
  onBack: () => void
  onSubmit: () => void
  onWhatsapp: () => void
  onLogin: () => void
  onNewOrder: () => void
}) {
  const copy = uiContent.builder.payment
  const [paymentStarted, setPaymentStarted] = useState(false)
  const [showPaymentReturn, setShowPaymentReturn] = useState(false)
  const utrRef = useRef<HTMLInputElement>(null)
  const paymentReady = Boolean(publicEnv.upiId && publicEnv.upiName)
  const upiUrl = paymentReady ? buildUpiUrl({
    upiId: publicEnv.upiId,
    upiName: publicEnv.upiName,
    amountRupees: tier.price,
    note: `${storeContent.brand.name} ${tier.name}`
  }) : ""

  function focusUtr() {
    const target = utrRef.current
    if (!target) return
    scrollToUxTarget(target, "center")
    window.setTimeout(() => target.focus({ preventScroll: true }), 240)
  }

  useEffect(() => {
    if (!paymentStarted) return
    function onVisible() {
      if (document.visibilityState !== "visible") return
      setShowPaymentReturn(true)
      window.setTimeout(focusUtr, 180)
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
    }
  }, [paymentStarted])

  useEffect(() => {
    if (!error || !validatePaymentReference(checkout.paymentReference)) return
    focusUtr()
  }, [error])

  return (
    <div className="stepPane active">
      <div className="builderTitle"><div><h3>{copy.title}</h3><p>{copy.body}</p></div><div className="paymentAmount">{formatMoney(tier.price)}</div></div>
      <div className="paymentGrid">
        <div>
          <div className={`checkoutAccount ${customerAccount ? "ready" : "needed"}`}>
            <div><span>{customerAccount ? "READY TO ORDER" : "ONE LAST STEP"}</span><b>{accountLoading ? "Checking your account…" : customerAccount ? `${customerAccount.displayName} • ${customerAccount.phone}` : "Sign in to place your order"}</b><small>{customerAccount ? "Your order and updates will appear in My Celebration." : "Create an account or login, then continue right here."}</small></div>
            {!customerAccount && !accountLoading && <button className="secondary" type="button" onClick={onLogin}>Login / Create account</button>}
            {customerAccount && <Link className="secondary" href={routes.account}>My Celebration</Link>}
          </div>

          <div className="paymentBox">
            <div className="paymentSticker">{copy.paymentIcon}</div>
            <div><span>{copy.payable}</span><strong>{formatMoney(tier.price)}</strong>{paymentReady ? <small>{copy.upiPrefix} {publicEnv.upiId}</small> : <small className="setupPending">{copy.setupPending}</small>}</div>
            {paymentReady ? <a className="primary payButton" href={upiUrl} onClick={() => { setPaymentStarted(true); setShowPaymentReturn(false) }}>{copy.payButton}</a> : <button className="secondary payButton" disabled>{copy.setupButton}</button>}
          </div>
          <div className="paymentSteps">{storeContent.checkout.paymentSteps.map((text, index) => <div key={text}><b>{index + 1}</b><span>{text.replace("{amount}", formatMoney(tier.price))}</span></div>)}</div>
          {showPaymentReturn && !created && <div className="paymentReturnHint" role="status"><span><b>Payment done?</b> Paste your UPI transaction reference below to continue.</span><button className="secondary" type="button" onClick={focusUtr}>Add reference</button></div>}
          <label className="field utrField"><span>{copy.referenceLabel} <b className="requiredMark">*</b></span><input ref={utrRef} className="control" value={checkout.paymentReference} onChange={(e) => onReference(e.target.value)} placeholder={copy.referencePlaceholder} autoComplete="off" inputMode="text" /></label>
          <label className="policyCheck"><input type="checkbox" checked={accepted} onChange={(e) => onAccepted(e.target.checked)} /><span>{storeContent.checkout.policyConsent}</span></label>
          {error && <div className="errorBox" role="alert">{error}</div>}
          {created && <div className="successBox" data-order-success tabIndex={-1}><strong>{copy.successPrefix} {created.orderId}</strong><span>Your order is saved. Follow packing and shipping updates from My Celebration.</span><div className="successActions"><Link className="primary" href={routes.account}>View my order</Link><Link className="secondary" href={created.trackingPath}>{copy.trackingButton}</Link><button className="secondary" type="button" onClick={onWhatsapp}>WhatsApp support</button><button className="secondary" type="button" onClick={onNewOrder}>Build another hamper</button></div></div>}
          <div className="navRow paymentActions"><button className="secondary" type="button" onClick={onBack}>{copy.back}</button><span className="tiny">{customerAccount ? copy.hint : "Your hamper choices stay here while you sign in"}</span><button className="primary" type="button" disabled={submitting || Boolean(created) || !paymentReady || accountLoading} onClick={onSubmit}>{submitting ? copy.submitting : customerAccount ? "Place order" : "Login & place order"}</button></div>
        </div>
        <div className="trustCard"><div className="trustCardIcon">{copy.protectionIcon}</div><div className="kicker">{uiContent.promise.kicker}</div><h3>{uiContent.promise.title}</h3><ul>{storeContent.promiseCards.map((card) => <li key={card.title}>{copy.protectionBullet} {card.title}</li>)}</ul><Link className="policyLink" href={routes.policies}>{uiContent.footer.policy} {copy.policyArrow}</Link></div>
      </div>
    </div>
  )
}
