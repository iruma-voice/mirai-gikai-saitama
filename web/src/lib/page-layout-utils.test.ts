import { describe, expect, it } from "vitest";

import { isMainPage } from "./page-layout-utils";

describe("isMainPage", () => {
  it("returns true for the top page", () => {
    expect(isMainPage("/")).toBe(true);
  });

  it("returns true for a bill detail page", () => {
    expect(isMainPage("/bills/abc-123")).toBe(true);
  });

  it("returns false for a bill sub-page", () => {
    expect(isMainPage("/bills/abc-123/opinions")).toBe(false);
  });

  it("returns false for an unrelated path", () => {
    expect(isMainPage("/about")).toBe(false);
  });

  it("returns false for the bills list page", () => {
    expect(isMainPage("/bills")).toBe(false);
    expect(isMainPage("/bills/")).toBe(false);
  });
});
