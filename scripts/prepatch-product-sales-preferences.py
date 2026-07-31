from pathlib import Path

path = Path("apps/web/src/components/hardware/quick-pos-form.tsx")
text = path.read_text(encoding="utf-8")
old = "Product → Enter → quantity → Enter → discount → Enter → GST → Enter → next product. Untouched blank rows do not block posting."
new = "Type a product and press Enter. The first match is selected without a mouse, the last saved discount and GST are filled, then Enter moves through quantity, discount, GST, and the next product."
if new not in text:
    if old not in text:
        raise SystemExit("Quick POS instruction copy was not found.")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
