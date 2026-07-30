#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / "scripts" / ".estimate-sale-fast-entry"
EXPECTED_B64_LENGTH = 96_748
EXPECTED_B64_SHA256 = "34b69dd8b88d420d18a984002641447f3430adf299d3b056a813829d55199cd0"
EXPECTED_SCRIPT_SHA256 = "9cbcf4e5ea0076cd489b48a01cf7888d27d196bba684887093ae277073601a26"
EXPECTED_PARTS = [
    PARTS_DIR / "part-00.b64",
    PARTS_DIR / "part-01.b64",
    PARTS_DIR / "part-02.b64",
    PARTS_DIR / "bridge-02-03.b64",
    PARTS_DIR / "part-03.b64",
    PARTS_DIR / "part-04.b64",
    PARTS_DIR / "part-05.b64",
    PARTS_DIR / "part-06.b64",
]

missing = [str(path.relative_to(ROOT)) for path in EXPECTED_PARTS if not path.is_file()]
if missing:
    raise SystemExit(f"Missing Estimate Sale patch chunks: {', '.join(missing)}")

encoded = "".join(path.read_text(encoding="utf-8").strip() for path in EXPECTED_PARTS)
if len(encoded) != EXPECTED_B64_LENGTH:
    raise SystemExit(f"Invalid patch payload length: expected {EXPECTED_B64_LENGTH}, got {len(encoded)}")

encoded_hash = hashlib.sha256(encoded.encode("ascii")).hexdigest()
if encoded_hash != EXPECTED_B64_SHA256:
    raise SystemExit(f"Invalid patch payload SHA-256: {encoded_hash}")

try:
    source = base64.b64decode(encoded, validate=True)
except Exception as error:
    raise SystemExit(f"Estimate Sale patch payload is not valid base64: {error}") from error

source_hash = hashlib.sha256(source).hexdigest()
if source_hash != EXPECTED_SCRIPT_SHA256:
    raise SystemExit(f"Invalid decoded patch SHA-256: {source_hash}")

code = compile(source, str(Path(__file__).resolve()), "exec")
namespace = {
    "__file__": str(Path(__file__).resolve()),
    "__name__": "__estimate_sale_fast_entry_materializer__",
}
exec(code, namespace, namespace)
print("ESTIMATE_SALE_FAST_ENTRY_MATERIALIZATION_COMPLETE")
