"use client"

import Link from "next/link"
import { publicEnv } from "../../../config/public-env"
import { routes } from "../../../config/routes"
import { buildUpiUrl } from "../../../lib/domain/payment"
import { formatMoney, type Tier } from "../../../lib/domain/catalog"
import { storeContent, uiContent } from "../../../lib/domain/content"
import type { CheckoutData } from "../types"

type CreatedOrder = { orderId: string; trackingToken: string; trackingPath: string }

export function PaymentStep({
  tier,
  checkout,
  selectedNames,
  accepted,
  submitting,
  error,
  created,
  onAccepted,
  onReference,
  onBack,
  onSubmit,
  onWhatsapp
}: {
  tier: Tier
  checkout: CheckoutData
  selectedNames: string[]
  accepted: boolean
  submitting: boolean
  error: string
  created: CreatedOrder | null
  onAccepted: (value: boolean) => void
  onReference: (value: string) => void
  onBack: () => void
  onSubmit: () => void
  onWhatsapp: () => void
}) {
  const copy = uiContent.builder.payment
  const paymentReady = Boolean(publicEnv.upiId && publicEnv.upiName)
  const upiUrl = paymentReady ? buildUpiUrl({
    upiId: publicEnv.upiId,
    upiName: publicEnv.upiName,
    amountRupees: tier.price,
    note: `${storeContent.brand.name} ${tier.name}`
  }) : ""

  return (
    <div className="stepPane active">
      <div className="builderTitle"><div><h3>{copy.title}</h3><p>{copy.body}</p></div><div className="paymentAmount">{formatMoney(tier.price)}</div></div>
      <div className="paymentGrid">
        <div>
          <div className="paymentBox">
            <div className="paymentSticker">{copy.paymentIcon}</div>
            <div><span>{copy.payable}</span><strong>{formatMoney(tier.price)}</strong>{paymentReady ? <small>{copy.upiPrefix} {publicEnv.upiId}</small> : <small className="setupPending">{copy.setupPending}</small>}</div>
            {paymentReady ? <a className="primary payButton" href={upiUrl}>{copy.payButton}</a> : <button className="secondary payButton" disabled>{copy.setupButton}</button>}
          </div>
          <div className="paymentSteps">{storeContent.checkout.paymentSteps.map((text, index) => <div key={text}><b>{index + 1}</b><span>{text.replace("{amount}", formatMoney(tier.price))}</span></div>)}</div>
          <label className="field utrField"><span>{copy.referenceLabel}</span><input className="control" value={checkout.paymentReference} onChange={(e) => onReference(e.target.value)} placeholder={copy.referencePlaceholder} autoComplete="off" /></label>
          <label className="policyCheck"><input type="checkbox" checked={accepted} onChange={(e) => onAccepted(e.target.checked)} /><span>{storeContent.checkout.policyConsent}</span></label>
          {error && <div className="errorBox">{error}</div>}
          {created && <div className="successBox"><strong>{copy.successPrefix} {created.orderId}</strong><span>{copy.successBody}</span><div className="successActions"><Link className="secondary" href={created.trackingPath}>{copy.trackingButton}</Link>{publicEnv.whatsapp && <button className="secondary" onClick={onWhatsapp}>{copy.whatsappButton}</button>}</div></div>}
          <div className="navRow paymentActions"><button className="secondary" onClick={onBack}>{copy.back}</button><span className="tiny">{copy.hint}</span><button className="primary" disabled={submitting || Boolean(created) || !paymentReady} onClick={onSubmit}>{submitting ? copy.submitting : copy.submit}</button></div>
        </div>
        <div className="trustCard"><div className="trustCardIcon">{copy.protectionIcon}</div><div className="kicker">{uiContent.promise.kicker}</div><h3>{uiContent.promise.title}</h3><ul>{storeContent.promiseCards.map((card) => <li key={card.title}>{copy.protectionBullet} {card.title}</li>)}</ul><Link className="policyLink" href={routes.policies}>{uiContent.footer.policy} {copy.policyArrow}</Link></div>
      </div>
    </div>
  )
}
