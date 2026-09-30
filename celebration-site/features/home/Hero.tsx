import type { GiftProduct, Tier } from "../../lib/domain/catalog"
import { storeContent } from "../../lib/domain/content"
import { formatMoney } from "../../lib/domain/money"
import { ShapeWaves } from "../motion/ShapeWaves"

export function Hero({ tiers, products }: { tiers: Tier[]; products: GiftProduct[] }) {
  const prices = tiers.map((tier) => tier.price)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const visualProducts = [...products]
    .filter((item) => item.active !== false)
    .sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)))
    .slice(0, 4)

  return (
    <header className="hero heroRefresh heroClassicMotion celebrationCommerceHero">
      <ShapeWaves className="heroShapeWaves heroPixelField" color="#8b2529" cellSize={15} />
      <div className="wrap heroGrid">
        <div className="heroCopy heroImmediate">
          <div className="eyebrow">Hampers + Jewelry · made for every celebration</div>
          <h1>
            <span className="heroLead">Gifts that speak</span>
            <span className="heroLead">from the <span className="heroItalic">Heart</span></span>
          </h1>
          <p>Shop gift-ready picks or build a Celebration hamper around your budget, occasion and personal style.</p>

          <div className="actions heroActions celebrationHeroActions">
            <a className="primary heroPrimaryLink" href="#budgets">Shop Hampers</a>
            <a className="secondary" href="#jewelry">Shop Jewelry</a>
          </div>

          <div className="heroFacts" aria-label="Celebration highlights">
            <div><b>Premium</b><small>gift-ready presentation</small></div>
            <div><b>Secure</b><small>payments & account flow</small></div>
            <div><b>From {formatMoney(minPrice)}</b><small>hamper budgets</small></div>
          </div>
        </div>

        <div className="heroVisual heroImmediateVisual celebrationGiftCabinet" aria-label="Celebration gift showcase">
          <div className="celebrationGiftBackdrop" aria-hidden="true" />
          <div className="heroVisualTop">
            <span>Curated for their moment</span>
            <i aria-hidden="true">{storeContent.brand.giftIcon}</i>
          </div>
          <p className="heroVisualLine">Make Every Occasion <em>a Celebration</em></p>
          <div className="celebrationGiftProducts">
            {visualProducts.length > 0 ? visualProducts.map((product, index) => (
              <div className={`celebrationGiftProduct celebrationGiftProduct${index + 1}`} key={product.id}>
                {product.imageUrl
                  ? <img src={product.imageUrl} alt={product.name} loading={index === 0 ? "eager" : "lazy"} />
                  : <div className="celebrationGiftFallback" aria-hidden="true">{product.icon || "✦"}</div>}
                <span>{product.name}</span>
              </div>
            )) : storeContent.showcaseItems.slice(0, 4).map((item, index) => (
              <div className={`celebrationGiftProduct celebrationGiftProduct${index + 1}`} key={item.label}>
                <div className="celebrationGiftFallback" aria-hidden="true">{item.icon}</div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="heroVisualFooter">
            <span>Hampers</span><span>Jewelry</span><span>Gift combos</span>
          </div>
        </div>
      </div>
    </header>
  )
}
