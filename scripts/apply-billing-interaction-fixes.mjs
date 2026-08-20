import { readFileSync, writeFileSync } from "node:fs";

function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Multiple matches for ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function update(path, transform) {
  const source = readFileSync(path, "utf8");
  const next = transform(source);
  if (next !== source) writeFileSync(path, next);
}

update("apps/web/src/components/hardware/estimate-bill-form.tsx", (input) => {
  let source = input;
  if (!source.includes("BillPaymentConfirmationDialog")) {
    throw new Error("Estimate Bill payment finalization must run before interaction fixes.");
  }

  if (!source.includes("const saveLockRef = useRef(false);")) {
    source = replaceExactlyOnce(
      source,
      "  const [saving, setSaving] = useState(false);",
      "  const [saving, setSaving] = useState(false);\n  const saveLockRef = useRef(false);",
      "Estimate synchronous save lock state",
    );
  }

  if (!source.includes("if (saveLockRef.current) return;")) {
    source = replaceExactlyOnce(
      source,
      `    if (!resolvedPayment) {
      setPaymentDialogOpen(true);
      return;
    }

    setSaving(true);`,
      `    if (!resolvedPayment) {
      setPaymentDialogOpen(true);
      return;
    }

    if (saveLockRef.current) return;
    saveLockRef.current = true;
    let navigationStarted = false;
    setSaving(true);`,
      "Estimate save lock acquisition",
    );
  }

  if (!source.includes('router.replace("/admin/hardware/quotations?updated=1");')) {
    source = replaceExactlyOnce(
      source,
      "      router.push(`/admin/hardware/print/${result.data.id}`);",
      `      navigationStarted = true;
      if (initialDocument) {
        router.replace("/admin/hardware/quotations?updated=1");
        return;
      }
      router.push(\`/admin/hardware/print/\${result.data.id}\`);`,
      "Estimate success navigation",
    );
  }

  if (!source.includes("if (!navigationStarted) {")) {
    source = replaceExactlyOnce(
      source,
      `    } finally {
      setSaving(false);
    }
  }`,
      `    } finally {
      if (!navigationStarted) {
        saveLockRef.current = false;
        setSaving(false);
      }
    }
  }`,
      "Estimate save lock release",
    );
  }

  source = source.replace('                ? "Update and print Estimate Bill"', '                ? "Save changes"');
  return source;
});

update("apps/web/src/components/hardware/quick-pos-form.tsx", (input) => {
  let source = input;
  if (!source.includes("BillPaymentConfirmationDialog")) {
    throw new Error("Quick POS payment finalization must run before interaction fixes.");
  }

  if (!source.includes("const postLockRef = useRef(false);")) {
    source = replaceExactlyOnce(
      source,
      `  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posted, setPosted] = useState<PostedSale | null>(null);`,
      `  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const postLockRef = useRef(false);
  const [posted, setPosted] = useState<PostedSale | null>(null);`,
      "Quick POS synchronous post lock state",
    );
  }

  if (!source.includes("if (postLockRef.current) return;")) {
    source = replaceExactlyOnce(
      source,
      `    const resolvedPayment = options.payment;
    setSaving(true);`,
      `    const resolvedPayment = options.payment;
    if (postLockRef.current) return;
    postLockRef.current = true;
    setSaving(true);`,
      "Quick POS post lock acquisition",
    );
  }

  if (!source.includes("postLockRef.current = false;\n          setSaving(false);")) {
    source = replaceExactlyOnce(
      source,
      `        if (!createdCustomer.ok) {
          setSaving(false);
          setServerError(createdCustomer.message);`,
      `        if (!createdCustomer.ok) {
          postLockRef.current = false;
          setSaving(false);
          setServerError(createdCustomer.message);`,
      "Quick POS customer-create lock release",
    );
  }

  if (!source.includes("postLockRef.current = false;\n      setSaving(false);\n      setServerError(result.message);")) {
    source = replaceExactlyOnce(
      source,
      `    setSaving(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }`,
      `    if (!result.ok) {
      postLockRef.current = false;
      setSaving(false);
      setServerError(result.message);
      return;
    }
    setSaving(false);`,
      "Quick POS sale-post lock release",
    );
  }

  return source;
});
