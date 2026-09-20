"use client"

import { catalogSettings, categories, formatMoney, products } from "../../lib/domain/catalog"
import { uiContent } from "../../lib/domain/content"

export function ProductSection({ category, onCategory }: { category: string; onCategory: (value: string) => void }) {
  const visible = products.filter((product) => category === catalogSettings.allCategory.id || product.category === category)
  return (
    <section className="productsSec" id="products">
      <div className="wrap">
        <div className="centerHead"><div className="kicker">{uiContent.products.kicker}</div><h2>{uiContent.products.title}</h2><p>{uiContent.products.body}</p></div>
        <div className="filters">{categories.map((item) => <button key={item.id} className={`chip ${category === item.id ? "active" : ""}`} onClick={() => onCategory(item.id)}>{item.label}</button>)}</div>
        <div className="products">
          {visible.map((product) => (
            <article className="product" key={product.id}>
              <div className="prodTop"><div className="prodIcon">{product.icon}</div><div className="cat">{product.category}</div></div>
              <h3>{product.name}</h3><p>{product.note}</p><div className="productUnlock">{uiContent.products.from} {formatMoney(product.minTier)}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
