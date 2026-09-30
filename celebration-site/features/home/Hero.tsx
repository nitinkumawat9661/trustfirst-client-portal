import Link from "next/link"
import type { Tier } from "../../lib/domain/catalog"
import { storeContent } from "../../lib/domain/content"
import { formatMoney } from "../../lib/domain/money"
import { ShapeWaves } from "../motion/ShapeWaves"

export function Hero({ tiers }: { tiers: Tier[] }) {
  const prices = tiers.map((tier) => tier.price)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const showcaseItems = storeContent.showcaseItems.slice(0, 3)

  return (
    <header className="hero heroRefresh heroClassicMotion celebrationCommerceHero">
      <ShapeWaves className="heroShapeWaves heroPixelField" color="#8b2529" cellSize={15} />
      <div className="wrap heroGrid">
        <div className="heroCopy heroImmediate">
          <div className="eyebrow">Hampers + Jewelry · made for every celebration</div>
          <h1>
            <span className="heroLead">Gifts that speak</span>
            <span className="heroLead">from the <span className="heroItalic">heart.</span></span>
          </h1>
          <p>Shop ready-to-gift jewelry or build a Celebration hamper around your budget, occasion and personal style.</p>

          <div className="actions heroActions celebrationHeroActions">
            <a className="primary heroPrimaryLink" href="#budgets">Shop Hampers</a>
            <Link className="secondary" href="/jewelry" prefetch={false}>Shop Jewelry</Link>
          </div>

          <div className="heroFacts" aria-label="Celebration highlights">
            <div><b>Premium</b><small>gift-ready packaging</small></div>
            <div><b>Secure</b><small>payments & account flow</small></div>
            <div><b>From {formatMoney(minPrice)}</b><small>hamper budgets</small></div>
          </div>
        </div>

        <div className="heroVisual heroImmediateVisual celebrationGiftCabinet" aria-label="Celebration gift showcase">
          <div className="heroVisualTop">
            <span>Curated for their moment</span>
            <i aria-hidden="true">{storeContent.brand.giftIcon}</i>
          </div>
          <p className="heroVisualLine">A little luxury, made personal.</p>
          <div className="heroVisualItems">
            {showcaseItems.map((item) => (
              <div className="heroVisualItem" key={item.label}>
                <i aria-hidden="true">{item.icon}</i>
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
