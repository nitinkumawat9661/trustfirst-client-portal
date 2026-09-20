"use client"

import { FormEvent, useState } from "react"

export function CustomRequestSection() {
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [budget, setBudget] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
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
      setNotice("Request received. We can review your budget and requirements before you place an order.")
      setCustomerName("")
      setPhone("")
      setBudget("")
      setMessage("")
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "REQUEST_FAILED"
      setError(code === "RATE_LIMITED" ? "Too many requests. Please try again later." : "Could not submit your request. Check the details and try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="customRequestSection" id="custom-request">
      <div className="wrap">
        <div className="centerHead">
          <div className="kicker">CUSTOM BUDGET</div>
          <h2>Want something different?</h2>
          <p>Tell us your budget and what you want inside the hamper. This is a request, not an automatic order or payment.</p>
        </div>
        <form className="customRequestCard" onSubmit={submit}>
          <div className="customRequestGrid">
            <label>Name<input required minLength={2} maxLength={80} value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" /></label>
            <label>Phone<input required inputMode="numeric" minLength={10} maxLength={13} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} autoComplete="tel" /></label>
            <label>Budget (₹)<input required type="number" min={0} max={1000000} step={1} value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
          </div>
          <label>What should we make?<textarea required minLength={10} maxLength={1200} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Example: ₹1200 budget, birthday hamper, blue theme, chocolates, mug and one photo item. Avoid perfume." /></label>
          <div className="customRequestFooter">
            <span className="tiny">No HTML/script input is accepted. Final price and availability are confirmed manually.</span>
            <button className="primary" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
          </div>
          {notice && <div className="successBox">{notice}</div>}
          {error && <div className="errorBox">{error}</div>}
        </form>
      </div>
    </section>
  )
}
