import { describe, expect, it } from "vitest";
import { commercialDocumentSearchSchema } from "./schemas";

describe("Commercial document API contracts", () => {
  it("validates search query shape for the search endpoint", () => {
    expect(commercialDocumentSearchSchema.parse({ q: "proposal" })).toEqual({
      q: "proposal",
    });
    expect(() => commercialDocumentSearchSchema.parse({ q: "" })).toThrow();
  });
});
