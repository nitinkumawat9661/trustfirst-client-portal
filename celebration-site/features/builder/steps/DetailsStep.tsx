import type { Tier } from "../../../lib/domain/catalog"
import { uiContent } from "../../../lib/domain/content"
import { OrderSummary } from "../components/OrderSummary"
import type { CheckoutData } from "../types"

export function DetailsStep({ tier, checkout, selectedNames, occasions, error, updateField, onBack, onNext }: {
  tier: Tier
  checkout: CheckoutData
  selectedNames: string[]
  occasions: string[]
  error: string
  updateField: <K extends keyof CheckoutData>(key: K, value: CheckoutData[K]) => void
  onBack: () => void
  onNext: () => void
}) {
  const copy = uiContent.builder.details
  const fields = copy.fields
  return (
    <div className="stepPane active">
      <div className="builderTitle"><div><h3>{copy.title}</h3><p>{copy.body}</p></div></div>
      <div className="detailsGrid">
        <div>
          <div className="formGrid oldUiForm">
            <label className="field"><span>{fields.customerName[0]}</span><input className="control" value={checkout.customerName} onChange={(e) => updateField("customerName", e.target.value)} placeholder={fields.customerName[1]} autoComplete="name" /></label>
            <label className="field"><span>{fields.phone[0]}</span><input className="control" inputMode="tel" value={checkout.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder={fields.phone[1]} autoComplete="tel" /></label>
            <label className="field"><span>{fields.receiverName[0]}</span><input className="control" value={checkout.receiverName} onChange={(e) => updateField("receiverName", e.target.value)} placeholder={fields.receiverName[1]} /></label>
            <label className="field"><span>{fields.requiredDate[0]}</span><input className="control" type="date" value={checkout.requiredDate} onChange={(e) => updateField("requiredDate", e.target.value)} /></label>
            <label className="field"><span>{fields.occasion[0]}</span><select className="control" value={checkout.occasion} onChange={(e) => updateField("occasion", e.target.value)}>{occasions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field"><span>{fields.pincode[0]}</span><input className="control" inputMode="numeric" maxLength={6} value={checkout.pincode} onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, ""))} placeholder={fields.pincode[1]} autoComplete="postal-code" /></label>
            <label className="field wide"><span>{fields.address[0]}</span><textarea className="control" rows={3} value={checkout.address} onChange={(e) => updateField("address", e.target.value)} placeholder={fields.address[1]} autoComplete="street-address" /></label>
            <label className="field"><span>{fields.city[0]}</span><input className="control" value={checkout.city} onChange={(e) => updateField("city", e.target.value)} placeholder={fields.city[1]} autoComplete="address-level2" /></label>
            <label className="field"><span>{fields.state[0]}</span><input className="control" value={checkout.state} onChange={(e) => updateField("state", e.target.value)} placeholder={fields.state[1]} autoComplete="address-level1" /></label>
            <label className="field wide"><span>{fields.message[0]}</span><textarea className="control" rows={2} value={checkout.message} onChange={(e) => updateField("message", e.target.value)} placeholder={fields.message[1]} /></label>
          </div>
          {error && <div className="errorBox">{error}</div>}
          <div className="navRow detailActions"><button className="secondary" onClick={onBack}>{copy.back}</button><span className="tiny">{copy.nextHint}</span><button className="primary" onClick={onNext}>{copy.next}</button></div>
        </div>
        <OrderSummary tier={tier} checkout={checkout} selectedNames={selectedNames} />
      </div>
    </div>
  )
}
