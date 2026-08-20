import { readFileSync, writeFileSync } from "node:fs";

function replaceExactlyOnce(path, before, after, label) {
  const source = readFileSync(path, "utf8");
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: source pattern not found`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: source pattern matched more than once`);
  }
  writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length));
}

replaceExactlyOnce(
  "apps/web/src/components/hardware/hardware-product-combobox.tsx",
  `  useEffect(() => {
    if (!open) {
      setSettledQuery(value);
      return;
    }
    if (!normalizedTypedQuery) {
      setSettledQuery("");
      return;
    }
    const timer = window.setTimeout(() => {
      setSettledQuery(displayedQuery);
      setActiveIndex(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [displayedQuery, normalizedTypedQuery, open, value]);`,
  `  useEffect(() => {
    if (!open) return;
    const nextQuery = normalizedTypedQuery ? displayedQuery : "";
    const delay = normalizedTypedQuery ? SEARCH_DEBOUNCE_MS : 0;
    const timer = window.setTimeout(() => {
      setSettledQuery(nextQuery);
      setActiveIndex(0);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [displayedQuery, normalizedTypedQuery, open]);`,
  "product debounce effect",
);

replaceExactlyOnce(
  "apps/web/src/components/hardware/bill-payment-confirmation-dialog.tsx",
  `  useEffect(() => {
    if (!open) return;
    setChoice(defaultChoice);`,
  `  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the confirmation draft when the dialog opens
    setChoice(defaultChoice);`,
  "payment dialog reset lint annotation",
);

console.log("PR 72 lint repairs applied.");
