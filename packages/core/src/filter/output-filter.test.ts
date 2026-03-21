import { describe, it, expect } from "vitest";
import { filterOutput } from "./output-filter.js";
import type { Template } from "../types.js";
import { BUILTIN_TEMPLATES } from "../config/builtin-templates.js";

describe("filterOutput", () => {
  it("should return empty string for empty input", () => {
    const template: Template = {
      description: "test",
      include_regex: "ERROR",
      tail_paragraphs: 1
    };

    expect(filterOutput("", template)).toBe("");
  });

  it("should return empty string for whitespace-only input", () => {
    const template: Template = {
      description: "test",
      include_regex: "ERROR",
      tail_paragraphs: 1
    };

    expect(filterOutput("   \n  \n  ", template)).toBe("");
  });

  it("should filter lines matching regex", () => {
    const output =
      "INFO: Starting\nERROR: Failed\nINFO: Continuing\nERROR: Another failure";
    const template: Template = {
      description: "test",
      include_regex: "ERROR",
      tail_paragraphs: 0
    };

    const result = filterOutput(output, template);
    expect(result).toBe("ERROR: Failed\nERROR: Another failure");
  });

  it("should include last N paragraphs", () => {
    const output = "paragraph 1\n\nparagraph 2\n\nparagraph 3\n\nparagraph 4";
    const template: Template = {
      description: "test",
      include_regex: "NOMATCH",
      tail_paragraphs: 2
    };

    const result = filterOutput(output, template);
    expect(result).toBe("paragraph 3\nparagraph 4");
  });

  it("should combine regex matches and tail paragraphs", () => {
    const output =
      "ERROR: Line 1\nINFO: Line 2\n\nINFO: Line 3\n\nSummary: Done";
    const template: Template = {
      description: "test",
      include_regex: "ERROR",
      tail_paragraphs: 1
    };

    const result = filterOutput(output, template);
    expect(result).toBe("ERROR: Line 1\nSummary: Done");
  });

  it("should deduplicate lines from regex and tail", () => {
    const output = "ERROR: Failed\nINFO: Continue\n\nERROR: Failed";
    const template: Template = {
      description: "test",
      include_regex: "ERROR",
      tail_paragraphs: 1
    };

    const result = filterOutput(output, template);
    // Should only include "ERROR: Failed" once
    expect(result).toBe("ERROR: Failed");
  });

  it("should handle regex with multiple patterns", () => {
    const output = "ERROR: e1\nWARN: w1\nINFO: i1\nFAIL: f1";
    const template: Template = {
      description: "test",
      include_regex: "(ERROR|WARN|FAIL)",
      tail_paragraphs: 0
    };

    const result = filterOutput(output, template);
    expect(result).toBe("ERROR: e1\nWARN: w1\nFAIL: f1");
  });

  it("should handle invalid regex gracefully", () => {
    const output = "some output";
    const template: Template = {
      description: "test",
      include_regex: "[invalid(regex",
      tail_paragraphs: 0
    };

    // Should return raw output when regex is invalid
    const result = filterOutput(output, template);
    expect(result).toBe("some output");
  });

  it("should handle tail_paragraphs exceeding available paragraphs", () => {
    const output = "para 1\n\npara 2";
    const template: Template = {
      description: "test",
      include_regex: "NOMATCH",
      tail_paragraphs: 10
    };

    const result = filterOutput(output, template);
    expect(result).toBe("para 1\npara 2");
  });

  it("should handle zero tail_paragraphs", () => {
    const output = "ERROR: e1\nINFO: i1\n\nSummary";
    const template: Template = {
      description: "test",
      include_regex: "ERROR",
      tail_paragraphs: 0
    };

    const result = filterOutput(output, template);
    expect(result).toBe("ERROR: e1");
  });

  it("should filter realistic test output", () => {
    const output = `Test Suite
Running tests...

PASS test-1.ts
  ✓ test one
  ✓ test two

FAIL test-2.ts
  ✖ test three
    Expected: true
    Received: false

FAIL test-3.ts
  ✖ test four

Tests: 2 passed, 2 failed, 4 total
Time: 1.5s`;

    const template: Template = {
      description: "Test failures",
      include_regex: "(FAIL|✖)",
      tail_paragraphs: 1
    };

    const result = filterOutput(output, template);

    // Should include all FAIL/✖ lines plus summary paragraph
    expect(result).toContain("FAIL test-2.ts");
    expect(result).toContain("  ✖ test three");
    expect(result).toContain("FAIL test-3.ts");
    expect(result).toContain("  ✖ test four");
    expect(result).toContain("Tests: 2 passed, 2 failed, 4 total");
    expect(result).toContain("Time: 1.5s");

    // Should NOT include passing tests
    expect(result).not.toContain("PASS test-1.ts");
    expect(result).not.toContain("✓ test one");
  });

  it("should preserve line order", () => {
    const output = "ERROR: Third\nINFO: Info\nERROR: First\nERROR: Second";
    const template: Template = {
      description: "test",
      include_regex: "ERROR",
      tail_paragraphs: 0
    };

    const result = filterOutput(output, template);
    const lines = result.split("\n");

    expect(lines[0]).toBe("ERROR: Third");
    expect(lines[1]).toBe("ERROR: First");
    expect(lines[2]).toBe("ERROR: Second");
  });

  describe("pulumi-up template", () => {
    const pulumiTemplate = BUILTIN_TEMPLATES["pulumi-up"]!;

    it("should suppress successful resource progress lines", () => {
      const output = [
        "Updating (dev):",
        "",
        "     Type                      Name           Status",
        "  +  pulumi:pulumi:Stack        my-stack       creating",
        "  +  aws:s3:Bucket              my-bucket      created",
        "  ~  aws:s3:BucketVersioningV2  my-bucket-v    updated",
        "  -  aws:iam:Role               old-role       deleted",
        "",
        "Resources:",
        "    + 2 created",
        "    ~ 1 updated",
        "    - 1 deleted",
        "",
        "Duration: 12s"
      ].join("\n");

      const result = filterOutput(output, pulumiTemplate);

      // Should NOT include progress lines
      expect(result).not.toContain("creating");
      expect(result).not.toContain("created");
      expect(result).not.toContain("updated");
      expect(result).not.toContain("deleted");
      expect(result).not.toContain("Updating (dev):");
      expect(result).not.toContain("Resources:");

      // Should include the final summary paragraph
      expect(result).toContain("Duration: 12s");
    });

    it("should surface error lines", () => {
      const output = [
        "Updating (dev):",
        "     Type             Name      Status",
        "  +  aws:s3:Bucket    my-bucket creating",
        "  +  aws:s3:Bucket    my-bucket **failed**",
        "     error: 1 error occurred:",
        "     * error: creating urn:...: AccessDenied: Access Denied",
        "",
        "Resources:",
        "    1 error",
        "",
        "Duration: 3s"
      ].join("\n");

      const result = filterOutput(output, pulumiTemplate);

      expect(result).toContain("error: 1 error occurred:");
      expect(result).toContain(
        "* error: creating urn:...: AccessDenied: Access Denied"
      );
      expect(result).toContain("Duration: 3s");

      // Should NOT include the plain progress lines
      expect(result).not.toContain("Updating (dev):");
    });

    it("should surface warning lines", () => {
      const output = [
        "Updating (dev):",
        "  +  aws:lambda:Function  fn  creating",
        "     warning: function timeout is very high (900s)",
        "  +  aws:lambda:Function  fn  created",
        "",
        "Resources:",
        "    + 1 created",
        "",
        "Duration: 8s"
      ].join("\n");

      const result = filterOutput(output, pulumiTemplate);

      expect(result).toContain("warning: function timeout is very high (900s)");
      expect(result).toContain("Duration: 8s");
      expect(result).not.toContain("Updating (dev):");
    });

    it("should surface failed resource lines", () => {
      const output = [
        "Updating (dev):",
        "  +  aws:rds:Instance  db  creating",
        "  +  aws:rds:Instance  db  failed [error: timeout waiting for resource]",
        "",
        "Duration: 120s"
      ].join("\n");

      const result = filterOutput(output, pulumiTemplate);

      expect(result).toContain("failed [error: timeout waiting for resource]");
      expect(result).toContain("Duration: 120s");
      expect(result).not.toContain("creating");
    });

    it("should show only summary when no errors or warnings", () => {
      const output = [
        "Updating (dev):",
        "  +  aws:s3:Bucket  b  creating",
        "  +  aws:s3:Bucket  b  created",
        "",
        "Resources:",
        "    + 1 created",
        "",
        "Duration: 5s"
      ].join("\n");

      const result = filterOutput(output, pulumiTemplate);

      // Only the final summary paragraph should remain
      expect(result).toContain("Duration: 5s");
      expect(result).not.toContain("creating");
      expect(result).not.toContain("Updating (dev):");
    });
  });
});
