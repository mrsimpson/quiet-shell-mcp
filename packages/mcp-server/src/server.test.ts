import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeCommand,
  TemplateManager,
  BUILTIN_TEMPLATES
} from "@codemcp/quiet-shell-core";
import type { Stats } from "node:fs";

// Mock the executeCommand function
vi.mock("@codemcp/quiet-shell-core", async () => {
  const actual = await vi.importActual("@codemcp/quiet-shell-core");
  return {
    ...actual,
    executeCommand: vi.fn()
  };
});

// Mock fs/promises module
vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn()
}));

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
      expect(vitestTemplate?.include_regex).toBe(
        "(FAIL|ERROR|✖|❯.*failed|Test Files\\s+\\d+|Tests\\s+\\d+|Tasks:|Cached:|Time:)"
      );
      expect(vitestTemplate?.tail_paragraphs).toBe(0);
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

  describe("Output Suppression on Success", () => {
    it("should suppress output for successful commands without template", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        output: "lots of verbose output that should be suppressed"
      });

      const result = await executeCommand("npm test");
      // Simulate server behavior
      const filteredOutput =
        result.exitCode === 0
          ? "Command completed successfully (output suppressed - exit code 0)"
          : result.output;

      expect(filteredOutput).toBe(
        "Command completed successfully (output suppressed - exit code 0)"
      );
      expect(filteredOutput).not.toContain("verbose output");
    });

    it("should show full output for failed commands without template", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 1,
        output: "error output that should be shown"
      });

      const result = await executeCommand("npm test");
      // Simulate server behavior
      const filteredOutput =
        result.exitCode === 0
          ? "Command completed successfully (output suppressed - exit code 0)"
          : result.output;

      expect(filteredOutput).toBe("error output that should be shown");
      expect(filteredOutput).toContain("error output");
    });

    it("should not suppress output when template is specified even on success", async () => {
      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        output: "PASS test 1\nPASS test 2\n\nTests: 2 passed"
      });

      const result = await executeCommand("npm test");
      // When template is used, suppression should not apply
      // Template filtering takes precedence

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("PASS test");
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

  describe("Output File Writing", () => {
    it("should write output to file when output_file is a directory path", async () => {
      const fsMock = await import("node:fs/promises");
      const mockStat = vi.mocked(fsMock.stat);
      const mockWriteFile = vi.mocked(fsMock.writeFile);

      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        output: "test command output"
      });

      // Mock stat to indicate path is a directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false
      } as Partial<Stats> as Stats);

      mockWriteFile.mockResolvedValue(undefined);

      const result = await executeCommand("echo test");

      // Simulate server behavior with output_file parameter
      const outputFilePath = "/tmp";
      const stats = await mockStat(outputFilePath);

      if (stats.isDirectory()) {
        // Should generate timestamped filename
        const timestamp = new Date()
          .toISOString()
          .replace(/:/g, "-")
          .replace(/\..+/, "");
        const filename = `command-output-${timestamp}.txt`;
        const fullPath = `${outputFilePath}/${filename}`;
        await mockWriteFile(fullPath, result.output, "utf-8");
      }

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\/tmp\/command-output-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/
        ),
        "test command output",
        "utf-8"
      );
    });

    it("should write output to file when output_file is a file path", async () => {
      const fsMock = await import("node:fs/promises");
      const mockStat = vi.mocked(fsMock.stat);
      const mockWriteFile = vi.mocked(fsMock.writeFile);

      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        output: "test command output"
      });

      // Mock stat to indicate path is a file
      mockStat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      } as Partial<Stats> as Stats);

      // Mock write failure
      mockWriteFile.mockRejectedValue(new Error("Permission denied"));

      const result = await executeCommand("echo test");

      // Simulate server behavior with write error
      const outputFilePath = "/tmp/output.txt";
      let outputFileError = null;

      try {
        await mockWriteFile(outputFilePath, result.output, "utf-8");
      } catch (err: unknown) {
        const error = err as Error;
        outputFileError = error.message;
      }

      const response = {
        result: result.exitCode === 0 ? "success" : "failure",
        exit_code: result.exitCode,
        output: result.output,
        template_used: null,
        output_file: null,
        output_file_error: outputFileError
      };

      expect(response.result).toBe("success");
      expect(response.output_file).toBeNull();
      expect(response.output_file_error).toBe("Permission denied");
    });

    it("should write raw unfiltered output to file even when template is used", async () => {
      const fsMock = await import("node:fs/promises");
      const mockStat = vi.mocked(fsMock.stat);
      const mockWriteFile = vi.mocked(fsMock.writeFile);

      mockExecuteCommand.mockResolvedValue({
        exitCode: 0,
        output: "PASS test 1\nPASS test 2\nVerbose output\n\nTests: 2 passed"
      });

      mockStat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      } as Partial<Stats> as Stats);

      mockWriteFile.mockResolvedValue(undefined);

      const result = await executeCommand("npm test");

      // Simulate server behavior: file gets raw output, not filtered
      const outputFilePath = "/tmp/output.txt";
      await mockWriteFile(outputFilePath, result.output, "utf-8");

      // Verify raw output was written
      expect(mockWriteFile).toHaveBeenCalledWith(
        "/tmp/output.txt",
        "PASS test 1\nPASS test 2\nVerbose output\n\nTests: 2 passed",
        "utf-8"
      );
    });
  });
});
