"use client"

import { occasions } from "../../lib/domain/catalog"

export function OccasionRail({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="occasionBar"><div className="wrap occasionFlex">{occasions.map((occasion) => <button key={occasion} className={`chip ${value === occasion ? "active" : ""}`} onClick={() => onChange(occasion)}>{occasion}</button>)}</div></div>
}
