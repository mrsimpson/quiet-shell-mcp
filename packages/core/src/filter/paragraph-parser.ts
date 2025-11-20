/**
 * Parse command output into paragraphs
 * A paragraph is a group of consecutive non-empty lines separated by blank lines
 */

/**
 * Parse output into paragraphs
 * @param output - Raw command output
 * @returns Array of paragraphs, where each paragraph is an array of lines
 */
export function parseParagraphs(output: string): string[][] {
  if (!output || output.trim().length === 0) {
    return [];
  }

  const lines = output.split('\n');
  const paragraphs: string[][] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.length === 0) {
      // Blank line - end current paragraph if it has content
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
        currentParagraph = [];
      }
    } else {
      // Non-empty line - add to current paragraph (preserve original line)
      currentParagraph.push(line);
    }
  }

  // Don't forget the last paragraph if it exists
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }

  return paragraphs;
}
