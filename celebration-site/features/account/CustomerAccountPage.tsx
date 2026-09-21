"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { routes } from "../../config/routes"
import { formatMoney } from "../../lib/domain/catalog"
import { customerTimeline, orderStatusLabels, type OrderStatus } from "../../lib/domain/order-status"
import { supportWhatsappUrl } from "../../lib/domain/support"
import { useStoreSettings } from "../shell/useStoreSettings"
import { notifyUx } from "../ux/UxMessenger"
import { CustomerAuthPanel } from "./CustomerAuthPanel"
import { useCustomerAccount } from "./useCustomerAccount"

type DashboardOrder = {
  publicId: string
  amountPaise: number
  tierName: string
  productNames: string[]
  requiredDate: string
  occasion: string
  status: OrderStatus
  paymentStatus: string
  receiverName: string
  packingVideoUrl: string | null
  shippingProvider: string | null
  shippingTrackingNumber: string | null
  customerApprovedAt: string | null
  createdAt: string
  updatedAt: string
}

function progressIndex(status: OrderStatus) {
  const index = customerTimeline.indexOf(status)
  if (index >= 0) return index
  if (status === "issue_reported" || status === "refund_or_replacement_resolved") return customerTimeline.length - 1
  return 0
}

function friendlyOrderError(code: string) {
  if (code === "UNAUTHORIZED") return "Session expire ho gayi. Dobara login karein."
  if (code === "RATE_LIMITED") return "Bahut requests ho gayi hain. Thodi der baad refresh karein."
  if (code === "APPROVAL_SERVICE_UNAVAILABLE") return "Packing approval abhi process nahi ho paya. Dobara try karein."
  return "Order updates load nahi ho paaye. Internet check karke retry karein."
}

function nextUpdateText(status: OrderStatus) {
  const copy: Record<OrderStatus, string> = {
    payment_verification_pending: "Next: team aapka payment reference verify karegi.",
    payment_verified: "Next: hamper preparation start hogi.",
    preparing: "Next: packing complete hote hi approval video yahan aayega.",
    packing_video_ready: "Action needed: packing video dekho aur dispatch approve karo.",
    customer_approved: "Next: team courier handover aur tracking add karegi.",
    shipped: "Next: courier delivery update ka wait hai.",
    delivered: "Delivered. Koi issue ho to WhatsApp support use karein.",
    issue_reported: "Support team aapke reported issue ko review kar rahi hai.",
    refund_or_replacement_resolved: "Issue resolution complete mark ho chuka hai.",
    cancelled: "Ye order cancelled hai. Help ke liye WhatsApp support available hai."
  }
  return copy[status]
}

