"use client"

import { useMemo, useState } from "react"
import type { AdminOrderFilterId } from "../../config/admin-orders"
import { uiContent } from "../../lib/domain/content"
import { AdminOrderCard } from "./AdminOrderCard"
import { AdminOrderToolbar } from "./AdminOrderToolbar"
import { countAdminFilter, defaultAdminOrderFilter, filterAdminOrders, type AdminOrderSort } from "./orderFilters"
import { useAdminOrders } from "./useAdminOrders"

export function AdminDashboard() {
  const admin = useAdminOrders()
  const copy = uiContent.admin
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<AdminOrderFilterId>(defaultAdminOrderFilter)
  const [sort, setSort] = useState<AdminOrderSort>("newest")

  const visibleOrders = useMemo(() => filterAdminOrders(admin.orders, filter, search, sort), [admin.orders, filter, search, sort])
  const counts = useMemo(() => ({
    active: countAdminFilter(admin.orders, "active"),
    payment: countAdminFilter(admin.orders, "payment"),
    packing: countAdminFilter(admin.orders, "packing"),
    approval: countAdminFilter(admin.orders, "approval"),
    shipping: countAdminFilter(admin.orders, "shipping"),
    issues: countAdminFilter(admin.orders, "issues"),
    closed: countAdminFilter(admin.orders, "closed"),
    all: countAdminFilter(admin.orders, "all")
  }), [admin.orders])

  return (
    <div className="adminDashboard">
      <div className="adminTopbar">
        <div><div className="kicker">{copy.title}</div><h1>{copy.orders}</h1><p>{copy.operationsSubtitle}</p></div>
        <div className="adminActions"><button className="secondary" onClick={admin.load} disabled={admin.loading}>{copy.refresh}</button><button className="secondary" onClick={admin.logout}>{copy.logout}</button></div>
      </div>

      <AdminOrderToolbar
        search={search}
        filter={filter}
        sort={sort}
        total={admin.orders.length}
        visible={visibleOrders.length}
        counts={counts}
        onSearch={setSearch}
        onFilter={setFilter}
        onSort={setSort}
      />

      {admin.notice && <div className="successBox adminFeedback">{admin.notice}</div>}
      {admin.error && <div className="errorBox adminFeedback">{admin.error}</div>}
      {admin.loading && <div className="trackingState">{uiContent.admin.loadingIndicator}</div>}

      {!admin.loading && visibleOrders.length === 0 && <div className="trackingState">{search ? copy.noMatchingOrders : copy.noOrders}</div>}

      <div className="adminOrderList">
        {visibleOrders.map((order) => (
          <AdminOrderCard
            key={order.publicId}
            order={order}
            busy={admin.busy === order.publicId}
            onStatus={(status) => admin.updateStatus(order, status)}
            onShipping={(provider, trackingNumber) => admin.saveShipping(order, provider, trackingNumber)}
            onVideo={(file) => admin.uploadVideo(order, file)}
          />
        ))}
      </div>
    </div>
  )
}
