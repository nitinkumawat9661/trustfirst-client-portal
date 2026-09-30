import Link from "next/link"
import { StorefrontHeader } from "../../features/shell/StorefrontHeader"
import { SiteFooter } from "../../features/shell/SiteFooter"
import { TrustStrip } from "../../features/shell/TrustStrip"
import { jewelryUiCategories, jewelryUiProducts } from "../../features/jewelry/jewelry-ui"
import { defaultStoreSettings, getStoreSettings } from "../../lib/server/store-settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Jewelry | Celebration", description: "Celebration jewelry collection" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
}

export default async function JewelryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const collection = (Array.isArray(params.collection) ? params.collection[0] : params.collection || "").toLowerCase()
  const settingsResult = await getStoreSettings().catch(() => null)
  const settings = settingsResult?.settings || defaultStoreSettings
  const products = collection === "combos" ? jewelryUiProducts.filter((item) => item.category === "Combos") : jewelryUiProducts

  return (
    <main className="jewelryStoreRoot">
      <TrustStrip />
      <StorefrontHeader settings={settings} />

      <section className="jewelryHero">
        <div className="wrap jewelryHeroGrid">
          <div>
            <div className="kicker">CELEBRATION JEWELRY</div>
            <h1>Jewelry Collection</h1>
            <p>Every piece tells a story. Shop single pieces and gift-ready combos in the same familiar Celebration experience.</p>
            <div className="jewelryHeroBadges" aria-label="Jewelry highlights">
              <span>✦ Anti-tarnish look</span><span>◈ Stainless steel</span><span>♡ Trend-led designs</span><span>✧ Gift-ready</span>
            </div>
          </div>
          <div className="jewelryHeroStage" aria-hidden="true"><span className="jewelryChain" /><i>❋</i><b>Celebration</b></div>
        </div>
      </section>

      <section className="jewelryListingSection">
        <div className="wrap">
          <div className="jewelryCategoryRail" aria-label="Jewelry categories">
            {jewelryUiCategories.map((category, index) => {
              const active = collection === "combos" ? category === "Combos" : index === 0
              const href = category === "Combos" ? "/jewelry?collection=combos" : "/jewelry"
              return <Link className={active ? "active" : ""} key={category} href={href} prefetch={false}><i aria-hidden="true">{["✦","❋","◌","◉","◯","✧"][index]}</i><span>{category}</span></Link>
            })}
          </div>

          <div className="jewelryToolbar">
            <div className="jewelryToolbarGroup"><button type="button">Sort by: <b>Popular</b></button><button type="button">Price⌄</button><button type="button">Material⌄</button><button type="button">Occasion⌄</button></div>
            <button className="jewelryFilterButton" type="button">☷ Filters</button>
          </div>

          <div className="jewelryProductGrid">
            {products.map((product, index) => {
              const discount = Math.max(0, Math.round((1 - product.price / product.mrp) * 100))
              return (
                <article className="jewelryProductCard" key={product.slug}>
                  <Link className="jewelryProductVisual" href={`/jewelry/${product.slug}`} prefetch={false} aria-label={product.name}>
                    {product.badge && <span className="jewelryBadge">{product.badge}</span>}
                    <button className="jewelryHeart" type="button" aria-label="Save item">♡</button>
                    <span className={`jewelrySatin satin-${index % 4}`} aria-hidden="true" />
                    <span className="jewelryChain" aria-hidden="true" />
                    <i aria-hidden="true">{product.symbol}</i>
                  </Link>
                  <div className="jewelryProductCopy">
                    <Link href={`/jewelry/${product.slug}`} prefetch={false}>{product.shortName}</Link>
                    <div className="jewelryPriceLine"><strong>{money(product.price)}</strong><s>{money(product.mrp)}</s><em>{discount}% off</em></div>
                    <div className="jewelryRating">★ {product.rating} <span>({product.reviews})</span></div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
