export type JewelryUiProduct = {
  slug: string
  name: string
  shortName: string
  category: "Necklaces" | "Earrings" | "Rings" | "Bracelets" | "Combos"
  price: number
  mrp: number
  rating: number
  reviews: number
  badge?: "Best Seller" | "New"
  symbol: string
  description: string
  features: string[]
}

export const jewelryUiProducts: JewelryUiProduct[] = [
  {
    slug: "snowflake-moving-diamond-pendant",
    name: "Snowflake Moving Diamond Pendant",
    shortName: "Snowflake Moving Diamond",
    category: "Necklaces",
    price: 799,
    mrp: 1199,
    rating: 4.8,
    reviews: 320,
    badge: "Best Seller",
    symbol: "❋",
    description: "A bright snowflake-style pendant with a moving centre stone and a polished stainless-steel finish.",
    features: ["Stainless steel", "Moving centre stone", "Anti-tarnish finish", "Gift-ready styling"]
  },
  {
    slug: "heart-pendant-necklace",
    name: "Heart Pendant Necklace",
    shortName: "Heart Pendant",
    category: "Necklaces",
    price: 699,
    mrp: 999,
    rating: 4.7,
    reviews: 245,
    symbol: "♡",
    description: "A clean heart pendant designed for everyday gifting and easy styling.",
    features: ["Stainless steel", "Polished finish", "Lightweight chain", "Everyday wear"]
  },
  {
    slug: "butterfly-necklace",
    name: "Butterfly Necklace",
    shortName: "Butterfly Necklace",
    category: "Necklaces",
    price: 749,
    mrp: 999,
    rating: 4.6,
    reviews: 189,
    badge: "New",
    symbol: "✦",
    description: "A delicate butterfly-inspired necklace with a warm premium look.",
    features: ["Stainless steel", "Butterfly motif", "Smooth edges", "Gift-ready finish"]
  },
  {
    slug: "pearl-drop-necklace",
    name: "Pearl Drop Necklace",
    shortName: "Pearl Drop Necklace",
    category: "Necklaces",
    price: 699,
    mrp: 999,
    rating: 4.5,
    reviews: 112,
    symbol: "●",
    description: "A minimal pearl-drop look made for soft, elegant outfits and occasion gifting.",
    features: ["Stainless steel chain", "Pearl-look drop", "Minimal profile", "Occasion friendly"]
  },
  {
    slug: "love-heart-4-in-1-pendant",
    name: "Love Heart 4-in-1 Pendant",
    shortName: "Love Heart 4-in-1",
    category: "Necklaces",
    price: 999,
    mrp: 1499,
    rating: 4.8,
    reviews: 278,
    symbol: "♥",
    description: "A statement heart pendant designed as a multi-part romantic gift piece.",
    features: ["Stainless steel", "Multi-part heart design", "Premium polish", "Gift box friendly"]
  },
  {
    slug: "minimal-circle-necklace",
    name: "Minimal Circle Necklace",
    shortName: "Minimal Circle",
    category: "Necklaces",
    price: 649,
    mrp: 999,
    rating: 4.4,
    reviews: 96,
    symbol: "◯",
    description: "A simple circle pendant for understated daily wear.",
    features: ["Stainless steel", "Minimal circle design", "Lightweight", "Daily wear"]
  },
  {
    slug: "eternal-earrings",
    name: "Eternal Earrings",
    shortName: "Eternal Earrings",
    category: "Earrings",
    price: 599,
    mrp: 899,
    rating: 4.6,
    reviews: 189,
    symbol: "◌",
    description: "Compact statement earrings with a polished gift-ready finish.",
    features: ["Stainless steel", "Comfort fit", "Polished finish", "Pair set"]
  },
  {
    slug: "celebration-jewelry-gift-set",
    name: "Celebration Jewelry Gift Set",
    shortName: "Jewelry Gift Set",
    category: "Combos",
    price: 1199,
    mrp: 1699,
    rating: 4.8,
    reviews: 212,
    symbol: "✧",
    description: "A coordinated jewelry gift set presented as a Celebration-ready combo.",
    features: ["Coordinated set", "Premium presentation", "Gift-ready", "Celebration combo"]
  }
]

export const jewelryUiCategories = ["All Jewelry", "Necklaces", "Earrings", "Rings", "Bracelets", "Combos"] as const

export function jewelryUiProductBySlug(slug: string) {
  return jewelryUiProducts.find((item) => item.slug === slug)
}
