"use client"

import { formatMoney, products, tiers } from "../../lib/domain/catalog"
import { storeContent, uiContent } from "../../lib/domain/content"

export function Hero({ onBuild }: { onBuild: () => void }) {
  const minPrice = Math.min(...tiers.map((tier) => tier.price))
  const maxPrice = Math.max(...tiers.map((tier) => tier.price))
  return (
    <header className="hero">
      <div className="wrap heroGrid">
        <div className="heroCopy">
          <div className="eyebrow">{storeContent.brand.eyebrow}</div>
          <h1>{storeContent.brand.heroTitleLine1}<br /><span>{storeContent.brand.heroTitleLine2}</span></h1>
          <p>{storeContent.brand.heroBody}</p>
          <div className="actions">
            <button className="primary" onClick={onBuild}>{uiContent.hero.primary}</button>
            <a className="secondary" href="#budgets">{uiContent.hero.secondaryPrefix} {formatMoney(minPrice)}</a>
          </div>
          <div className="stats">
            <div className="stat"><b>{formatMoney(minPrice)}–{formatMoney(maxPrice)}</b><small>{uiContent.hero.stats[0]}</small></div>
            <div className="stat"><b>{products.length}+</b><small>{uiContent.hero.stats[1]}</small></div>
            <div className="stat"><b>{uiContent.hero.customFeelValue}</b><small>{uiContent.hero.stats[2]}</small></div>
          </div>
        </div>
        <div className="showcase" aria-label={`${storeContent.brand.name} hamper visual`}>
          <div className="box">
            <div className="brandRow">
              <div><div className="brandMark">{storeContent.brand.name}</div><div className="tag">{storeContent.brand.tagline}</div></div>
              <div className="giftIcon">{storeContent.brand.giftIcon}</div>
            </div>
            <div className="showTitle"><b>{storeContent.brand.heroTitleLine1}<br />{storeContent.brand.heroTitleLine2}</b><small>{uiContent.hero.showcaseSubline}</small></div>
            <div className="miniGrid">{storeContent.showcaseItems.map((item) => <div className="mini" key={item.label}><i>{item.icon}</i><span>{item.label}</span></div>)}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
