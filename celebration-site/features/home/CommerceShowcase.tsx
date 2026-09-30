import type { CatalogConfig, GiftProduct } from "../../lib/domain/catalog"
import { formatMoney, visibleProducts } from "../../lib/domain/catalog"
import { storeContent } from "../../lib/domain/content"
import { catalogJewelryCategories, catalogJewelryProducts } from "../jewelry/catalog-jewelry"

function sortedForVisuals(products: GiftProduct[]) {
  return [...products].sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)))
}

function ProductMedia({ product, className = "" }: { product: GiftProduct; className?: string }) {
  if (product.imageUrl) {
    return <img className={className} src={product.imageUrl} alt={product.name} loading="lazy" />
  }
  return <div className={`${className} commerceProductFallback`} aria-hidden="true"><span>{product.icon || "✦"}</span></div>
}

export function CommerceShowcase({ catalog }: { catalog: CatalogConfig }) {
  const products = visibleProducts(catalog)
  const visuallySorted = sortedForVisuals(products)
  const categories = Array.from(new Set(products.map((item) => item.category)))
  const categoryCards = categories.slice(0, 5).map((category) => ({
    category,
    product: visuallySorted.find((item) => item.category === category) || products.find((item) => item.category === category)
  })).filter((item): item is { category: string; product: GiftProduct } => Boolean(item.product))

  const bestPicks = visuallySorted.slice(0, 6)
  const jewelryProducts = sortedForVisuals(catalogJewelryProducts(catalog))
  const jewelryCategories = catalogJewelryCategories(catalog)

  return (
    <div className="commerceShowcase">
      <section className="commerceTrustRow" aria-label="Shopping benefits">
        <div className="wrap commerceTrustGrid">
          {storeContent.trustStrip.slice(0, 4).map((item) => {
            const firstSpace = item.indexOf(" ")
            const icon = firstSpace > 0 ? item.slice(0, firstSpace) : "✦"
            const label = firstSpace > 0 ? item.slice(firstSpace + 1) : item
            return <div className="commerceTrustItem" key={item}><span aria-hidden="true">{icon}</span><b>{label}</b></div>
          })}
        </div>
      </section>

      <section className="commerceSection commerceCategories" aria-labelledby="shop-by-category-title">
        <div className="wrap">
          <div className="commerceSectionHead"><h2 id="shop-by-category-title">Shop by Category</h2><a href="#products">View all →</a></div>
          <div className="commerceCategoryGrid">
            {categoryCards.map(({ category, product }) => (
              <a className="commerceCategoryCard" href="#products" key={category}>
                <ProductMedia product={product} className="commerceCategoryImage" />
                <div><b>{category}</b><span>{product.note || product.name}</span></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {bestPicks.length > 0 && (
        <section className="commerceSection commerceBestPicks" aria-labelledby="best-picks-title">
          <div className="wrap">
            <div className="commerceSectionHead"><h2 id="best-picks-title">Best Picks for You</h2><div className="commercePills" aria-label="Collections"><span className="active">Hampers</span><a href="/jewelry">Jewelry</a><a href="/jewelry?collection=combos">Combos</a></div></div>
            <div className="commerceProductRail">
              {bestPicks.map((product) => (
                <a className="commerceProductCard" href="#builder" key={product.id}>
                  <div className="commerceProductImageWrap"><ProductMedia product={product} className="commerceProductImage" /><span className="commerceHeart" aria-hidden="true">♡</span></div>
                  <div className="commerceProductCopy"><b>{product.name}</b><span>{product.category}</span><strong>From {formatMoney(product.minTier)}</strong></div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="commerceJewelry" id="jewelry" aria-labelledby="jewelry-title">
        <div className="commerceJewelryBackdrop" aria-hidden="true" />
        <div className="wrap">
          <div className="commerceJewelryHero">
            <div>
              <div className="eyebrow">CELEBRATION JEWELRY</div>
              <h2 id="jewelry-title">Jewelry Collection</h2>
              <p>Single pieces, gift-ready picks and combos from the same Celebration catalog. Product names, categories, pricing and images stay driven by the existing catalog.</p>
              <div className="commerceJewelryBadges"><span>♡ Single pieces</span><span>✦ Gift-ready picks</span><span>◈ Combo-friendly</span><span>✓ Catalog controlled</span></div>
            </div>
            {jewelryProducts[0] && <div className="commerceJewelryHeroProduct"><ProductMedia product={jewelryProducts[0]} className="commerceJewelryHeroImage" /></div>}
          </div>

          {jewelryProducts.length > 0 ? (
            <>
              <div className="commerceJewelryCategoryRail" aria-label="Jewelry categories">
                <a className="active" href="/jewelry">All Jewelry</a>
                {jewelryCategories.slice(0, 6).map((category) => <a href={`/jewelry?category=${encodeURIComponent(category)}`} key={category}>{category}</a>)}
              </div>
              <div className="commerceJewelryToolbar"><span>Catalog collection</span><span>{jewelryProducts.length} live items</span><a href="/jewelry">View Jewelry →</a></div>
              <div className="commerceJewelryGrid">
                {jewelryProducts.slice(0, 9).map((product) => (
                  <a className="commerceJewelryCard" href={`/jewelry/${encodeURIComponent(product.id)}`} key={product.id}>
                    <div className="commerceJewelryImageWrap"><ProductMedia product={product} className="commerceJewelryImage" /><span className="commerceBadge">{product.category}</span><span className="commerceHeart" aria-hidden="true">♡</span></div>
                    <div className="commerceJewelryCopy"><b>{product.name}</b><strong>From {formatMoney(product.minTier)}</strong><span>{product.note || "Celebration catalog item"}</span></div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="commerceJewelryEmpty">
              <b>Jewelry storefront is ready.</b>
              <p>Add jewelry items through the existing catalog admin with their real category, image and available-from value. This section will populate automatically without code changes.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
