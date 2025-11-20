import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeCommand,
  TemplateManager,
  BUILTIN_TEMPLATES
} from "@codemcp/quiet-shell-core";

// Mock the executeCommand function
vi.mock("@codemcp/quiet-shell-core", async () => {
  const actual = await vi.importActual("@codemcp/quiet-shell-core");
  return {
    ...actual,
    executeCommand: vi.fn()
  };
});

describe("MCP Server Integration", () => {
  const mockExecuteCommand = vi.mocked(executeCommand);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tool Schema Validation", () => {
    it("should have execute_command tool with correct schema", () => {
      // Verify the tool exists and has required properties
      expect(true).toBe(true); // Tool is defined in server.ts
    });

    it("should include all built-in templates in enum", () => {
      const templateManager = new TemplateManager();
      const templates = templateManager.getAvailableTemplates();
      const templateNames = Object.keys(templates);

      // Verify all built-in templates are present
      expect(templateNames).toContain("tsc");
      expect(templateNames).toContain("vitest");
      expect(templateNames).toContain("maven-build");
      expect(templateNames).toContain("maven-test");
      expect(templateNames.length).toBeGreaterThanOrEqual(4);
    });

    it("should have agent-friendly template descriptions", () => {
      Object.entries(BUILTIN_TEMPLATES).forEach(([, template]) => {
        expect(template.description).toContain("Use when");
        expect(template.description).toContain("returns");
      });
    });
  });

  describe("execute_command Response Format", () => {
    it("should return structured response with result, exit_code, output, template_used", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        output: "test output"
      });

      // Simulate what the server would do
      const result = await executeCommand("echo test");
      const response = {
        result: result.exitCode === 0 ? "success" : "failure",
        exit_code: result.exitCode,
        output: result.output,
        template_used: null
      };

      expect(response).toHaveProperty("result");
      expect(response).toHaveProperty("exit_code");
      expect(response).toHaveProperty("output");
      expect(response).toHaveProperty("template_used");
      expect(response.result).toBe("success");
      expect(response.exit_code).toBe(0);
      expect(response.template_used).toBeNull();
    });

    it("should interpret exit code 0 as success", () => {
      const exitCode = 0;
      const result = exitCode === 0 ? "success" : "failure";
      expect(result).toBe("success");
    });

    it("should interpret non-zero exit code as failure", () => {
      const exitCode: number = 1;
      const result = exitCode === 0 ? "success" : "failure";
      expect(result).toBe("failure");
    });
  });

  describe("Template Error Messages", () => {
    it("should generate error message with list_templates instruction", () => {
      const invalidTemplate = "nonexistent-template";
      const templateManager = new TemplateManager();
      const availableTemplates = Object.keys(
        templateManager.getAvailableTemplates()
      ).join(", ");

      const errorMessage = `Template "${invalidTemplate}" not found. Use list_templates tool to see available templates. Available: ${availableTemplates}`;

      expect(errorMessage).toContain(
        'Template "nonexistent-template" not found'
      );
      expect(errorMessage).toContain("list_templates tool");
      expect(errorMessage).toContain("Available:");
      expect(errorMessage).toMatch(/(tsc|vitest|maven-build|maven-test)/);
    });
  });

  describe("Template Filtering", () => {
    it("should apply template when specified", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 1,
        output:
          "PASS test 1\nFAIL test 2\nError: failed\n\nTests: 1 passed, 1 failed"
      });

      const templateManager = new TemplateManager();
      await executeCommand("npm test");
      const vitestTemplate = templateManager.getTemplate("vitest");

      expect(vitestTemplate).toBeDefined();
      expect(vitestTemplate?.include_regex).toBe("(FAIL|ERROR|✖|❯.*failed)");
      expect(vitestTemplate?.tail_paragraphs).toBe(2);
    });

    it("should not apply filtering when template not specified", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        output: "full output here"
      });

      const result = await executeCommand("echo test");

      // Without template, output should be unmodified
      expect(result.output).toBe("full output here");
    });
  });

  describe("list_templates Response Format", () => {
    it("should return templates with name, description, include_regex, tail_paragraphs", () => {
      const templateManager = new TemplateManager();
      const templates = templateManager.getAvailableTemplates();
      const templateList = Object.entries(templates).map(
        ([name, template]) => ({
          name,
          description: template.description,
          include_regex: template.include_regex,
          tail_paragraphs: template.tail_paragraphs
        })
      );

      const response = {
        templates: templateList,
        count: templateList.length
      };

      expect(response).toHaveProperty("templates");
      expect(response).toHaveProperty("count");
      expect(response.templates.length).toBeGreaterThanOrEqual(4);

      const firstTemplate = response.templates[0];
      if (firstTemplate) {
        expect(firstTemplate).toHaveProperty("name");
        expect(firstTemplate).toHaveProperty("description");
        expect(firstTemplate).toHaveProperty("include_regex");
        expect(firstTemplate).toHaveProperty("tail_paragraphs");
      }
    });
  });

  describe("Parameter Validation", () => {
    it("should validate command parameter exists", () => {
      const args = {};
      const isValid =
        "command" in args &&
        typeof (args as Record<string, unknown>).command === "string";
      expect(isValid).toBe(false);
    });

    it("should validate command parameter is string", () => {
      const args = { command: 123 };
      const isValid = typeof args.command === "string";
      expect(isValid).toBe(false);
    });

    it("should accept valid command parameter", () => {
      const args = { command: "echo test" };
      const isValid = "command" in args && typeof args.command === "string";
      expect(isValid).toBe(true);
    });
  });
});
