import Link from "next/link"
import { notFound } from "next/navigation"
import { StorefrontHeader } from "../../../features/shell/StorefrontHeader"
import { SiteFooter } from "../../../features/shell/SiteFooter"
import { TrustStrip } from "../../../features/shell/TrustStrip"
import { catalogJewelryProductBySlug } from "../../../features/jewelry/catalog-jewelry"
import { formatMoney } from "../../../lib/domain/catalog"
import { getCatalogConfig } from "../../../lib/server/catalog"
import { defaultStoreSettings, getStoreSettings } from "../../../lib/server/store-settings"

export const dynamic = "force-dynamic"

type Params = Promise<{ slug: string }>

export default async function JewelryProductPage({ params }: { params: Params }) {
  const { slug } = await params
  const [catalogResult, settingsResult] = await Promise.all([
    getCatalogConfig().catch(() => null),
    getStoreSettings().catch(() => null)
  ])
  const catalog = catalogResult?.catalog
  if (!catalog) notFound()
  const product = catalogJewelryProductBySlug(catalog, slug)
  if (!product) notFound()

  const settings = settingsResult?.settings || defaultStoreSettings

  return (
    <main className="jewelryStoreRoot jewelryProductRoot">
      <TrustStrip />
      <StorefrontHeader settings={settings} />

      <section className="jewelryDetailSection">
        <div className="wrap">
          <div className="jewelryBreadcrumb"><Link href="/" prefetch={false}>Home</Link><span>›</span><Link href="/jewelry" prefetch={false}>Jewelry</Link><span>›</span><span>{product.category}</span><span>›</span><b>{product.name}</b></div>

          <div className="jewelryDetailGrid">
            <aside className="jewelryThumbRail" aria-label="Product gallery">
              {[0,1,2,3].map((index) => <button type="button" className={index === 0 ? "active" : ""} key={index} aria-label={`Product view ${index + 1}`} disabled>
                {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <><span className={`jewelrySatin satin-${index % 4}`} /><i>{product.icon || "✦"}</i></>}
              </button>)}
            </aside>

            <div className="jewelryDetailVisual" aria-label={`${product.name} product visual`}>
              {product.imageUrl
                ? <img className="jewelryDetailCatalogImage" src={product.imageUrl} alt={product.name} />
                : <><span className="jewelrySatin satin-0" aria-hidden="true" /><span className="jewelryChain jewelryChainLarge" aria-hidden="true" /><i aria-hidden="true">{product.icon || "✦"}</i></>}
              <span className="jewelryImageCounter">Catalog image</span>
            </div>

            <div className="jewelryDetailBuyBox">
              <div className="jewelryBadges"><span>{product.category}</span><span className="stock">Live catalog</span></div>
              <h1>{product.name}</h1>
              <div className="jewelryDetailPrice"><strong>From {formatMoney(product.minTier)}</strong></div>
              <small>Availability and final hamper composition depend on the selected Celebration budget.</small>

              <div className="jewelryFeatureIcons">
                <div><i>✦</i><span>Catalog<br/>managed</span></div>
                <div><i>◈</i><span>{product.category}</span></div>
                <div><i>♡</i><span>Gift-ready<br/>presentation</span></div>
                <div><i>✓</i><span>Existing<br/>secure flow</span></div>
              </div>

              <div className="jewelryPurchaseActions">
                <Link className="secondary" href="/#budgets" prefetch={false}>View Hampers</Link>
                <Link className="primary" href="/#builder" prefetch={false}>Build Gift</Link>
              </div>

              <div className="jewelryTrustRow"><div><i>▣</i><span><b>Catalog image</b><small>Managed in admin</small></span></div><div><i>◉</i><span><b>Existing policy</b><small>Same Celebration terms</small></span></div><div><i>▢</i><span><b>Secure payment</b><small>Existing checkout flow</small></span></div></div>
            </div>
          </div>

          <div className="jewelryDetailTabs">
            <nav><button className="active" type="button">Product Details</button><button type="button" disabled>Specifications</button><button type="button" disabled>Shipping & Returns</button></nav>
            <div className="jewelryDetailBody">
              <div><p>{product.note || `${product.name} is available in the Celebration catalog.`}</p><ul><li>Category: {product.category}</li><li>Available from {formatMoney(product.minTier)} hamper budget</li><li>Catalog selection value: {product.points} point{product.points === 1 ? "" : "s"}</li><li>Product image and availability are managed from Celebration admin.</li></ul></div>
              <div className="jewelryLifestyleFrame">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <><span className="jewelrySatin satin-2" /><span className="jewelryChain jewelryChainSmall" /><i>{product.icon || "✦"}</i></>}</div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
