from pathlib import Path

path = Path(__file__).resolve().parents[1] / "apps/web/src/components/hardware/estimate-bill-form.tsx"
text = path.read_text(encoding="utf-8")
old = '''      router.push(`/admin/hardware/print/${result.data.id}`);
      router.refresh();'''
new = '''      router.push(`/admin/hardware/print/${result.data.id}`);'''
count = text.count(old)
if count == 1:
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
elif count != 0 or "router.refresh();" in text:
    raise RuntimeError(f"Expected one exact navigation block, found {count}")
print("ESTIMATE_PRINT_NAVIGATION_FIXED")
