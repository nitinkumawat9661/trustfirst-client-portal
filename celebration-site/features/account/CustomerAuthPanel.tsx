"use client"

import { useState } from "react"
import { supportWhatsappUrl } from "../../lib/domain/support"
import { useStoreSettings } from "../shell/useStoreSettings"
import type { CustomerAccountView } from "./useCustomerAccount"

type Mode = "login" | "signup"

const errorCopy: Record<string, string> = {
  INVALID_PHONE: "10-digit mobile number check karein.",
  INVALID_PASSWORD: "Password minimum 8 characters ka rakhein.",
  INVALID_CREDENTIALS: "Mobile number ya password match nahi hua.",
  INVALID_NAME: "Apna naam enter karein.",
  ACCOUNT_EXISTS: "Is mobile number ka account already hai. Login karein.",
  RATE_LIMITED: "Bahut attempts ho gaye. Thodi der baad try karein.",
  UNSAFE_TEXT: "Is field me unsupported characters hain.",
  ACCOUNT_SERVICE_UNAVAILABLE: "Login service abhi available nahi hai. Dobara try karein."
}

export function CustomerAuthPanel({
  busy,
  error,
  initialPhone = "",
  initialName = "",
  onAuthenticate,
  onSuccess
}: {
  busy: boolean
  error: string
  initialPhone?: string
  initialName?: string
  onAuthenticate: (mode: Mode, values: { phone: string; password: string; displayName?: string }) => Promise<CustomerAccountView | null>
  onSuccess?: (account: CustomerAccountView) => void
}) {
  const settings = useStoreSettings()
  const [mode, setMode] = useState<Mode>("login")
  const [phone, setPhone] = useState(initialPhone)
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState(initialName)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const account = await onAuthenticate(mode, { phone, password, displayName: mode === "signup" ? displayName : undefined })
    if (account) onSuccess?.(account)
  }

  return (
    <div className="customerAuthCard">
      <div className="customerAuthIntro">
        <div className="kicker">YOUR CELEBRATION ACCOUNT</div>
        <h2>{mode === "login" ? "Login karke order complete karein" : "30 seconds me account bana lo"}</h2>
        <p>OTP nahi. Sirf mobile number + password. Explore pehle bhi kar sakte ho, login order place karte waqt zaroori hai.</p>
      </div>

      <div className="customerAuthTabs" role="tablist" aria-label="Login or create account">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>New account</button>
      </div>

      <form className="customerAuthForm" onSubmit={submit}>
        {mode === "signup" && <label className="field"><span>Aapka naam</span><input className="control" value={displayName} maxLength={80} autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} placeholder="Naam" /></label>}
        <label className="field"><span>Mobile number</span><input className="control" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="10-digit mobile" /></label>
        <label className="field"><span>Password</span><input className="control" type="password" minLength={8} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 characters" /></label>
        {error && <div className="errorBox">{errorCopy[error] || error}</div>}
        <button className="primary fullWidth" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "login" ? "Login & continue" : "Create account & continue"}</button>
      </form>

      <div className="customerAuthHelp">
        <span>Password ya login me help chahiye?</span>
        <a href={supportWhatsappUrl("Hi Celebration, mujhe account/login help chahiye.", settings.whatsapp)} target="_blank" rel="noreferrer">WhatsApp support</a>
      </div>
      <small className="customerAuthPrivacy">Mobile ownership OTP se verify nahi hota, isliye purane orders sirf phone match karke account me attach nahi kiye jaate.</small>
    </div>
  )
}
