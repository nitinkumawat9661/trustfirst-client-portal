import { describe, expect, it } from "vitest";
import { nextBillingLineAction } from "./billing-keyboard";

describe("nextBillingLineAction", () => {
  it("moves to an existing next line without appending", () => {
    expect(nextBillingLineAction(0, 3)).toEqual({ append: false, nextIndex: 1 });
  });

  it("appends when quantity Enter is pressed on the final line", () => {
    expect(nextBillingLineAction(2, 3)).toEqual({ append: true, nextIndex: 3 });
  });

  it("handles a single-line bill", () => {
    expect(nextBillingLineAction(0, 1)).toEqual({ append: true, nextIndex: 1 });
  });
});
