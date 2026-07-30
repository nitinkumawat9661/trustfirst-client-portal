export type NextBillingLineAction = {
  append: boolean;
  nextIndex: number;
};

export function nextBillingLineAction(currentIndex: number, lineCount: number): NextBillingLineAction {
  const safeCount = Math.max(lineCount, 1);
  const nextIndex = Math.max(currentIndex, 0) + 1;
  return {
    append: nextIndex >= safeCount,
    nextIndex,
  };
}
