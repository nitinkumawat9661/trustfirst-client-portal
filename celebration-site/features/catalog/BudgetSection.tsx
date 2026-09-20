"use client"

import { formatMoney, tiers } from "../../lib/domain/catalog"
import { uiContent } from "../../lib/domain/content"

export function BudgetSection({ selectedTierId, onSelect }: { selectedTierId: string; onSelect: (id: string) => void }) {
  return (
    <section id="budgets">
      <div className="wrap">
        <div className="sectionHead">
          <div><div className="kicker">{uiContent.budgets.kicker}</div><h2>{uiContent.budgets.title}</h2></div>
          <p>{uiContent.budgets.body}</p>
        </div>
        <div className="tiers">
          {tiers.map((item) => (
            <button key={item.id} className={`tier ${selectedTierId === item.id ? "active" : ""}`} onClick={() => onSelect(item.id)}>
              {item.label && <span className="badge">{item.label}</span>}
              <div className="size">{item.size}</div>
              <div className="price">{formatMoney(item.price)}</div>
              <div className="name">{item.name}</div>
              <div className="note">{item.maxChoices} {uiContent.budgets.choices} • {item.pointBudget} {uiContent.budgets.points}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
