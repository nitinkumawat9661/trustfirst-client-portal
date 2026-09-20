import Link from "next/link"
import { routes } from "../../config/routes"
import { storeContent, uiContent } from "../../lib/domain/content"

export function SiteHeader({ onCreate }: { onCreate?: () => void }) {
  return (
    <header className="nav">
      <div className="wrap navin">
        <Link href={routes.home} className="brand policyBrand" aria-label={storeContent.brand.name}>
          <div className="logo">{storeContent.brand.name}</div>
          <div className="tag">{storeContent.brand.tagline}</div>
        </Link>
        <nav className="links">
          <a href={`${routes.home}#budgets`}>{uiContent.nav.budgets}</a>
          <a href={`${routes.home}#products`}>{uiContent.nav.products}</a>
          <a href={`${routes.home}#builder`}>{uiContent.nav.builder}</a>
          <a href={`${routes.home}#trust`}>{uiContent.nav.promise}</a>
        </nav>
        {onCreate ? <button className="primary navCta" onClick={onCreate}>{uiContent.nav.create}</button> : <Link className="secondary" href={routes.home}>{uiContent.nav.backToStore}</Link>}
      </div>
    </header>
  )
}
