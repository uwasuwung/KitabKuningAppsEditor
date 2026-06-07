/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TransliterationRule } from "../types";

/**
 * Remove all Arabic diacritics (harakat/diacritics range) for search matching.
 */
export function stripDiacritics(text: string): string {
  if (!text) return "";
  // Regular expression to match all common Arabic diacritics:
  // Fathatain (\u064b), Dammatain (\u064c), Kasratain (\u064d), Fathah (\u064e),
  // Dammah (\u064f), Kasrah (\u0650), Shaddah (\u0651), Sukun (\u0652), Dagger Alif (\u0670)
  return text.replace(/[\u064b-\u0652\u0670]/g, "");
}

/**
 * Convert Latin shorthand input to Arabic characters based on the rule dictionary.
 */
export function transliterateText(latinText: string, rules: TransliterationRule[]): string {
  if (!latinText) return "";
  let processed = latinText.toLowerCase().trim();

  // 1. Check exact matches for popular words (e.g. "bismillah")
  const exactMatch = rules.find(r => r.latin === processed);
  if (exactMatch) {
    return exactMatch.arabic;
  }

  // 2. Breakdown character sequences
  let result = "";
  let i = 0;
  while (i < processed.length) {
    // Try matching dual/triple characters first (like 'ts', 'kh', 'sy')
    let matched = false;
    for (let len = 3; len >= 1; len--) {
      if (i + len <= processed.length) {
        const substr = processed.substring(i, i + len);
        const rule = rules.find(r => r.latin === substr);
        if (rule) {
          result += rule.arabic;
          i += len;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      // Keep non-arabic/unknown letters unchanged (e.g. spaces or punctuation)
      result += processed[i];
      i++;
    }
  }

  return result;
}

/**
 * Insert a character safely into a text area / input element at the cursor position.
 */
export function insertTextAtCursor(
  element: HTMLTextAreaElement | HTMLInputElement | null,
  text: string,
  onValueChange: (val: string) => void
) {
  if (!element) return;
  
  const start = element.selectionStart ?? 0;
  const end = element.selectionEnd ?? 0;
  const originalVal = element.value;
  
  const newVal = originalVal.substring(0, start) + text + originalVal.substring(end);
  onValueChange(newVal);

  // Restore cursor position slightly after the inserted text of diacritic
  setTimeout(() => {
    element.focus();
    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
}