export function CustomerAccountPage() {
  const accountState = useCustomerAccount()
  const settings = useStoreSettings()
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState("")
  const [approving, setApproving] = useState("")
  const [approvalConsent, setApprovalConsent] = useState<Record<string, boolean>>({})
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)

  const loadOrders = useCallback(async (announce = false) => {
    if (!accountState.account) return
    setOrdersLoading(true)
    setOrdersError("")
    try {
      const response = await fetch(routes.api.customerOrders, { cache: "no-store" })
      const data = await response.json() as { ok?: boolean; orders?: DashboardOrder[]; error?: string }
      if (!response.ok || !data.ok) throw new Error(data.error || "ORDER_LOAD_FAILED")
      setOrders(data.orders || [])
      setLastRefreshedAt(new Date())
      if (announce) notifyUx({ title: "Orders updated ✓", body: "Latest order progress load ho gaya.", tone: "success" })
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "ORDER_LOAD_FAILED"
      const message = friendlyOrderError(code)
      setOrdersError(message)
      if (announce) notifyUx({ title: "Refresh nahi hua", body: message, tone: "error" })
    } finally {
      setOrdersLoading(false)
    }
  }, [accountState.account])

  useEffect(() => { if (accountState.account) loadOrders() }, [accountState.account, loadOrders])

  async function approvePacking(order: DashboardOrder) {
    if (!approvalConsent[order.publicId]) return
    setApproving(order.publicId)
    setOrdersError("")
    try {
      const response = await fetch(routes.api.customerOrderApprove(order.publicId), { method: "POST" })
      const data = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !data.ok) throw new Error(data.error || "APPROVAL_FAILED")
      setApprovalConsent((current) => ({ ...current, [order.publicId]: false }))
      notifyUx({ title: "Packing approved ✓", body: `${order.publicId} dispatch ke liye approve ho gaya.`, tone: "success", durationMs: 4000 })
      await loadOrders()
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "APPROVAL_FAILED"
      const message = friendlyOrderError(code)
      setOrdersError(message)
      notifyUx({ title: "Approval nahi hua", body: message, tone: "error" })
    } finally {
      setApproving("")
    }
  }

  async function logout() {
    const ok = await accountState.logout()
    if (ok) notifyUx({ title: "Logout ho gaya", body: "Aapke order data private rahenge. Dobara login kabhi bhi kar sakte hain.", tone: "info" })
    else notifyUx({ title: "Logout nahi hua", body: "Network issue ho sakta hai. Dobara try karein.", tone: "error" })
  }

  async function copyTracking(number: string) {
    try {
      await navigator.clipboard.writeText(number)
      notifyUx({ title: "Tracking number copied ✓", body: number, tone: "success" })
    } catch {
      notifyUx({ title: "Copy nahi hua", body: `Tracking number: ${number}`, tone: "error" })
    }
  }

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter((order) => !["delivered", "refund_or_replacement_resolved", "cancelled"].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "delivered").length
  }), [orders])

  if (accountState.loading) return <div className="accountState">Account load ho raha hai…</div>

  if (!accountState.account) {
    return (
      <div className="accountPublicWrap">
        <CustomerAuthPanel busy={accountState.busy} error={accountState.error} onAuthenticate={accountState.authenticate} onClearError={() => accountState.setError("")} onSuccess={(account) => notifyUx({ title: "Login successful ✓", body: `${account.displayName}, aapka dashboard load ho raha hai.`, tone: "success" })} />
      </div>
    )
  }

  return (
    <div className="customerDashboard">
      <section className="customerDashHero">
        <div>
          <div className="kicker">MY CELEBRATION</div>
          <h1>Hi {accountState.account.displayName}, yahan sab order updates ek jagah milenge.</h1>
          <p>Order kab kiya, abhi kis stage par hai, packing video aur shipping details. Sab mobile-friendly timeline me.</p>
        </div>
        <div className="customerDashActions">
          <Link className="primary" href={`${routes.home}#budgets`}>Naya hamper explore karein</Link>
          <button className="secondary" type="button" disabled={accountState.busy} onClick={logout}>{accountState.busy ? "Logging out…" : "Logout"}</button>
        </div>
      </section>

      <section className="customerStats" aria-label="Order summary">
        <div><span>Total orders</span><b>{stats.total}</b></div>
        <div><span>In progress</span><b>{stats.active}</b></div>
        <div><span>Delivered</span><b>{stats.delivered}</b></div>
      </section>

      <div className="customerDashToolbar">
        <div><div className="kicker">YOUR ORDERS</div><h2>Order history & progress</h2>{lastRefreshedAt && <div className="dashboardActionNote">Last refreshed {lastRefreshedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>}</div>
        <button className="secondary" type="button" disabled={ordersLoading} onClick={() => loadOrders(true)}>{ordersLoading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {ordersError && <div className="errorBox" role="alert">{ordersError}</div>}
      {ordersLoading && orders.length === 0 && <div className="accountState">Orders load ho rahe hain…</div>}
      {!ordersLoading && orders.length === 0 && (
        <section className="customerEmptyOrders">
          <h3>Abhi koi order nahi hai</h3>
          <p>Hamper explore karo, customize karo. Login already hai, checkout aur easy rahega.</p>
          <Link className="primary" href={`${routes.home}#builder`}>Hamper banana start karein</Link>
        </section>
      )}

      <div className="customerOrderList">
        {orders.map((order) => {
          const currentIndex = progressIndex(order.status)
          const supportMessage = `Hi Celebration, mujhe order ${order.publicId} ke baare me help chahiye.`
          const approvalReady = order.status === "packing_video_ready" && Boolean(order.packingVideoUrl)
          return (
            <article className="customerOrderCard" key={order.publicId}>
              <header className="customerOrderHead">
                <div><small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small><h3>{order.tierName}</h3><span>{order.publicId}</span></div>
                <div><strong>{formatMoney(order.amountPaise / 100)}</strong><span className={`customerStatus status-${order.status}`}>{orderStatusLabels[order.status]}</span></div>
              </header>

              <div className="customerOrderMeta">
                <div><span>Gift for</span><b>{order.receiverName}</b></div>
                <div><span>Occasion</span><b>{order.occasion}</b></div>
                <div><span>Required by</span><b>{order.requiredDate}</b></div>
                <div><span>Payment</span><b>{order.paymentStatus}</b></div>
              </div>

              <div className="checkoutProgressNote"><span>→</span><span><b>Ab kya hoga:</b> {nextUpdateText(order.status)}</span></div>

              <div className="customerProgress" aria-label="Order progress">
                {customerTimeline.map((status, index) => <div className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} key={status}><i>{index <= currentIndex ? "✓" : ""}</i><span>{orderStatusLabels[status]}</span></div>)}
              </div>

              {order.productNames.length > 0 && <div className="customerOrderProducts"><span>Selected items</span><p>{order.productNames.join(" • ")}</p></div>}

              <div className="customerOrderUpdates">
                <div className="customerUpdateCard"><span>Packing video</span>{order.packingVideoUrl ? <a href={order.packingVideoUrl} target="_blank" rel="noreferrer">Video dekhein</a> : <b>Preparation ke baad yahan milega</b>}</div>
                <div className="customerUpdateCard"><span>Shipping</span>{order.shippingTrackingNumber ? <><b>{order.shippingProvider || "Courier"} • {order.shippingTrackingNumber}</b><div className="shippingActions"><button className="secondary" type="button" onClick={() => copyTracking(order.shippingTrackingNumber!)}>Copy tracking</button></div></> : <b>Ship hone ke baad tracking yahan aayegi</b>}</div>
              </div>

              {approvalReady && <div className="customerPackingApproval"><div><b>Packing aapke approval ke liye ready hai</b><p>Video check karke approve karein. Approval ke baad team courier handover kar sakti hai.</p></div><label><input type="checkbox" checked={Boolean(approvalConsent[order.publicId])} onChange={(event) => setApprovalConsent((current) => ({ ...current, [order.publicId]: event.target.checked }))} /><span>Maine packing video dekh liya hai aur dispatch approve karta/karti hoon.</span></label><button className="primary" type="button" disabled={!approvalConsent[order.publicId] || approving === order.publicId} onClick={() => approvePacking(order)}>{approving === order.publicId ? "Approving…" : "Packing approve karein"}</button></div>}

              <footer className="customerOrderFooter">
                <small>Last update: {new Date(order.updatedAt).toLocaleString("en-IN")}</small>
                <a className="secondary" href={supportWhatsappUrl(supportMessage, settings.whatsapp)} target="_blank" rel="noreferrer">WhatsApp support</a>
              </footer>
            </article>
          )
        })}
      </div>

      <section className="accountSecurityNote">
        <b>Account privacy</b>
        <p>OTP intentionally use nahi ho raha. Isliye sirf isi account se place kiye gaye orders dashboard me aate hain; kisi mobile number ke purane orders auto-claim nahi hote.</p>
      </section>
    </div>
  )
}
