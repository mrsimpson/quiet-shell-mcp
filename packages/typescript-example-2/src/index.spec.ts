import { describe, it, expect } from "vitest";
import { world } from "./index";

describe("World", () => {
  it("should return world", () => {
    expect(world()).toBe("World");
  });
});
