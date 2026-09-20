import { publicEnv } from "../../config/public-env"

export const DEFAULT_SUPPORT_WHATSAPP = "917414853321"

export function supportWhatsappNumber() {
  const configured = publicEnv.whatsapp.replace(/\D/g, "")
  return configured || DEFAULT_SUPPORT_WHATSAPP
}

export function supportWhatsappUrl(message = "Hi Celebration, mujhe gift hamper me help chahiye.") {
  return `https://wa.me/${supportWhatsappNumber()}?text=${encodeURIComponent(message)}`
}
