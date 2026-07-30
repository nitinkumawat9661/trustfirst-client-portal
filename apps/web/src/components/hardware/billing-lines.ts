export type BillingLineLike = {
  productId: string;
  productName: string;
  quantity: string;
  rate: string;
};

export function isBlankBillingLine(line: BillingLineLike) {
  return !line.productId && !line.productName.trim() && !line.rate.trim();
}

export function isCompleteBillingLine(line: BillingLineLike) {
  return Boolean(line.productId) && Number(line.quantity) > 0 && Number(line.rate) > 0;
}

export function completedBillingLines<T extends BillingLineLike>(lines: T[]) {
  return lines.filter(isCompleteBillingLine);
}

export function canPostBillingLines(lines: BillingLineLike[]) {
  const completed = completedBillingLines(lines);
  return completed.length > 0 && lines.every((line) => isBlankBillingLine(line) || isCompleteBillingLine(line));
}
