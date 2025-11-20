/**
 * Built-in templates for common tools
 */

import type { Template } from "../types.js";

export const BUILTIN_TEMPLATES: Record<string, Template> = {
  tsc: {
    description:
      "Use when running TypeScript compiler (tsc) - returns type errors and error summary",
    include_regex: "(error TS|TS[0-9]+:|Found [0-9]+ error)",
    tail_paragraphs: 1
  },

  vitest: {
    description:
      "Use when running tests with Vitest - returns failed tests and test summary",
    include_regex:
      "(FAIL|ERROR|✖|❯.*failed|Test Files\\s+\\d+|Tests\\s+\\d+|Tasks:|Cached:|Time:)",
    tail_paragraphs: 0
  },

  "maven-build": {
    description:
      "Use when building with Maven (mvn compile/install/package) - returns build errors and summary",
    include_regex:
      "(\\[ERROR\\]|\\[INFO\\] BUILD (SUCCESS|FAILURE)|\\[INFO\\] Total time:|\\[INFO\\] Finished at:)",
    tail_paragraphs: 0
  },

  "maven-test": {
    description:
      "Use when running Maven tests (mvn test) - returns test failures and test summary",
    include_regex:
      "(\\[ERROR\\]|\\[INFO\\] Results:|\\[INFO\\] Tests run:(?!.*-- in)|\\[INFO\\] BUILD (SUCCESS|FAILURE)|\\[INFO\\] Total time:|\\[INFO\\] Finished at:)",
    tail_paragraphs: 0
  }
};
