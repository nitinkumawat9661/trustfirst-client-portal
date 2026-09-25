"use client"

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react"
import type { CatalogConfig } from "../../lib/domain/catalog"

type TierSocialProof = {
  tierName: string
  orderCount: number
  totalOrders: number
  sharePercent: number
}

type TailProps = {
  catalog: CatalogConfig
  socialProof: TierSocialProof | null
  selectedTierId: string
  occasion: string
  builderActive: boolean
  requestedStep: number
  requestVersion: number
  onBuild: (step?: number) => void
  onSelectionSync: (tierId: string, occasion: string) => void
}

type DeferredProps = Omit<TailProps, "catalog">
type TailComponent = ComponentType<TailProps>
type CatalogPayload = { ok?: boolean; catalog?: CatalogConfig; socialProof?: TierSocialProof | null }

const DEFERRED_HASHES = new Set(["#products", "#builder", "#custom-request", "#trust"])

export function LazyStorefrontTail(props: DeferredProps) {
  const loadingRef = useRef<Promise<void> | null>(null)
  const [Tail, setTail] = useState<TailComponent | null>(null)
  const [catalog, setCatalog] = useState<CatalogConfig | null>(null)
  const [loadedProof, setLoadedProof] = useState<TierSocialProof | null | undefined>(undefined)
  const [loadError, setLoadError] = useState(false)

  const loadTail = useCallback(() => {
    if ((Tail && catalog) || loadingRef.current) return loadingRef.current
    setLoadError(false)
    loadingRef.current = Promise.all([
      import("./StorefrontTail"),
      fetch("/api/catalog", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("catalog")
        const payload = await response.json() as CatalogPayload
        if (!payload.ok || !payload.catalog) throw new Error("catalog")
        return payload
      })
    ]).then(([mod, payload]) => {
      setCatalog(payload.catalog || null)
      setLoadedProof(payload.socialProof)
      setTail(() => mod.StorefrontTail)
    }).catch(() => {
      setLoadError(true)
    }).finally(() => {
      loadingRef.current = null
    })
    return loadingRef.current
  }, [Tail, catalog])

  useEffect(() => {
    if (props.builderActive) {
      void loadTail()
      return
    }
    if (Tail && catalog) return

    let done = false
    const trigger = () => {
      if (done) return
      done = true
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("hashchange", onHashChange)
      void loadTail()
    }
    const onScroll = () => {
      if (window.scrollY >= 120) trigger()
    }
    const onHashChange = () => {
      if (DEFERRED_HASHES.has(window.location.hash)) trigger()
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("hashchange", onHashChange)
    onHashChange()
    onScroll()

    return () => {
      done = true
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("hashchange", onHashChange)
    }
  }, [props.builderActive, Tail, catalog, loadTail])

  if (Tail && catalog) {
    return <Tail {...props} catalog={catalog} socialProof={loadedProof === undefined ? props.socialProof : loadedProof} />
  }

  return (
    <div className="storefrontTailPlaceholder" aria-live={loadError ? "polite" : undefined}>
      <div className="wrap storefrontTailPlaceholderInner">
        <span aria-hidden="true" />
        {loadError ? <button className="secondary" type="button" onClick={() => void loadTail()}>Load gift options</button> : null}
      </div>
    </div>
  )
}
