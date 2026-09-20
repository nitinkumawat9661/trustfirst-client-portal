"use client"

import { useEffect, useState } from "react"
import { formatMoney } from "../../lib/domain/catalog"
import type { CustomHamperRequestRecord } from "../../lib/server/custom-requests"

export function AdminCustomRequests() {
  const [requests, setRequests] = useState<CustomHamperRequestRecord[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")

  async function load() {
    const response = await fetch("/api/admin/custom-requests", { cache: "no-store" })
    const data = await response.json() as { ok?: boolean; requests?: CustomHamperRequestRecord[]; error?: string }
    if (!response.ok || !data.ok) throw new Error(data.error || "REQUEST_LOAD_FAILED")
    setRequests(data.requests || [])
  }

  useEffect(() => { load().catch((caught) => setError(caught instanceof Error ? caught.message : "REQUEST_LOAD_FAILED")) }, [])

  async function update(id: string, status: CustomHamperRequestRecord["status"]) {
    setBusy(id)
    setError("")
    try {
      const response = await fetch("/api/admin/custom-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      })
      const data = await response.json() as { ok?: boolean; request?: CustomHamperRequestRecord; error?: string }
      if (!response.ok || !data.ok || !data.request) throw new Error(data.error || "REQUEST_UPDATE_FAILED")
      setRequests((current) => current.map((item) => item.id === id ? data.request! : item))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "REQUEST_UPDATE_FAILED")
    } finally {
      setBusy("")
    }
  }

  return (
    <section className="adminConfigPanel">
      <div className="adminConfigHead"><div><div className="kicker">CUSTOM REQUESTS</div><h2>Budget request queue</h2><p>Requests sent from the public custom-budget form.</p></div><button className="secondary" onClick={() => load().catch((caught) => setError(String(caught)))}>Refresh</button></div>
      {error && <div className="errorBox adminFeedback">{error}</div>}
      <div className="adminRequestList">
        {requests.length === 0 && <div className="trackingState">No custom hamper requests.</div>}
        {requests.map((item) => <article className="adminRequestCard" key={item.id}>
          <div><b>{item.customerName}</b><span>{item.phone} • {formatMoney(item.budgetPaise / 100)}</span></div>
          <p>{item.requestText}</p>
          <div className="adminRequestFooter"><small>{new Date(item.createdAt).toLocaleString()}</small><select disabled={busy === item.id} value={item.status} onChange={(event) => update(item.id, event.target.value as CustomHamperRequestRecord["status"])}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></div>
        </article>)}
      </div>
    </section>
  )
}
