"use client"

import { FormEvent, useState } from "react"
import { supportWhatsappUrl } from "../../lib/domain/support"
import { useStoreSettings } from "../shell/useStoreSettings"
import { notifyUx, scrollToUxTarget } from "../ux/UxMessenger"

export function CustomRequestSection() {
  const settings = useStoreSettings()
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [budget, setBudget] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice("")
    setError("")
    try {
      const response = await fetch("/api/custom-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, phone, budget: Number(budget), message })
      })
      const data = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !data.ok) throw new Error(data.error || "REQUEST_FAILED")
      const success = "Request mil gayi. Team budget aur requirement dekhkar aapse contact karegi."
      setNotice(success)
      setCustomerName("")
      setPhone("")
      setBudget("")
      setMessage("")
      notifyUx({ title: "Budget request mil gayi ✓", body: "Team aapki requirement review karke contact karegi.", tone: "success", durationMs: 4200 })
      window.setTimeout(() => scrollToUxTarget(document.querySelector("#custom-request .successBox"), "center"), 80)
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "REQUEST_FAILED"
      const failure = code === "RATE_LIMITED" ? "Bahut requests ho gayi hain. Thodi der baad try karein." : "Request send nahi hui. Details check karke dobara try karein."
      setError(failure)
      notifyUx({ title: "Request send nahi hui", body: failure, tone: "error" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="customRequestSection" id="custom-request">
      <div className="wrap">
        <div className="centerHead">
          <div className="kicker">APNA BUDGET • APNI CHOICE</div>
          <h2>Budget fixed hai? Aap batao, hamper hum plan kar denge.</h2>
          <p>Exact listed hamper fit nahi ho raha? Budget, occasion aur kya-kya chahiye likh do. Team manually best mix suggest karegi. Ye request hai, automatic order ya payment nahi.</p>
        </div>
        <form className="customRequestCard" onSubmit={submit}>
          <div className="customRequestGrid">
            <label>Aapka naam <b className="requiredMark">*</b><input required minLength={2} maxLength={80} value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" /></label>
            <label>Mobile / WhatsApp <b className="requiredMark">*</b><input required inputMode="numeric" minLength={10} maxLength={13} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} autoComplete="tel" /></label>
            <label>Aapka budget (₹) <b className="requiredMark">*</b><input required type="number" min={0} max={1000000} step={1} value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
          </div>
          <label>Kaisa hamper chahiye? <b className="requiredMark">*</b><textarea required minLength={10} maxLength={1200} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Example: ₹1200 budget, birthday, blue theme, chocolates + mug + photo item; perfume nahi chahiye." /></label>
          <div className="customRequestFooter">
            <span className="tiny">Final price, stock aur delivery feasibility team confirm karegi.</span>
            <div className="customRequestActions"><a className="secondary" href={supportWhatsappUrl("Hi Celebration, mujhe apne budget me custom hamper banwana hai.", settings.whatsapp)} target="_blank" rel="noreferrer">WhatsApp par pucho</a><button className="primary" disabled={busy}>{busy ? "Request bhej rahe hain…" : "Budget request bhejo"}</button></div>
          </div>
          {notice && <div className="successBox" role="status">{notice}</div>}
          {error && <div className="errorBox" role="alert">{error}</div>}
        </form>
      </div>
    </section>
  )
}
