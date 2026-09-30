import Link from "next/link"

const categories = [
  { label: "Gift Hampers", note: "Curated with love", href: "#budgets", symbol: "▣" },
  { label: "Necklaces", note: "Elegant & trendy", href: "/jewelry", symbol: "❋" },
  { label: "Earrings", note: "Everyday glam", href: "/jewelry", symbol: "◌" },
  { label: "Rings", note: "Timeless beauty", href: "/jewelry", symbol: "◉" },
  { label: "Combos", note: "Perfect together", href: "/jewelry?collection=combos", symbol: "✧" }
]

export function CommerceCategoryStrip() {
  return (
    <section className="commerceCategorySection" aria-labelledby="shop-by-category-title">
      <div className="wrap">
        <div className="commerceCategoryHead">
          <div><div className="kicker">SHOP YOUR WAY</div><h2 id="shop-by-category-title">Shop by Category</h2></div>
          <Link href="/jewelry" prefetch={false}>View Jewelry →</Link>
        </div>
        <div className="commerceCategoryGrid">
          {categories.map((category, index) => {
            const inner = <><div className={`commerceCategoryVisual visual-${index}`}><span className="jewelrySatin" /><i>{category.symbol}</i></div><b>{category.label}</b><small>{category.note}</small></>
            return category.href.startsWith("#")
              ? <a className="commerceCategoryCard" href={category.href} key={category.label}>{inner}</a>
              : <Link className="commerceCategoryCard" href={category.href} prefetch={false} key={category.label}>{inner}</Link>
          })}
        </div>
      </div>
    </section>
  )
}
