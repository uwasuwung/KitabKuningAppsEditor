/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TransliterationRule } from "../types";

export const defaultTransliterationRules: TransliterationRule[] = [
  // Short Word Shortcuts / Popular terms
  { latin: "ism", arabic: "اسم" },
  { latin: "kalam", arabic: "كلام" },
  { latin: "kitab", arabic: "كتاب" },
  { latin: "bismillah", arabic: "بِسْمِ اللَّهِ" },
  { latin: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ" },
  { latin: "alloh", arabic: "اللَّه" },
  { latin: "allah", arabic: "اللَّه" },
  { latin: "bab", arabic: "بَاب" },
  { latin: "fasl", arabic: "فَصْل" },
  { latin: "nabi", arabic: "نَبِي" },
  { latin: "rasul", arabic: "رَسُول" },
  { latin: "shalawat", arabic: "صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ" },
  { latin: "ila", arabic: "إِلَى" },
  { latin: "ala", arabic: "عَلَى" },
  { latin: "fi", arabic: "فِي" },
  { latin: "min", arabic: "مِنْ" },
  { latin: "an", arabic: "عَنْ" },
  { latin: "amma", arabic: "عَمَّا" },
  { latin: "qola", arabic: "قَالَ" },
  { latin: "nahwu", arabic: "نَحْو" },
  { latin: "shorof", arabic: "صَرْف" },

  // Phonetic character alignments
  { latin: "ts", arabic: "ث" },
  { latin: "kh", arabic: "خ" },
  { latin: "dz", arabic: "ذ" },
  { latin: "sy", arabic: "ش" },
  { latin: "sh", arabic: "ص" },
  { latin: "dh", arabic: "ض" },
  { latin: "th", arabic: "ط" },
  { latin: "zh", arabic: "ظ" },
  { latin: "gh", arabic: "غ" },
  { latin: "a", arabic: "ا" },
  { latin: "b", arabic: "ب" },
  { latin: "t", arabic: "ت" },
  { latin: "j", arabic: "ج" },
  { latin: "h", arabic: "ح" },
  { latin: "d", arabic: "د" },
  { latin: "r", arabic: "ر" },
  { latin: "z", arabic: "ز" },
  { latin: "s", arabic: "س" },
  { latin: "f", arabic: "ف" },
  { latin: "q", arabic: "ق" },
  { latin: "k", arabic: "ك" },
  { latin: "l", arabic: "ل" },
  { latin: "m", arabic: "م" },
  { latin: "n", arabic: "ن" },
  { latin: "w", arabic: "و" },
  { latin: "y", arabic: "ي" },
  { latin: "'", arabic: "ع" }
];
