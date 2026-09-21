"use client"

import { formatMoney, type Tier } from "../../lib/domain/catalog"
import { uiContent } from "../../lib/domain/content"

const UNSUPPORTED_SOCIAL_PROOF = new Set(["POPULAR", "BESTSELLER", "MOST POPULAR", "CUSTOMER FAVORITE", "CUSTOMER FAVOURITE"])

function valueScore(tier: Tier) {
  return tier.price > 0 ? tier.pointBudget / tier.price : 0
}

function tierBadge(item: Tier, recommendedTierId: string, bestValueId: string) {
  if (item.id === recommendedTierId) return "RECOMMENDED"
  if (item.id === bestValueId) return "BEST VALUE"
  const label = item.label?.trim()
  if (!label || UNSUPPORTED_SOCIAL_PROOF.has(label.toUpperCase())) return ""
  return label
}

export function BudgetSection({ tiers, selectedTierId, recommendedTierId, onSelect }: { tiers: Tier[]; selectedTierId: string; recommendedTierId: string; onSelect: (id: string) => void }) {
  const bestValueId = tiers.reduce((best, item) => valueScore(item) > valueScore(best) ? item : best, tiers[0])?.id || ""

  return (
    <section id="budgets">
      <div className="wrap">
        <div className="sectionHead">
          <div><div className="kicker">{uiContent.budgets.kicker}</div><h2>{uiContent.budgets.title}</h2></div>
          <p>{uiContent.budgets.body}</p>
        </div>
        <div className="tiers">
          {tiers.map((item) => {
            const badge = tierBadge(item, recommendedTierId, bestValueId)
            return (
              <button key={item.id} className={`tier ${selectedTierId === item.id ? "active" : ""}`} onClick={() => onSelect(item.id)}>
                {badge && <span className="badge">{badge}</span>}
                <div className="size">{item.size}</div>
                <div className="price">{formatMoney(item.price)}</div>
                <div className="name">{item.name}</div>
                <div className="note">Up to {item.maxChoices} gifts</div>
              </button>
            )
          })}
        </div>
        <div className="budgetDecisionHint">
          <div><b>Not sure which one to choose?</b><span>Start with Recommended, or tell us your exact budget and we’ll suggest a better fit.</span></div>
          <a className="secondary" href="#custom-request">Build around my budget</a>
        </div>
      </div>
    </section>
  )
}
