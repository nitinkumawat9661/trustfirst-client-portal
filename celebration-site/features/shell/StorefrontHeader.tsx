import Link from "next/link"
import { routes } from "../../config/routes"
import { storeContent } from "../../lib/domain/content"
import { supportWhatsappUrl } from "../../lib/domain/support"
import type { StoreSettings } from "../../lib/server/store-settings"

export function StorefrontHeader({ settings }: { settings: StoreSettings }) {
  const supportUrl = supportWhatsappUrl(settings.supportMessage, settings.whatsapp)

  return (
    <>
      <header className="nav celebrationCommerceNav">
        <div className="wrap navin celebrationCommerceNavInner">
          <Link href={routes.home} className="brand policyBrand" prefetch={false}>
            <div className="logo">{storeContent.brand.name}</div>
            <div className="tag">{storeContent.brand.tagline}</div>
          </Link>

          <nav className="links celebrationCommerceLinks" aria-label="Store navigation">
            <a href={`${routes.home}#budgets`}>Hampers</a>
            <Link href="/jewelry" prefetch={false}>Jewelry</Link>
            <Link href="/jewelry?collection=combos" prefetch={false}>Combos</Link>
            <a href={`${routes.home}#occasions`}>Occasions</a>
            <a href={`${routes.home}#budgets`}>Budget</a>
            <a href={`${routes.home}#trust`}>Why Celebration</a>
          </nav>

          <div className="navAccountActions celebrationCommerceActions">
            <Link className="navAccountLink" href={routes.account} prefetch={false} aria-label="My Celebration dashboard">
              <span aria-hidden="true">♡</span><b>My Celebration</b>
            </Link>
            <Link className="secondary navStoreLink celebrationJewelryShortcut" href="/jewelry" prefetch={false}>Jewelry</Link>
          </div>
        </div>

        <div className="assistBar">
          <div className="wrap assistBarInner">
            <span><b>{settings.assistTitle}</b> {settings.assistBody}</span>
            <div>
              <a href={`${routes.home}#custom-request`}>Use my budget</a>
              <a href={supportUrl} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>
        </div>
      </header>

      <a className="whatsappDock" href={supportUrl} target="_blank" rel="noreferrer" aria-label="WA Need help? Celebration WhatsApp support">
        <span aria-hidden="true">WA</span><b>Need help?</b>
      </a>
    </>
  )
}
