/**
 * Output filtering engine
 */

import type { Template } from '../types.js';
import { parseParagraphs } from './paragraph-parser.js';

/**
 * Filter command output based on template
 * @param rawOutput - Raw command output
 * @param template - Template with regex and tail_paragraphs
 * @returns Filtered output string
 */
export function filterOutput(rawOutput: string, template: Template): string {
  if (!rawOutput || rawOutput.trim().length === 0) {
    return '';
  }

  // Parse output into paragraphs
  const paragraphs = parseParagraphs(rawOutput);
  
  if (paragraphs.length === 0) {
    return '';
  }

  // Compile regex from template
  let regex: RegExp;
  try {
    regex = new RegExp(template.include_regex);
  } catch {
    // Invalid regex - return raw output
    return rawOutput;
  }

  // Step 1: Extract lines matching regex
  const matchedLines: string[] = [];
  for (const paragraph of paragraphs) {
    for (const line of paragraph) {
      if (regex.test(line)) {
        matchedLines.push(line);
      }
    }
  }

  // Step 2: Extract last N paragraphs
  const tailCount = Math.max(0, template.tail_paragraphs);
  const tailLines: string[] = [];
  
  if (tailCount > 0) {
    const tailParagraphs = paragraphs.slice(-tailCount);
    tailLines.push(...tailParagraphs.flat());
  }

  // Step 3: Combine and deduplicate while preserving order
  const seen = new Set<string>();
  const result: string[] = [];

  // Add matched lines first
  for (const line of matchedLines) {
    if (!seen.has(line)) {
      seen.add(line);
      result.push(line);
    }
  }

  // Add tail lines
  for (const line of tailLines) {
    if (!seen.has(line)) {
      seen.add(line);
      result.push(line);
    }
  }

  return result.join('\n');
}
