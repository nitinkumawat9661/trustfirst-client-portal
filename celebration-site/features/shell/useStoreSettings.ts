"use client"

import { useEffect, useState } from "react"
import type { StoreSettings } from "../../lib/server/store-settings"

const fallback: StoreSettings = {
  whatsapp: "917414853321",
  assistTitle: "Apne budget me dekh rahe ho?",
  assistBody: "Budget batao, hamper hum curate kar denge.",
  supportMessage: "Hi Celebration, mujhe gift hamper me help chahiye."
}

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(fallback)
  useEffect(() => {
    fetch("/api/store-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.ok && data.settings) setSettings(data.settings) })
      .catch(() => undefined)
  }, [])
  return settings
}
