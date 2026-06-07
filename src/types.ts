/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WordNode {
  id: string;
  arabic: string;
  makna: string;  // Word-by-word meaning (Indonesian or Pegon "makna jenggot")
  symbol: string; // Syntactic symbol like م (Mubtada'), خ (Khabar), ف (Fa'il), etc.
}

export interface KitabLine {
  id: string;
  arabicFull: string;       // Full raw sentence for RTL flow
  translationFull: string;  // Full translation in Indonesian / Pegon
  notes: string;            // Additional explanation / Syarah / Margin notes
  words: WordNode[];        // Word-by-word granularity
}

export interface KitabSection {
  id: string;
  title: string;
  lines: KitabLine[];
  order: number;
}

export interface KitabChapter {
  id: string;
  title: string;
  sections: KitabSection[];
  order: number;
}

export interface KitabProject {
  id: string;
  title: string;
  author: string;
  description: string;
  dateCreated: string;
  dateModified: string;
  chapters: KitabChapter[];
}

export interface DictionaryItem {
  id: string;
  keyword: string;    // Arabic word (ignore diacritic searchable)
  translation: string; // Meaning in Indonesian
  category?: string;   // e.g., "Fiqh", "Nahwu", "Shorof", "Umum"
}

export interface TransliterationRule {
  latin: string;
  arabic: string;
}

export interface UserConfig {
  theme: "light" | "dark";
  showWordMakna: boolean;
  showFullTranslation: boolean;
  showNotes: boolean;
  fontSizeArabic: number; // in pixels
  fontSizeTranslation: number; // in pixels
  keyboardLayout: "indonesian-arabic" | "transliteration";
}
