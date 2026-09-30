import type { CatalogConfig, GiftProduct } from "../../lib/domain/catalog"
import { formatMoney, visibleProducts } from "../../lib/domain/catalog"
import { storeContent } from "../../lib/domain/content"

const JEWELRY_WORDS = /\b(jewel|jewellery|jewelry|necklace|pendant|chain|earring|earrings|ring|rings|bracelet|bangle|anklet|accessory|accessories|combo|set)\b/i

function isJewelryProduct(product: GiftProduct) {
  return JEWELRY_WORDS.test(`${product.category} ${product.name}`)
}

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
  const jewelryProducts = sortedForVisuals(products.filter(isJewelryProduct))
  const jewelryCategories = Array.from(new Set(jewelryProducts.map((item) => item.category)))

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
            <div className="commerceSectionHead"><h2 id="best-picks-title">Best Picks for You</h2><div className="commercePills" aria-label="Collections"><span className="active">Hampers</span><a href="#jewelry">Jewelry</a><a href="#jewelry">Combos</a></div></div>
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
              <p>Single pieces, gift-ready picks and combos from the same Celebration catalog. Product images, names and availability stay driven by the catalog.</p>
              <div className="commerceJewelryBadges"><span>♡ Anti-tarnish ready</span><span>✦ Giftable styles</span><span>◈ Premium presentation</span><span>✓ Catalog controlled</span></div>
            </div>
            {jewelryProducts[0] && <div className="commerceJewelryHeroProduct"><ProductMedia product={jewelryProducts[0]} className="commerceJewelryHeroImage" /></div>}
          </div>

          {jewelryProducts.length > 0 ? (
            <>
              <div className="commerceJewelryCategoryRail" aria-label="Jewelry categories">
                <a className="active" href="#jewelry">All Jewelry</a>
                {jewelryCategories.slice(0, 6).map((category) => <a href="#products" key={category}>{category}</a>)}
              </div>
              <div className="commerceJewelryToolbar"><span>Sort by: <b>Popular</b></span><span>Price</span><span>Material</span><span>Occasion</span><a href="#products">☰ Filters</a></div>
              <div className="commerceJewelryGrid">
                {jewelryProducts.slice(0, 9).map((product, index) => (
                  <a className="commerceJewelryCard" href="#builder" key={product.id}>
                    <div className="commerceJewelryImageWrap"><ProductMedia product={product} className="commerceJewelryImage" />{index === 0 && <span className="commerceBadge">Best Seller</span>}<span className="commerceHeart" aria-hidden="true">♡</span></div>
                    <div className="commerceJewelryCopy"><b>{product.name}</b><strong>From {formatMoney(product.minTier)}</strong><span>★ Catalog item</span></div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="commerceJewelryEmpty">
              <b>Jewelry storefront is ready.</b>
              <p>Add jewelry products through the existing catalog/admin flow and this section will populate automatically with their names, categories, prices and images.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
