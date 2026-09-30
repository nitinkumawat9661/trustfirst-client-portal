import Link from "next/link"
import { notFound } from "next/navigation"
import { StorefrontHeader } from "../../../features/shell/StorefrontHeader"
import { SiteFooter } from "../../../features/shell/SiteFooter"
import { TrustStrip } from "../../../features/shell/TrustStrip"
import { jewelryUiProductBySlug } from "../../../features/jewelry/jewelry-ui"
import { defaultStoreSettings, getStoreSettings } from "../../../lib/server/store-settings"

export const dynamic = "force-dynamic"

type Params = Promise<{ slug: string }>

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
}

export default async function JewelryProductPage({ params }: { params: Params }) {
  const { slug } = await params
  const product = jewelryUiProductBySlug(slug)
  if (!product) notFound()

  const settingsResult = await getStoreSettings().catch(() => null)
  const settings = settingsResult?.settings || defaultStoreSettings
  const discount = Math.max(0, Math.round((1 - product.price / product.mrp) * 100))

  return (
    <main className="jewelryStoreRoot jewelryProductRoot">
      <TrustStrip />
      <StorefrontHeader settings={settings} />

      <section className="jewelryDetailSection">
        <div className="wrap">
          <div className="jewelryBreadcrumb"><Link href="/" prefetch={false}>Home</Link><span>›</span><Link href="/jewelry" prefetch={false}>Jewelry</Link><span>›</span><span>{product.category}</span><span>›</span><b>{product.name}</b></div>

          <div className="jewelryDetailGrid">
            <aside className="jewelryThumbRail" aria-label="Product gallery">
              {["✦",product.symbol,"♡","◯"].map((symbol, index) => <button type="button" className={index === 0 ? "active" : ""} key={`${symbol}-${index}`} aria-label={`Product view ${index + 1}`}><span className={`jewelrySatin satin-${index % 4}`} /><i>{symbol}</i></button>)}
            </aside>

            <div className="jewelryDetailVisual" aria-label={`${product.name} product visual`}>
              <span className="jewelrySatin satin-0" aria-hidden="true" />
              <span className="jewelryChain jewelryChainLarge" aria-hidden="true" />
              <i aria-hidden="true">{product.symbol}</i>
              <span className="jewelryImageCounter">1/4</span>
            </div>

            <div className="jewelryDetailBuyBox">
              <div className="jewelryBadges"><span>{product.badge || "Celebration Pick"}</span><span className="stock">In Stock</span></div>
              <h1>{product.name}</h1>
              <div className="jewelryRating jewelryDetailRating">★★★★★ <b>{product.rating}</b> <span>({product.reviews} reviews)</span></div>
              <div className="jewelryDetailPrice"><strong>{money(product.price)}</strong><s>{money(product.mrp)}</s><em>{discount}% OFF</em></div>
              <small>Inclusive of all taxes</small>

              <div className="jewelryFeatureIcons">
                <div><i>✦</i><span>Anti-<br/>Tarnish</span></div>
                <div><i>⌁</i><span>Stainless<br/>Steel</span></div>
                <div><i>☼</i><span>Skin<br/>Friendly</span></div>
                <div><i>◌</i><span>Water<br/>Resistant</span></div>
              </div>

              <div className="jewelryQuantityRow"><button type="button">−</button><span>1</span><button type="button">+</button></div>
              <div className="jewelryPurchaseActions" aria-label="Jewelry purchase actions are visual-only in this UI pass">
                <button className="secondary" type="button" disabled>Add to Cart</button>
                <button className="primary" type="button" disabled>Buy Now</button>
              </div>

              <div className="jewelryTrustRow"><div><i>▣</i><span><b>Free Delivery</b><small>On eligible orders</small></span></div><div><i>◉</i><span><b>Easy Returns</b><small>As per policy</small></span></div><div><i>▢</i><span><b>Secure Payment</b><small>Safe checkout</small></span></div></div>
            </div>
          </div>

          <div className="jewelryDetailTabs">
            <nav><button className="active" type="button">Product Details</button><button type="button">Specifications</button><button type="button">Shipping & Returns</button><button type="button">Reviews ({product.reviews})</button></nav>
            <div className="jewelryDetailBody">
              <div><p>{product.description}</p><ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></div>
              <div className="jewelryLifestyleFrame"><span className="jewelrySatin satin-2" /><span className="jewelryChain jewelryChainSmall" /><i>{product.symbol}</i></div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
