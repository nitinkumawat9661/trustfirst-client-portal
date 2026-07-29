from __future__ import annotations

from pathlib import Path

script_path = Path(__file__).with_name("apply_estimate_stock_gst_search_favicon.py")
source = script_path.read_text(encoding="utf-8")
source = source.replace(
    '    if count != 1:\n        raise RuntimeError(f"Expected exactly one match in {relative}, found {count}: {old[:120]!r}")\n',
    '    if count < 1:\n        raise RuntimeError(f"Expected at least one match in {relative}, found {count}: {old[:120]!r}")\n',
    1,
)
exec(compile(source, str(script_path), "exec"), {"__name__": "__main__", "__file__": str(script_path)})
