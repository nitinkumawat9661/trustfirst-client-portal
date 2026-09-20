"use client"

import { useEffect, useState } from "react"
import { defaultCatalog, formatMoney, type CatalogConfig, type GiftProduct, type Tier } from "../../lib/domain/catalog"

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
}

export function AdminCatalogManager() {
  const [catalog, setCatalog] = useState<CatalogConfig>(defaultCatalog)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  async function load() {
    setError("")
    const response = await fetch("/api/admin/catalog", { cache: "no-store" })
    const data = await response.json() as { ok?: boolean; catalog?: CatalogConfig; version?: number; error?: string }
    if (!response.ok || !data.ok || !data.catalog) throw new Error(data.error || "CATALOG_LOAD_FAILED")
    setCatalog(data.catalog)
    setVersion(data.version || 0)
  }

  useEffect(() => { load().catch((caught) => setError(caught instanceof Error ? caught.message : "CATALOG_LOAD_FAILED")) }, [])

  function replaceTier(index: number, patch: Partial<Tier>) {
    setCatalog((current) => ({ ...current, tiers: current.tiers.map((item, i) => i === index ? { ...item, ...patch } : item) }))
  }

  function replaceProduct(index: number, patch: Partial<GiftProduct>) {
    setCatalog((current) => ({ ...current, products: current.products.map((item, i) => i === index ? { ...item, ...patch } : item) }))
  }

  function addTier() {
    const price = Math.max(1, (catalog.tiers.at(-1)?.price || 0) + 100)
    setCatalog((current) => ({ ...current, tiers: [...current.tiers, { id: `tier-${Date.now()}`, price, name: "New Hamper", size: "Custom", maxChoices: 3, pointBudget: 6, active: true }] }))
  }

  function addProduct() {
    setCatalog((current) => ({ ...current, products: [...current.products, { id: `item-${Date.now()}`, name: "New Item", category: "Other", minTier: current.tiers[0]?.price || 0, points: 1, note: "", icon: "🎁", active: true }] }))
  }

  function addOccasion() {
    const value = `Occasion ${catalog.occasions.length + 1}`
    setCatalog((current) => ({ ...current, occasions: [...current.occasions, value] }))
  }

  async function uploadImage(file: File, productIndex: number) {
    if (file.size > 5 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE")
    const presignResponse = await fetch("/api/admin/catalog/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type })
    })
    const presign = await presignResponse.json() as { ok?: boolean; key?: string; url?: string; error?: string }
    if (!presignResponse.ok || !presign.ok || !presign.key || !presign.url) throw new Error(presign.error || "IMAGE_UPLOAD_FAILED")
    const put = await fetch(presign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
    if (!put.ok) throw new Error("IMAGE_UPLOAD_FAILED")
    const verifyResponse = await fetch("/api/admin/catalog/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: presign.key })
    })
    const verified = await verifyResponse.json() as { ok?: boolean; imageUrl?: string; error?: string }
    if (!verifyResponse.ok || !verified.ok || !verified.imageUrl) throw new Error(verified.error || "IMAGE_VERIFY_FAILED")
    replaceProduct(productIndex, { imageUrl: verified.imageUrl })
  }

  async function save() {
    setBusy(true)
    setNotice("")
    setError("")
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog })
      })
      const data = await response.json() as { ok?: boolean; catalog?: CatalogConfig; version?: number; error?: string }
      if (!response.ok || !data.ok || !data.catalog) throw new Error(data.error || "CATALOG_SAVE_FAILED")
      setCatalog(data.catalog)
      setVersion(data.version || version + 1)
      setNotice("Catalog saved. Public website will use this configuration immediately.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CATALOG_SAVE_FAILED")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="adminConfigPanel">
      <div className="adminConfigHead">
        <div><div className="kicker">STORE CONFIG</div><h2>Hamper catalog</h2><p>Runtime configuration. No product, budget tier or occasion needs a code deploy.</p></div>
        <div className="adminActions"><button className="secondary" type="button" onClick={() => load().catch((caught) => setError(String(caught)))}>Reload</button><button className="primary" type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : `Save v${version + 1}`}</button></div>
      </div>
      {notice && <div className="successBox adminFeedback">{notice}</div>}
      {error && <div className="errorBox adminFeedback">{error}</div>}

      <details className="adminConfigBlock" open>
        <summary>Budget / hamper tiers ({catalog.tiers.length})</summary>
        <div className="adminEditorList">
          {catalog.tiers.map((tier, index) => <div className="adminEditorCard" key={`${tier.id}-${index}`}>
            <div className="adminEditorGrid">
              <label>ID<input value={tier.id} onChange={(e) => replaceTier(index, { id: slug(e.target.value) })} /></label>
              <label>Name<input value={tier.name} onChange={(e) => replaceTier(index, { name: e.target.value })} /></label>
              <label>Price ₹<input type="number" min={1} value={tier.price} onChange={(e) => replaceTier(index, { price: Number(e.target.value) })} /></label>
              <label>Size<input value={tier.size} onChange={(e) => replaceTier(index, { size: e.target.value })} /></label>
              <label>Max items<input type="number" min={1} value={tier.maxChoices} onChange={(e) => replaceTier(index, { maxChoices: Number(e.target.value) })} /></label>
              <label>Mix points<input type="number" min={1} value={tier.pointBudget} onChange={(e) => replaceTier(index, { pointBudget: Number(e.target.value) })} /></label>
              <label>Badge<input value={tier.label || ""} onChange={(e) => replaceTier(index, { label: e.target.value })} /></label>
              <label className="adminCheck"><input type="checkbox" checked={tier.active !== false} onChange={(e) => replaceTier(index, { active: e.target.checked })} /> Active</label>
            </div>
            <div className="adminEditorActions"><span>{formatMoney(tier.price)}</span><button type="button" className="secondary" onClick={() => setCatalog((current) => ({ ...current, tiers: current.tiers.filter((_, i) => i !== index) }))}>Delete</button></div>
          </div>)}
        </div>
        <button type="button" className="secondary" onClick={addTier}>+ Add hamper tier</button>
      </details>

      <details className="adminConfigBlock" open>
        <summary>Products / objects ({catalog.products.length})</summary>
        <div className="adminEditorList">
          {catalog.products.map((product, index) => <div className="adminEditorCard" key={`${product.id}-${index}`}>
            <div className="adminEditorGrid">
              <label>ID<input value={product.id} onChange={(e) => replaceProduct(index, { id: slug(e.target.value) })} /></label>
              <label>Name<input value={product.name} onChange={(e) => replaceProduct(index, { name: e.target.value })} /></label>
              <label>Category<input value={product.category} onChange={(e) => replaceProduct(index, { category: e.target.value })} /></label>
              <label>Available from ₹<input type="number" min={0} value={product.minTier} onChange={(e) => replaceProduct(index, { minTier: Number(e.target.value) })} /></label>
              <label>Points<input type="number" min={1} value={product.points} onChange={(e) => replaceProduct(index, { points: Number(e.target.value) })} /></label>
              <label>Emoji / icon<input value={product.icon || ""} onChange={(e) => replaceProduct(index, { icon: e.target.value })} /></label>
              <label className="adminWide">Description<input value={product.note} onChange={(e) => replaceProduct(index, { note: e.target.value })} /></label>
              <label className="adminWide">Image URL<input value={product.imageUrl || ""} onChange={(e) => replaceProduct(index, { imageUrl: e.target.value })} placeholder="https://… or upload below" /></label>
              <label className="adminWide uploadControl">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file, index).catch((caught) => setError(caught instanceof Error ? caught.message : "IMAGE_UPLOAD_FAILED")) }} /></label>
              <label className="adminCheck"><input type="checkbox" checked={product.active !== false} onChange={(e) => replaceProduct(index, { active: e.target.checked })} /> Active</label>
            </div>
            {product.imageUrl && <img className="adminCatalogPreview" src={product.imageUrl} alt="" />}
            <div className="adminEditorActions"><span>{product.category}</span><button type="button" className="secondary" onClick={() => setCatalog((current) => ({ ...current, products: current.products.filter((_, i) => i !== index) }))}>Delete</button></div>
          </div>)}
        </div>
        <button type="button" className="secondary" onClick={addProduct}>+ Add product / object</button>
      </details>

      <details className="adminConfigBlock" open>
        <summary>Occasions and defaults</summary>
        <div className="adminEditorGrid">
          <label>Default hamper<select value={catalog.settings.defaultTierId} onChange={(e) => setCatalog((current) => ({ ...current, settings: { ...current.settings, defaultTierId: e.target.value } }))}>{catalog.tiers.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Default occasion<select value={catalog.settings.defaultOccasion} onChange={(e) => setCatalog((current) => ({ ...current, settings: { ...current.settings, defaultOccasion: e.target.value } }))}>{catalog.occasions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>All-category label<input value={catalog.settings.allCategory.label} onChange={(e) => setCatalog((current) => ({ ...current, settings: { ...current.settings, allCategory: { ...current.settings.allCategory, label: e.target.value } } }))} /></label>
        </div>
        <div className="adminEditorList compact">
          {catalog.occasions.map((occasion, index) => <div className="adminOccasionRow" key={`${occasion}-${index}`}><input value={occasion} onChange={(e) => setCatalog((current) => ({ ...current, occasions: current.occasions.map((item, i) => i === index ? e.target.value : item) }))} /><button type="button" className="secondary" onClick={() => setCatalog((current) => ({ ...current, occasions: current.occasions.filter((_, i) => i !== index) }))}>Delete</button></div>)}
        </div>
        <button type="button" className="secondary" onClick={addOccasion}>+ Add occasion</button>
      </details>
    </section>
  )
}
