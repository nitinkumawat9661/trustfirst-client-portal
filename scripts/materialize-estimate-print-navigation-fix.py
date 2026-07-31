from pathlib import Path

path = Path(__file__).resolve().parents[1] / "apps/web/src/components/hardware/estimate-bill-form.tsx"
text = path.read_text(encoding="utf-8")
old = '''      router.push(`/admin/hardware/print/${result.data.id}`);
      router.refresh();'''
new = '''      router.push(`/admin/hardware/print/${result.data.id}`);'''
if new not in text:
    if text.count(old) != 1:
        raise RuntimeError(f"Expected one navigation block, found {text.count(old)}")
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
print("ESTIMATE_PRINT_NAVIGATION_FIXED")
