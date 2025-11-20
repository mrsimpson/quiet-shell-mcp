import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { findConfigPath, CONFIG_FILE_NAME } from "./discovery.js";
import { existsSync } from "node:fs";
import { createLogger } from "../logger.js";

vi.mock("node:fs");

describe("findConfigPath", () => {
  const mockExistsSync = vi.mocked(existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should find config in current directory", () => {
    const startDir = "/home/user/project";

    mockExistsSync.mockImplementation((path) => {
      return path === `/home/user/project/${CONFIG_FILE_NAME}`;
    });

    const result = findConfigPath(startDir);
    expect(result).toBe(`/home/user/project/${CONFIG_FILE_NAME}`);
  });

  it("should find config in parent directory", () => {
    const startDir = "/home/user/project/subdir";

    mockExistsSync.mockImplementation((path) => {
      return path === `/home/user/project/${CONFIG_FILE_NAME}`;
    });

    const result = findConfigPath(startDir);
    expect(result).toBe(`/home/user/project/${CONFIG_FILE_NAME}`);
  });

  it("should find config in ancestor directory", () => {
    const startDir = "/home/user/project/deep/nested/dir";

    mockExistsSync.mockImplementation((path) => {
      return path === `/home/user/${CONFIG_FILE_NAME}`;
    });

    const result = findConfigPath(startDir);
    expect(result).toBe(`/home/user/${CONFIG_FILE_NAME}`);
  });

  it("should return null if no config found", () => {
    const startDir = "/home/user/project";

    mockExistsSync.mockReturnValue(false);

    const result = findConfigPath(startDir);
    expect(result).toBeNull();
  });

  it("should use process.cwd() if no startDir provided", () => {
    mockExistsSync.mockReturnValue(false);

    const result = findConfigPath();
    expect(result).toBeNull();
    expect(mockExistsSync).toHaveBeenCalled();
  });

  it("should log discovery process when logger provided", () => {
    const startDir = "/home/user/project";
    const logger = createLogger("test");
    const debugSpy = vi.spyOn(logger, "debug");
    const infoSpy = vi.spyOn(logger, "info");

    mockExistsSync.mockImplementation((path) => {
      return path === `/home/user/project/${CONFIG_FILE_NAME}`;
    });

    findConfigPath(startDir, logger);

    expect(debugSpy).toHaveBeenCalledWith(
      "Starting config search from:",
      expect.any(String)
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "Found config file:",
      expect.any(String)
    );
  });

  it("should stop at filesystem root", () => {
    const startDir = "/home/user";

    mockExistsSync.mockReturnValue(false);

    const result = findConfigPath(startDir);
    expect(result).toBeNull();

    // Should have checked up to root
    const calls = mockExistsSync.mock.calls;
    const paths = calls.map((call) => call[0] as string);

    // Last call should be at root
    expect(paths[paths.length - 1]).toMatch(/^\/\.quiet-shell\/config\.yaml$/);
  });
});
