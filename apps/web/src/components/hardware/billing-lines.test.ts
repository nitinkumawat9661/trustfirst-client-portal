import { describe, expect, it } from "vitest";
import { canPostBillingLines, completedBillingLines } from "./billing-lines";

const completeLine = {
  productId: "product_1",
  productName: "Ceramic Wash Basin",
  quantity: "1",
  rate: "2350",
};

const blankLine = {
  productId: "",
  productName: "",
  quantity: "1",
  rate: "",
};

describe("billing line completion", () => {
  it("allows a completed bill with a keyboard-created trailing blank row", () => {
    expect(canPostBillingLines([completeLine, blankLine])).toBe(true);
    expect(completedBillingLines([completeLine, blankLine])).toEqual([completeLine]);
  });

  it("allows multiple untouched trailing rows while posting only completed items", () => {
    const lines = [completeLine, { ...blankLine }, { ...blankLine }];
    expect(canPostBillingLines(lines)).toBe(true);
    expect(completedBillingLines(lines)).toEqual([completeLine]);
  });

  it("blocks a partially typed unresolved row", () => {
    expect(canPostBillingLines([
      completeLine,
      { ...blankLine, productName: "unknown tap" },
    ])).toBe(false);
  });

  it("requires at least one completed item", () => {
    expect(canPostBillingLines([blankLine])).toBe(false);
  });
});
