import { describe, it, expect } from "vitest";
import { parseParagraphs } from "./paragraph-parser.js";

describe("parseParagraphs", () => {
  it("should return empty array for empty string", () => {
    expect(parseParagraphs("")).toEqual([]);
  });

  it("should return empty array for whitespace-only string", () => {
    expect(parseParagraphs("   \n  \n  ")).toEqual([]);
  });

  it("should parse single paragraph", () => {
    const output = "line 1\nline 2\nline 3";
    const result = parseParagraphs(output);

    expect(result).toEqual([["line 1", "line 2", "line 3"]]);
  });

  it("should parse multiple paragraphs separated by blank lines", () => {
    const output =
      "paragraph 1 line 1\nparagraph 1 line 2\n\nparagraph 2 line 1\nparagraph 2 line 2";
    const result = parseParagraphs(output);

    expect(result).toEqual([
      ["paragraph 1 line 1", "paragraph 1 line 2"],
      ["paragraph 2 line 1", "paragraph 2 line 2"]
    ]);
  });

  it("should handle multiple consecutive blank lines", () => {
    const output = "paragraph 1\n\n\n\nparagraph 2";
    const result = parseParagraphs(output);

    expect(result).toEqual([["paragraph 1"], ["paragraph 2"]]);
  });

  it("should handle leading blank lines", () => {
    const output = "\n\nfirst paragraph";
    const result = parseParagraphs(output);

    expect(result).toEqual([["first paragraph"]]);
  });

  it("should handle trailing blank lines", () => {
    const output = "last paragraph\n\n\n";
    const result = parseParagraphs(output);

    expect(result).toEqual([["last paragraph"]]);
  });

  it("should preserve original line content including leading/trailing spaces", () => {
    const output = "  indented line  \nnormal line";
    const result = parseParagraphs(output);

    expect(result).toEqual([["  indented line  ", "normal line"]]);
  });

  it("should handle complex multi-paragraph output", () => {
    const output = `Test Suite
Running tests...

PASS test-1.ts
  ✓ test one
  ✓ test two

FAIL test-2.ts
  ✖ test three
    Expected: true
    Received: false

Tests: 2 passed, 1 failed, 3 total`;

    const result = parseParagraphs(output);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(["Test Suite", "Running tests..."]);
    expect(result[1]).toEqual([
      "PASS test-1.ts",
      "  ✓ test one",
      "  ✓ test two"
    ]);
    expect(result[2]).toEqual([
      "FAIL test-2.ts",
      "  ✖ test three",
      "    Expected: true",
      "    Received: false"
    ]);
    expect(result[3]).toEqual(["Tests: 2 passed, 1 failed, 3 total"]);
  });

  it("should handle single line as single paragraph", () => {
    const output = "single line";
    const result = parseParagraphs(output);

    expect(result).toEqual([["single line"]]);
  });
});
