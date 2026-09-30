import Link from "next/link"
import { StorefrontHeader } from "../../features/shell/StorefrontHeader"
import { SiteFooter } from "../../features/shell/SiteFooter"
import { TrustStrip } from "../../features/shell/TrustStrip"
import { catalogJewelryCategories, catalogJewelryProducts, isCatalogJewelryCombo } from "../../features/jewelry/catalog-jewelry"
import { formatMoney } from "../../lib/domain/catalog"
import { getCatalogConfig } from "../../lib/server/catalog"
import { defaultStoreSettings, getStoreSettings } from "../../lib/server/store-settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Jewelry | Celebration", description: "Celebration jewelry collection" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function JewelryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const collection = (Array.isArray(params.collection) ? params.collection[0] : params.collection || "").toLowerCase()
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category || ""

  const [catalogResult, settingsResult] = await Promise.all([
    getCatalogConfig().catch(() => null),
    getStoreSettings().catch(() => null)
  ])
  const settings = settingsResult?.settings || defaultStoreSettings
  const catalog = catalogResult?.catalog
  const allJewelry = catalog ? catalogJewelryProducts(catalog) : []
  const categories = catalog ? catalogJewelryCategories(catalog) : []
  const activeCategory = categories.find((item) => item.toLowerCase() === rawCategory.toLowerCase()) || "All Jewelry"

  const products = collection === "combos"
    ? allJewelry.filter(isCatalogJewelryCombo)
    : activeCategory === "All Jewelry"
      ? allJewelry
      : allJewelry.filter((item) => item.category === activeCategory)

  const heroProduct = allJewelry.find((item) => Boolean(item.imageUrl)) || allJewelry[0]

  return (
    <main className="jewelryStoreRoot">
      <TrustStrip />
      <StorefrontHeader settings={settings} />

      <section className="jewelryHero">
        <div className="wrap jewelryHeroGrid">
          <div>
            <div className="kicker">CELEBRATION JEWELRY</div>
            <h1>Jewelry Collection</h1>
            <p>Single pieces and gift-ready combos, shown directly from the Celebration catalog. Names, categories, availability and product images stay managed from the existing admin catalog.</p>
            <div className="jewelryHeroBadges" aria-label="Jewelry highlights">
              <span>✦ Real catalog items</span><span>◈ Admin-managed images</span><span>♡ Single pieces</span><span>✧ Gift-ready combos</span>
            </div>
          </div>
          <div className="jewelryHeroStage">
            {heroProduct?.imageUrl
              ? <img className="jewelryHeroCatalogImage" src={heroProduct.imageUrl} alt={heroProduct.name} />
              : <><span className="jewelryChain" aria-hidden="true" /><i aria-hidden="true">{heroProduct?.icon || "✦"}</i></>}
            <b>Celebration</b>
          </div>
        </div>
      </section>

      <section className="jewelryListingSection">
        <div className="wrap">
          <div className="jewelryCategoryRail" aria-label="Jewelry categories">
            <Link className={collection !== "combos" && activeCategory === "All Jewelry" ? "active" : ""} href="/jewelry" prefetch={false}><i aria-hidden="true">✦</i><span>All Jewelry</span></Link>
            {categories.slice(0, 5).map((category, index) => {
              const active = collection !== "combos" && category === activeCategory
              return <Link className={active ? "active" : ""} key={category} href={`/jewelry?category=${encodeURIComponent(category)}`} prefetch={false}><i aria-hidden="true">{["❋","◌","◉","◯","✧"][index] || "✦"}</i><span>{category}</span></Link>
            })}
            <Link className={collection === "combos" ? "active" : ""} href="/jewelry?collection=combos" prefetch={false}><i aria-hidden="true">✧</i><span>Combos</span></Link>
          </div>

          <div className="jewelryToolbar">
            <div className="jewelryToolbarGroup"><span className="jewelryCatalogStatus">{products.length} catalog item{products.length === 1 ? "" : "s"}</span></div>
            <Link className="jewelryFilterButton" href="/#products" prefetch={false}>All gift options</Link>
          </div>

          {products.length === 0 ? (
            <div className="jewelryEmptyState"><i aria-hidden="true">✧</i><h2>{collection === "combos" ? "Combos" : activeCategory}</h2><p>No live catalog item matches this collection yet. Add or update jewelry products from the existing admin catalog and they will appear here automatically.</p><Link className="secondary" href="/jewelry" prefetch={false}>View all jewelry</Link></div>
          ) : (
            <div className="jewelryProductGrid">
              {products.map((product, index) => (
                <article className="jewelryProductCard" key={product.id}>
                  <Link className="jewelryProductVisual" href={`/jewelry/${encodeURIComponent(product.id)}`} prefetch={false} aria-label={product.name}>
                    <span className="jewelryBadge">{product.category}</span>
                    <span className="jewelryHeart" aria-hidden="true">♡</span>
                    {product.imageUrl
                      ? <img className="jewelryCatalogImage" src={product.imageUrl} alt={product.name} loading="lazy" />
                      : <><span className={`jewelrySatin satin-${index % 4}`} aria-hidden="true" /><span className="jewelryChain" aria-hidden="true" /><i aria-hidden="true">{product.icon || "✦"}</i></>}
                  </Link>
                  <div className="jewelryProductCopy">
                    <Link href={`/jewelry/${encodeURIComponent(product.id)}`} prefetch={false}>{product.name}</Link>
                    <div className="jewelryPriceLine"><strong>From {formatMoney(product.minTier)}</strong></div>
                    <div className="jewelryCatalogNote">{product.note || product.category}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
