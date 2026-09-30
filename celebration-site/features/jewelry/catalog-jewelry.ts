import { visibleProducts, type CatalogConfig, type GiftProduct } from "../../lib/domain/catalog"

const JEWELRY_HINT = /\b(jewel|jewellery|jewelry|necklace|pendant|chain|earring|earrings|ring|rings|bracelet|bangle|anklet|accessory|accessories|combo|set)\b/i
const COMBO_HINT = /\b(combo|set|pair|duo|gift set)\b/i

export function isCatalogJewelryProduct(product: GiftProduct) {
  return JEWELRY_HINT.test(`${product.category} ${product.name}`)
}

export function isCatalogJewelryCombo(product: GiftProduct) {
  return COMBO_HINT.test(`${product.category} ${product.name}`)
}

export function catalogJewelryProducts(catalog: CatalogConfig) {
  return visibleProducts(catalog).filter(isCatalogJewelryProduct)
}

export function catalogJewelryCategories(catalog: CatalogConfig) {
  return Array.from(new Set(catalogJewelryProducts(catalog).map((item) => item.category)))
}

export function catalogJewelryProductBySlug(catalog: CatalogConfig, slug: string) {
  return catalogJewelryProducts(catalog).find((item) => item.id === slug)
}
