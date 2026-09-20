"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { routes } from "../../config/routes"
import { formatMoney } from "../../lib/domain/catalog"
import { customerTimeline, orderStatusLabels, type OrderStatus } from "../../lib/domain/order-status"
import { supportWhatsappUrl } from "../../lib/domain/support"
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

export function CustomerAccountPage() {
  const accountState = useCustomerAccount()
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState("")

  const loadOrders = useCallback(async () => {
    if (!accountState.account) return
    setOrdersLoading(true)
    setOrdersError("")
    try {
      const response = await fetch(routes.api.customerOrders, { cache: "no-store" })
      const data = await response.json() as { ok?: boolean; orders?: DashboardOrder[]; error?: string }
      if (!response.ok || !data.ok) throw new Error(data.error || "ORDER_LOAD_FAILED")
      setOrders(data.orders || [])
    } catch (cause) {
      setOrdersError(cause instanceof Error ? cause.message : "ORDER_LOAD_FAILED")
    } finally {
      setOrdersLoading(false)
    }
  }, [accountState.account])

  useEffect(() => { if (accountState.account) loadOrders() }, [accountState.account, loadOrders])

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter((order) => !["delivered", "refund_or_replacement_resolved", "cancelled"].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "delivered").length
  }), [orders])

  if (accountState.loading) return <div className="accountState">Account load ho raha hai…</div>

  if (!accountState.account) {
    return (
      <div className="accountPublicWrap">
        <CustomerAuthPanel busy={accountState.busy} error={accountState.error} onAuthenticate={accountState.authenticate} />
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
          <button className="secondary" type="button" disabled={accountState.busy} onClick={accountState.logout}>Logout</button>
        </div>
      </section>

      <section className="customerStats" aria-label="Order summary">
        <div><span>Total orders</span><b>{stats.total}</b></div>
        <div><span>In progress</span><b>{stats.active}</b></div>
        <div><span>Delivered</span><b>{stats.delivered}</b></div>
      </section>

      <div className="customerDashToolbar">
        <div><div className="kicker">YOUR ORDERS</div><h2>Order history & progress</h2></div>
        <button className="secondary" type="button" disabled={ordersLoading} onClick={loadOrders}>{ordersLoading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {ordersError && <div className="errorBox">{ordersError}</div>}
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

              <div className="customerProgress" aria-label="Order progress">
                {customerTimeline.map((status, index) => <div className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} key={status}><i>{index <= currentIndex ? "✓" : ""}</i><span>{orderStatusLabels[status]}</span></div>)}
              </div>

              {order.productNames.length > 0 && <div className="customerOrderProducts"><span>Selected items</span><p>{order.productNames.join(" • ")}</p></div>}

              <div className="customerOrderUpdates">
                <div className="customerUpdateCard"><span>Packing video</span>{order.packingVideoUrl ? <a href={order.packingVideoUrl} target="_blank" rel="noreferrer">Video dekhein</a> : <b>Preparation ke baad yahan milega</b>}</div>
                <div className="customerUpdateCard"><span>Shipping</span>{order.shippingTrackingNumber ? <b>{order.shippingProvider || "Courier"} • {order.shippingTrackingNumber}</b> : <b>Ship hone ke baad tracking yahan aayegi</b>}</div>
              </div>

              <footer className="customerOrderFooter">
                <small>Last update: {new Date(order.updatedAt).toLocaleString("en-IN")}</small>
                <a className="secondary" href={supportWhatsappUrl(supportMessage)} target="_blank" rel="noreferrer">WhatsApp support</a>
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
