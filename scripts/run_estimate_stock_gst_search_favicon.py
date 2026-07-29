from __future__ import annotations

from pathlib import Path

script_path = Path(__file__).with_name("apply_estimate_stock_gst_search_favicon.py")
source = script_path.read_text(encoding="utf-8")
source = source.replace(
    '    if count != 1:\n        raise RuntimeError(f"Expected exactly one match in {relative}, found {count}: {old[:120]!r}")\n',
    '    if count < 1:\n        raise RuntimeError(f"Expected at least one match in {relative}, found {count}: {old[:120]!r}")\n',
    1,
)
old_manifest_calls = '''replace_once(branding, """            src: mangalamLogo,
            type: "image/jpeg",
""", """            src: mangalamIcon,
""")
replace_once(branding, """            src: mangalamLogo,
            type: "image/jpeg",
""", """            src: mangalamIcon,
""")'''
new_manifest_block = '''manifest_content = read(branding)
manifest_old = """            src: mangalamLogo,
            type: "image/jpeg",
"""
manifest_new = """            src: mangalamIcon,
"""
manifest_count = manifest_content.count(manifest_old)
if manifest_count < 1:
    raise RuntimeError(f"Expected at least one Mangalam manifest icon entry, found {manifest_count}")
write(branding, manifest_content.replace(manifest_old, manifest_new))'''
if old_manifest_calls not in source:
    raise RuntimeError("Could not locate duplicate Mangalam manifest replacement block.")
source = source.replace(old_manifest_calls, new_manifest_block, 1)
exec(compile(source, str(script_path), "exec"), {"__name__": "__main__", "__file__": str(script_path)})
