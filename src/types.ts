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
  notes: string;            // Additional explanation / Syarah / Margin notes (general/fallback)
  words: WordNode[];        // Word-by-word granularity
  matan?: string;           // Matan (Teks utama rujukan)
  syarah?: string;          // Syarah (Uraian penjelasan dari matan)
  hasyiyah?: string;        // Hasyiyah (Super-commentary atas syarah)
  taliq?: string;           // Ta'liq (Anotasi/catatan pinggir ringkas)
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
  category?: string;
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
  theme: "light" | "dark" | "sepia";
  showWordMakna: boolean;
  showFullTranslation: boolean;
  showNotes: boolean; // default legacy general notes toggle
  showMatan?: boolean;
  showSyarah?: boolean;
  showHasyiyah?: boolean;
  showTaliq?: boolean;
  fontSizeArabic: number; // in pixels
  fontSizeTranslation: number; // in pixels
  keyboardLayout: "indonesian-arabic" | "transliteration";
}
