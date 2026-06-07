/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  FileDown,
  FileUp,
  Search,
  BookMarked,
  Save,
  Languages,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Columns,
  Eye,
  EyeOff,
  Sliders,
  RefreshCw,
  Clock,
  HelpCircle,
  Hash,
  Download,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";

import {
  KitabProject,
  KitabChapter,
  KitabSection,
  KitabLine,
  WordNode,
  DictionaryItem,
  UserConfig
} from "./types";

import { defaultDictionary } from "./data/defaultKamus";
import { sampleKitabProject } from "./data/sampleKitab";
import { defaultTransliterationRules } from "./data/transliterationRules";
import { stripDiacritics, transliterateText, insertTextAtCursor } from "./utils/arabic";
import { exportToPdf, exportToDocx } from "./utils/exporters";
import ToolbarArabic from "./components/ToolbarArabic";

const QUICK_IRAB_MAP: { [key: string]: { char: string; name: string; desc: string } } = {
  "m": { char: "م", name: "Mubtada'", desc: "Subjek kalimat / Utawi (المبتدأ)" },
  "kh": { char: "خ", name: "Khabar", desc: "Predikat kalimat / Iku (الخبر)" },
  "k": { char: "خ", name: "Khabar", desc: "Predikat kalimat / Iku (الخبر)" },
  "f": { char: "ف", name: "Fa'il", desc: "Pelaku / Sopo (الفاعل)" },
  "o": { char: "مف", name: "Maf'ul Bih", desc: "Objek penderita / Ing (مفعول به)" },
  "maf": { char: "مف", name: "Maf'ul Bih", desc: "Objek penderita / Ing (مفعول به)" },
  "n": { char: "نع", name: "Na'at", desc: "Sifat / Kang (النعت)" },
  "na": { char: "نع", name: "Na'at", desc: "Sifat / Kang (النعت)" },
  "j": { char: "جر", name: "Jar", desc: "Komponen Majrur / Kelawan (الجر)" },
  "jr": { char: "جر", name: "Jar", desc: "Komponen Majrur / Kelawan (الجر)" },
  "h": { char: "حال", name: "Hal", desc: "Keterangan Keadaan / Hale (الحال)" },
  "hal": { char: "حال", name: "Hal", desc: "Keterangan Keadaan / Hale (الحال)" },
  "t": { char: "ت", name: "Tamyiz", desc: "Spesifikasi / Apane (التمييز)" },
  "tam": { char: "ت", name: "Tamyiz", desc: "Spesifikasi / Apane (التمييز)" },
  "g": { char: "مض", name: "Mudhaf", desc: "Sandangan Kepemilikan (المضاف)" },
  "md": { char: "مض", name: "Mudhaf", desc: "Sandangan Kepemilikan (المضاف)" },
  "nb": { char: "نب", name: "Naib Fa'il", desc: "Pelaku Pasif / Sopo (نائب الفاعل)" },
  "sh": { char: "صل", name: "Shilah", desc: "Shilah Maushul / Rupane (الصلة)" },
  "jw": { char: "جو", name: "Jawab", desc: "Jawab Syarat / Moko (الجواب)" },
  "mm": { char: "مم", name: "Maf'ul Mutlaq", desc: "Pengeras / Kelawan (مفعول مطلق)" },
  "ml": { char: "مل", name: "Maf'ul Li-ajlih", desc: "Alasan / Karono (مفعول لأجله)" },
  "ik": { char: "اك", name: "Isim Kana", desc: "Isim milik Kana (اسم كان)" },
  "kk": { char: "كك", name: "Khabar Kana", desc: "Khabar milik Kana (خبر كان)" },
  "ii": { char: "اان", name: "Isim Inna", desc: "Isim milik Inna (اسم إن)" },
  "ki": { char: "كن", name: "Khabar Inna", desc: "Khabar milik Inna (خبر إن)" }
};

export default function App() {
  // --- Persistent & In-memory States ---
  const [project, setProject] = useState<KitabProject>(() => {
    const saved = localStorage.getItem("kitab_project_data");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved project, loading sample", e);
      }
    }
    return sampleKitabProject;
  });

  const [dictionary, setDictionary] = useState<DictionaryItem[]>(() => {
    const saved = localStorage.getItem("kitab_dictionary_data");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved dictionary, loading default", e);
      }
    }
    return defaultDictionary;
  });

  // --- Theme / User Preference State ---
  const [config, setConfig] = useState<UserConfig>({
    theme: "dark",
    showWordMakna: true,
    showFullTranslation: true,
    showNotes: true,
    fontSizeArabic: 32,
    fontSizeTranslation: 14,
    keyboardLayout: "indonesian-arabic"
  });

  // --- Active Navigation States ---
  const [activeChapterId, setActiveChapterId] = useState<string>("");
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [activeLineId, setActiveLineId] = useState<string>("");

  // --- Search state ---
  const [kamusSearch, setKamusSearch] = useState<string>("");
  const [kitabSearch, setKitabSearch] = useState<string>("");

  // --- Sidebar & Panel Toggle ---
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [splitViewMode, setSplitViewMode] = useState<boolean>(false);

  // --- Transliteration helper state ---
  const [isTransliterating, setIsTransliterating] = useState<boolean>(false);
  const [latinInputBuf, setLatinInputBuf] = useState<string>("");
  const [arabicConvertedBuf, setArabicConvertedBuf] = useState<string>("");

  // --- Form & Edit States ---
  const [isEditingProjectMeta, setIsEditingProjectMeta] = useState<boolean>(false);
  const [projectTitleInput, setProjectTitleInput] = useState<string>("");
  const [projectAuthorInput, setProjectAuthorInput] = useState<string>("");
  const [projectDescInput, setProjectDescInput] = useState<string>("");

  // --- New Export Feature States ---
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportScope, setExportScope] = useState<"all" | "current">("current");
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | "html">("pdf");
  const [exportShowMakna, setExportShowMakna] = useState<boolean>(true);
  const [exportShowSymbols, setExportShowSymbols] = useState<boolean>(true);
  const [exportShowTranslation, setExportShowTranslation] = useState<boolean>(true);
  const [exportShowNotes, setExportShowNotes] = useState<boolean>(true);
  const [exportShowMatan, setExportShowMatan] = useState<boolean>(true);
  const [exportShowSyarah, setExportShowSyarah] = useState<boolean>(true);
  const [exportShowHasyiyah, setExportShowHasyiyah] = useState<boolean>(true);
  const [exportShowTaliq, setExportShowTaliq] = useState<boolean>(true);
  const [exportStyleKitabKuning, setExportStyleKitabKuning] = useState<boolean>(true);
  const [exportMobileTab, setExportMobileTab] = useState<"options" | "preview">("options");

  const [newChapterTitle, setNewChapterTitle] = useState<string>("");
  const [newSectionTitle, setNewSectionTitle] = useState<string>("");

  // --- Line Form state ---
  const [lineArabicInput, setLineArabicInput] = useState<string>("");
  const [lineTranslationInput, setLineTranslationInput] = useState<string>("");
  const [lineNotesInput, setLineNotesInput] = useState<string>("");
  const [lineMatanInput, setLineMatanInput] = useState<string>("");
  const [lineSyarahInput, setLineSyarahInput] = useState<string>("");
  const [lineHasyiyahInput, setLineHasyiyahInput] = useState<string>("");
  const [lineTaliqInput, setLineTaliqInput] = useState<string>("");
  const [lineWords, setLineWords] = useState<WordNode[]>([]);

  // --- Sublinear Word Editor state ---
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [wordArabic, setWordArabic] = useState<string>("");
  const [wordMakna, setWordMakna] = useState<string>("");
  const [wordSymbol, setWordSymbol] = useState<string>("");
  const [isQuickInputMode, setIsQuickInputMode] = useState<boolean>(true);

  // --- Dictionary Form state ---
  const [newKamusKeyword, setNewKamusKeyword] = useState<string>("");
  const [newKamusTranslation, setNewKamusTranslation] = useState<string>("");
  const [newKamusCategory, setNewKamusCategory] = useState<string>("Umum");
  const [kamusFilterCategory, setKamusFilterCategory] = useState<string>("Semua");

  // --- API status states ---
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [apiType, setApiType] = useState<"translate" | "breakdown" | "">("");
  const [apiStatusMsg, setApiStatusMsg] = useState<string>("");

  // --- Notification / Autosave indicators ---
  const [notif, setNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [lastSaved, setLastSaved] = useState<string>("");

  // --- Input Refs to insert diacritics accurately ---
  const arabicInputRef = useRef<HTMLTextAreaElement | null>(null);
  const wordArabicRef = useRef<HTMLInputElement | null>(null);
  const fileLoaderRef = useRef<HTMLInputElement | null>(null);
  const kamusLoaderRef = useRef<HTMLInputElement | null>(null);

  // --- Bootstrap default navigation on mount ---
  useEffect(() => {
    if (project.chapters.length > 0) {
      const firstCh = project.chapters[0];
      setActiveChapterId(firstCh.id);
      if (firstCh.sections.length > 0) {
        const firstSec = firstCh.sections[0];
        setActiveSectionId(firstSec.id);
        if (firstSec.lines.length > 0) {
          setActiveLineId(firstSec.lines[0].id);
        }
      }
    }
    const now = new Date();
    setLastSaved(now.toLocaleTimeString("id-ID"));
  }, []);

  // --- Auto backup every 5 minutes ---
  useEffect(() => {
    const backupInterval = setInterval(() => {
      saveToLocalStorage(true);
    }, 300000); // 5 minutes
    return () => clearInterval(backupInterval);
  }, [project, dictionary]);

  // --- Save Project & Dictionary to Local Storage ---
  function saveToLocalStorage(isAutoBackup = false) {
    localStorage.setItem("kitab_project_data", JSON.stringify(project));
    localStorage.setItem("kitab_dictionary_data", JSON.stringify(dictionary));
    const now = new Date();
    setLastSaved(now.toLocaleTimeString("id-ID"));
    if (isAutoBackup) {
      showNotif("Cadangan otomatis berhasil disimpan", "info");
    } else {
      showNotif("Proyek berhasil disimpan ke browser!", "success");
    }
  }

  // --- Show temporary top notification alert ---
  function showNotif(message: string, type: "success" | "error" | "info") {
    setNotif({ message, type });
    setTimeout(() => {
      setNotif(null);
    }, 4000);
  }

  // --- Active Chapter / Section / Line references ---
  const currentChapter = project.chapters.find(c => c.id === activeChapterId) || project.chapters[0];
  const currentSection = currentChapter?.sections.find(s => s.id === activeSectionId) || currentChapter?.sections[0];
  const currentLinesList = currentSection?.lines || [];
  const activeLine = currentLinesList.find(l => l.id === activeLineId);

  // --- Update line inputs when activeLine changes ---
  useEffect(() => {
    if (activeLine) {
      setLineArabicInput(activeLine.arabicFull);
      setLineTranslationInput(activeLine.translationFull);
      setLineNotesInput(activeLine.notes);
      setLineMatanInput(activeLine.matan || "");
      setLineSyarahInput(activeLine.syarah || "");
      setLineHasyiyahInput(activeLine.hasyiyah || "");
      setLineTaliqInput(activeLine.taliq || "");
      setLineWords(activeLine.words || []);
      setEditingWordIndex(null);
    } else {
      setLineArabicInput("");
      setLineTranslationInput("");
      setLineNotesInput("");
      setLineMatanInput("");
      setLineSyarahInput("");
      setLineHasyiyahInput("");
      setLineTaliqInput("");
      setLineWords([]);
      setEditingWordIndex(null);
    }
  }, [activeLineId, activeSectionId]);

  // --- Keyboard Shortcuts Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for saving text modifiers or general layouts
      if (e.ctrlKey && e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        saveToLocalStorage();
        downloadProjectAsFile();
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.code === "KeyT") {
        e.preventDefault();
        setConfig(prev => ({ ...prev, showWordMakna: !prev.showWordMakna }));
        showNotif(`Tampilan Makna Jenggot: ${!config.showWordMakna ? 'Ditampilkan' : 'Disembunyikan'}`, "info");
        return;
      }

      // Check active input
      const activeEl = document.activeElement;
      const isArabicInput = activeEl === arabicInputRef.current;
      const isWordArabicInput = activeEl === wordArabicRef.current;

      if (!isArabicInput && !isWordArabicInput) return;

      const targetRef = isArabicInput ? arabicInputRef.current : wordArabicRef.current;
      const targetStateSetter = isArabicInput ? setLineArabicInput : setWordArabic;

      // Define shortcut keys
      let insertChar = "";
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === "KeyB") {
        e.preventDefault();
        insertChar = "َ"; // Fathah
      } else if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === "KeyB") {
        e.preventDefault();
        insertChar = "ِ"; // Kasrah
      } else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === "KeyD") {
        e.preventDefault();
        insertChar = "ُ"; // Dammah
      } else if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === "KeyD") {
        e.preventDefault();
        insertChar = "ْ"; // Sukun
      } else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === "KeyT") {
        e.preventDefault();
        insertChar = "ّ"; // Tasydid
      } else if (e.ctrlKey && !e.shiftKey && e.altKey && e.code === "KeyB") {
        e.preventDefault();
        insertChar = "ً"; // Fathatain
      } else if (e.ctrlKey && e.shiftKey && e.altKey && e.code === "KeyB") {
        e.preventDefault();
        insertChar = "ٍ"; // Kasratain
      } else if (e.ctrlKey && !e.shiftKey && e.altKey && e.code === "KeyD") {
        e.preventDefault();
        insertChar = "ٌ"; // Dammatain
      }

      if (insertChar) {
        insertTextAtCursor(targetRef, insertChar, targetStateSetter);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config.showWordMakna, lineArabicInput, wordArabic]);

  // --- Realtime Transliteration Trigger ---
  useEffect(() => {
    if (isTransliterating && latinInputBuf.trim() !== "") {
      const converted = transliterateText(latinInputBuf, defaultTransliterationRules);
      setArabicConvertedBuf(converted);
    } else {
      setArabicConvertedBuf("");
    }
  }, [latinInputBuf, isTransliterating]);

  // --- Handle Transliterated text insertion ---
  function handleInsertConvertedArabic() {
    if (arabicConvertedBuf) {
      insertTextAtCursor(arabicInputRef.current, arabicConvertedBuf, setLineArabicInput);
      setLatinInputBuf("");
      setArabicConvertedBuf("");
    }
  }

  // --- Insert selected harakat or symbol manually ---
  function handleInsertChar(char: string) {
    const activeEl = document.activeElement;
    if (activeEl === wordArabicRef.current) {
      insertTextAtCursor(wordArabicRef.current, char, setWordArabic);
    } else {
      insertTextAtCursor(arabicInputRef.current, char, setLineArabicInput);
    }
  }

  // --- API Call: Get AI Translation ---
  async function triggerAiTranslation(isToPegon = false) {
    if (!lineArabicInput.trim()) {
      showNotif("Masukkan teks Arab terlebih dahulu!", "error");
      return;
    }
    setApiLoading(true);
    setApiType("translate");
    setApiStatusMsg(`Menerjemahkan ke ${isToPegon ? "Pegon..." : "Bahasa Indonesia..."}`);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: lineArabicInput,
          targetLang: isToPegon ? "pegon" : "indonesian",
          context: lineNotesInput
        })
      });

      const data = await response.json();
      if (response.ok) {
        setLineTranslationInput(data.translation || "");
        showNotif("Terjemahan AI Berhasil!", "success");
      } else {
        showNotif(data.error || "Gagal menerjemahkan", "error");
      }
    } catch (err: any) {
      console.error(err);
      showNotif("Gagal menghubungi server terjemahan AI.", "error");
    } finally {
      setApiLoading(false);
      setApiType("");
    }
  }

  // --- API Call: Word Breakdown / Bedah Kata Otomatis ---
  async function triggerAiWordBreakdown() {
    if (!lineArabicInput.trim()) {
      showNotif("Tulis kalimat Arab terlebih dahulu untuk diteliti!", "error");
      return;
    }
    setApiLoading(true);
    setApiType("breakdown");
    setApiStatusMsg("Menganalisis tata bahasa dan i'rab per kata via Gemini AI...");

    try {
      const response = await fetch("/api/word-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lineArabicInput })
      });

      const data = await response.json();
      if (response.ok && data.words) {
        setLineWords(data.words);
        showNotif("Pembedahan kalimat selesai! Silakan simpan baris.", "success");
      } else {
        showNotif(data.error || "Gagal memproses kata", "error");
      }
    } catch (err: any) {
      console.error(err);
      showNotif("Gagal memanggil modul analisis kalimat.", "error");
    } finally {
      setApiLoading(false);
      setApiType("");
    }
  }

  // --- Project CRUD ---
  function handleSaveProjectMeta() {
    setProject(prev => ({
      ...prev,
      title: projectTitleInput || prev.title,
      author: projectAuthorInput || prev.author,
      description: projectDescInput || prev.description,
      dateModified: new Date().toISOString()
    }));
    setIsEditingProjectMeta(false);
    showNotif("Informasi kitab diperbarui!", "success");
  }

  function handleAddChapter() {
    if (!newChapterTitle.trim()) return;
    const newId = `ch-${Date.now()}`;
    const newCh: KitabChapter = {
      id: newId,
      title: newChapterTitle.toUpperCase(),
      order: project.chapters.length + 1,
      sections: []
    };
    setProject(prev => ({
      ...prev,
      chapters: [...prev.chapters, newCh]
    }));
    setNewChapterTitle("");
    setActiveChapterId(newId);
    setActiveSectionId("");
    setActiveLineId("");
    showNotif("Bab baru berhasil ditambahkan!", "success");
  }

  function handleDeleteChapter(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Hapus bab beserta seluruh falls/baris di dalamnya?")) return;
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.filter(c => c.id !== id)
    }));
    if (activeChapterId === id) {
      setActiveChapterId("");
      setActiveSectionId("");
      setActiveLineId("");
    }
    showNotif("Bab telah dihapus.", "info");
  }

  function handleAddSection() {
    if (!activeChapterId) {
      showNotif("Pilih bab terlebih dahulu!", "error");
      return;
    }
    if (!newSectionTitle.trim()) return;
    const newSecId = `sec-${Date.now()}`;
    const newSec: KitabSection = {
      id: newSecId,
      title: newSectionTitle,
      order: (currentChapter?.sections.length || 0) + 1,
      lines: []
    };

    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => {
        if (ch.id === activeChapterId) {
          return { ...ch, sections: [...ch.sections, newSec] };
        }
        return ch;
      })
    }));

    setNewSectionTitle("");
    setActiveSectionId(newSecId);
    setActiveLineId("");
    showNotif("Fasal baru berhasil ditambahkan!", "success");
  }

  function handleDeleteSection(secId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Hapus fasal beserta seluruh baris di dalamnya?")) return;
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => {
        if (ch.id === activeChapterId) {
          return {
            ...ch,
            sections: ch.sections.filter(s => s.id !== secId)
          };
        }
        return ch;
      })
    }));
    if (activeSectionId === secId) {
      setActiveSectionId("");
      setActiveLineId("");
    }
    showNotif("Fasal telah dihapus.", "info");
  }

  // --- Line CRUD ---
  function handleAddEmptyLine() {
    if (!activeSectionId) {
      showNotif("Pilih fasal terlebih dahulu sebelum menambah baris teks!", "error");
      return;
    }
    const newLineId = `line-${Date.now()}`;
    const newLine: KitabLine = {
      id: newLineId,
      arabicFull: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ",
      translationFull: "Dengan menyebut nama Allah yang Maha Pengasih lagi Maha Penyayang.",
      notes: "Basmalah sebagai pembuka kitab.",
      matan: "",
      syarah: "",
      hasyiyah: "",
      taliq: "",
      words: [
        { id: `w-${Date.now()}-1`, arabic: "بِسْمِ", makna: "kelawan nyebut asmo", symbol: "ع" },
        { id: `w-${Date.now()}-2`, arabic: "اللَّهِ", makna: "ing utawi Allah", symbol: "مض" }
      ]
    };

    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => {
        if (ch.id === activeChapterId) {
          return {
            ...ch,
            sections: ch.sections.map(sec => {
              if (sec.id === activeSectionId) {
                return { ...sec, lines: [...sec.lines, newLine] };
              }
              return sec;
            })
          };
        }
        return ch;
      })
    }));

    setActiveLineId(newLineId);
    showNotif("Baris teks baru draf ditambahkan!", "success");
    saveToLocalStorage();
  }

  function handleSaveActiveLine() {
    if (!activeLineId) {
      showNotif("Pilih baris yang sedang diedit dahulu!", "error");
      return;
    }

    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => {
        if (ch.id === activeChapterId) {
          return {
            ...ch,
            sections: ch.sections.map(sec => {
              if (sec.id === activeSectionId) {
                return {
                  ...sec,
                  lines: sec.lines.map(line => {
                    if (line.id === activeLineId) {
                      return {
                        ...line,
                        arabicFull: lineArabicInput,
                        translationFull: lineTranslationInput,
                        notes: lineNotesInput,
                        matan: lineMatanInput,
                        syarah: lineSyarahInput,
                        hasyiyah: lineHasyiyahInput,
                        taliq: lineTaliqInput,
                        words: lineWords
                      };
                    }
                    return line;
                  })
                };
              }
              return sec;
            })
          };
        }
        return ch;
      })
    }));

    showNotif("Baris teks berhasil diperbarui!", "success");
    saveToLocalStorage();
  }

  function handleDeleteLine(lineId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Hapus baris teks klasik ini?")) return;
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => {
        if (ch.id === activeChapterId) {
          return {
            ...ch,
            sections: ch.sections.map(sec => {
              if (sec.id === activeSectionId) {
                return {
                  ...sec,
                  lines: sec.lines.filter(l => l.id !== lineId)
                };
              }
              return sec;
            })
          };
        }
        return ch;
      })
    }));
    if (activeLineId === lineId) {
      setActiveLineId("");
    }
    showNotif("Baris dihapus.", "info");
  }

  // --- Sublinear Word Node CRUD ---
  function handleSelectWordForEditing(idx: number) {
    setEditingWordIndex(idx);
    const word = lineWords[idx];
    if (word) {
      setWordArabic(word.arabic);
      setWordMakna(word.makna);
      setWordSymbol(word.symbol);
    }
  }

  function handleSaveWordNode() {
    if (editingWordIndex === null) return;
    const updated = [...lineWords];
    updated[editingWordIndex] = {
      ...updated[editingWordIndex],
      arabic: wordArabic,
      makna: wordMakna,
      symbol: wordSymbol
    };
    setLineWords(updated);
    setEditingWordIndex(null);
    setWordArabic("");
    setWordMakna("");
    setWordSymbol("");
    showNotif("Makna kata disimpan sementara. Klik 'Simpan Baris' untuk menyimpan permanen.", "info");
  }

  function handleAddWordNode() {
    const newWord: WordNode = {
      id: `word-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      arabic: wordArabic || "کلمة",
      makna: wordMakna || "",
      symbol: wordSymbol || ""
    };
    setLineWords([...lineWords, newWord]);
    setWordArabic("");
    setWordMakna("");
    setWordSymbol("");
    setEditingWordIndex(null);
    showNotif("Kata ditambahkan ke baris.", "success");
  }

  function handleDeleteWordNode(idx: number) {
    setLineWords(lineWords.filter((_, i) => i !== idx));
    setEditingWordIndex(null);
  }

  function handleMoveWordNode(idx: number, direction: "left" | "right") {
    // Note that Arabic is RTL, so moving left/right might depend, but we reorder array elements here
    if (direction === "left" && idx > 0) {
      const updated = [...lineWords];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      setLineWords(updated);
    } else if (direction === "right" && idx < lineWords.length - 1) {
      const updated = [...lineWords];
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      setLineWords(updated);
    }
  }

  // --- Dictionary (Kamus) Operations ---
  function handleAddKamusItem() {
    if (!newKamusKeyword.trim() || !newKamusTranslation.trim()) {
      showNotif("Kata kunci dan Terjemah wajib diisi!", "error");
      return;
    }
    const newItem: DictionaryItem = {
      id: `kamus-${Date.now()}`,
      keyword: newKamusKeyword,
      translation: newKamusTranslation,
      category: newKamusCategory
    };
    setDictionary([...dictionary, newItem]);
    setNewKamusKeyword("");
    setNewKamusTranslation("");
    showNotif("Kata berhasil didaftarkan ke Kamus!", "success");
  }

  function handleDeleteKamusItem(id: string) {
    setDictionary(dictionary.filter(item => item.id !== id));
    showNotif("Item kamus dihapus.", "info");
  }

  function handleImportKamusCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const loaded: DictionaryItem[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().includes("keyword")) return; // skip header
        const parts = line.split(",");
        if (parts.length >= 2) {
          loaded.push({
            id: `csv-${Date.now()}-${idx}`,
            keyword: parts[0].trim(),
            translation: parts[1].trim(),
            category: parts[2]?.trim() || "Kamus Impor"
          });
        }
      });

      if (loaded.length > 0) {
        setDictionary(prev => [...prev, ...loaded]);
        showNotif(`Berhasil mengimpor ${loaded.length} entri kamus!`, "success");
      } else {
        showNotif("Gagal mengimpor. Pastikan file CSV berbentuk: keyword,translation,category", "error");
      }
    };
    reader.readAsText(file);
  }

  // --- File Import & Export (.kitab / JSON) ---
  function downloadProjectAsFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    const sanitizedTitle = project.title.toLowerCase().replace(/[^a-z0-9]/gi, "_");
    downloadAnchor.setAttribute("download", `${sanitizedTitle}.kitab`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotif("File *.kitab berhasil diunduh!", "success");
  }

  function handleImportProjectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedProject = JSON.parse(event.target?.result as string);
        if (importedProject.id && importedProject.chapters) {
          setProject(importedProject);
          if (importedProject.chapters.length > 0) {
            const firstCh = importedProject.chapters[0];
            setActiveChapterId(firstCh.id);
            if (firstCh.sections.length > 0) {
              const firstSec = firstCh.sections[0];
              setActiveSectionId(firstSec.id);
              if (firstSec.lines.length > 0) {
                setActiveLineId(firstSec.lines[0].id);
              }
            }
          }
          showNotif("Sukses memuat berkas kitab klasik!", "success");
        } else {
          showNotif("Kerangka file .kitab tidak valid.", "error");
        }
      } catch (err) {
        showNotif("Gagal membaca file JSON (*.kitab)", "error");
      }
    };
    reader.readAsText(file);
  }

  function handleResetToDefaults() {
    if (confirm("Reset ulang proyek & kamus ke default bawaan awal? Semua perubahan anda akan terhapus.")) {
      setProject(sampleKitabProject);
      setDictionary(defaultDictionary);
      setActiveChapterId(sampleKitabProject.chapters[0]?.id || "");
      setActiveSectionId(sampleKitabProject.chapters[0]?.sections[0]?.id || "");
      setActiveLineId(sampleKitabProject.chapters[0]?.sections[0]?.lines[0]?.id || "");
      showNotif("Dikembalikan ke proyek sampel utama!", "info");
    }
  }

  // --- Pro Professional Exporters & PDF/Word Generator ---
  function handleRunExport() {
    try {
      if (exportFormat === "pdf") {
        exportToPdf(project, {
          scope: exportScope,
          currentChapterId: activeChapterId,
          showMakna: exportShowMakna,
          showSymbols: exportShowSymbols,
          showTranslation: exportShowTranslation,
          showNotes: exportShowNotes,
          showMatan: exportShowMatan,
          showSyarah: exportShowSyarah,
          showHasyiyah: exportShowHasyiyah,
          showTaliq: exportShowTaliq,
          styleKitabKuning: exportStyleKitabKuning
        });
        showNotif("Modul cetak PDF berhasil diinisialisasi!", "success");
      } else if (exportFormat === "docx") {
        showNotif("Menyiapkan dokumen Word... Mohon tunggu.", "info");
        exportToDocx(project, {
          scope: exportScope,
          currentChapterId: activeChapterId,
          showMakna: exportShowMakna,
          showSymbols: exportShowSymbols,
          showTranslation: exportShowTranslation,
          showNotes: exportShowNotes,
          showMatan: exportShowMatan,
          showSyarah: exportShowSyarah,
          showHasyiyah: exportShowHasyiyah,
          showTaliq: exportShowTaliq,
          styleKitabKuning: exportStyleKitabKuning
        })
          .then(() => {
            showNotif("Word dokumen (.docx) berhasil diunduh!", "success");
          })
          .catch((err) => {
            showNotif(`Gagal mengekspor .docx: ${err.message}`, "error");
          });
      } else {
        handleGenerateHtmlexport();
      }
      setShowExportModal(false);
    } catch (err: any) {
      showNotif(`Gagal mengekspor: ${err.message || err}`, "error");
    }
  }

  // --- Print / Export as HTML and CSS Layout ---
  function handleGenerateHtmlexport() {
    const chaptersToExport = exportScope === "current" && activeChapterId
      ? project.chapters.filter(ch => ch.id === activeChapterId)
      : project.chapters;

    if (chaptersToExport.length === 0) {
      showNotif("Tidak ada bab untuk diekspor dalam ruang lingkup ini.", "error");
      return;
    }

    const showMatan = exportShowMatan !== false;
    const showSyarah = exportShowSyarah !== false;
    const showHasyiyah = exportShowHasyiyah !== false;
    const showTaliq = exportShowTaliq !== false;
    const useKitabKuningStyle = exportStyleKitabKuning !== false;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${project.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;500;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #0c0a09;
            line-height: 1.6;
            padding: 40px;
            direction: rtl;
          }

          /* Traditional Kitab Kuning Theme styling */
          .kitab-kuning-theme {
            background-color: #faf4e6 !important;
            color: #3d2414 !important;
          }
          
          .kitab-kuning-theme .line {
            background-color: #fcf9f2 !important;
            border: 1px solid #c49662 !important;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(139, 90, 43, 0.05);
            padding: 24px;
          }

          .kitab-kuning-theme h1 {
            color: #7c441c !important;
            border-bottom: 3px double #a8733e !important;
          }

          .kitab-kuning-theme .chapter-title {
            color: #7c441c !important;
            border-bottom: 2px double #c49662 !important;
            font-family: 'Scheherazade New', 'Amiri', serif !important;
          }

          .kitab-kuning-theme .section-title {
            color: #522f16 !important;
            border-right: 5px solid #a8733e !important;
          }

          .container { max-width: 900px; margin: 0 auto; direction: rtl; text-align: right; }
          h1 { text-align: center; color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 15px; font-family: 'Amiri', serif; }
          .meta { text-align: center; color: #666; font-style: italic; margin-bottom: 40px; font-family: sans-serif; }
          .chapter { margin-top: 50px; border-bottom: 1px dashed #ccc; padding-bottom: 30px; }
          .chapter-title { color: #1e3a8a; text-align: center; font-size: 28px; font-family: 'Amiri', serif; }
          .section { margin: 30px 0; }
          .section-title { color: #0f172a; font-size: 20px; border-right: 4px solid #16a34a; padding-right: 12px; font-family: sans-serif; }
          .line { margin: 35px 0; background: #fafafa; padding: 22px; border-radius: 8px; border: 1px solid #eee; break-inside: avoid; }
          .arabic-container { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 15px; margin-bottom: 15px; line-height: 2.8; }
          
          .word-block { display: inline-flex; flex-direction: column; align-items: center; min-width: 50px; }
          .kitab-kuning-theme .word-block {
            background-color: #fdfbf7;
            border: 1px solid #eed8bf;
            border-radius: 6px;
            padding: 4px 8px;
          }

          .arabic-word { font-family: 'Scheherazade New', 'Amiri', serif; font-size: 28px; font-weight: bold; color: #000; }
          .kitab-kuning-theme .arabic-word { color: #2b180d !important; }

          .makna-jenggot { font-size: 11px; color: #555; text-align: center; font-family: sans-serif; margin-top: 2px; font-style: italic; }
          .kitab-kuning-theme .makna-jenggot { color: #5c3c26 !important; }

          .symbol-badge { background: #dcfce7; color: #166534; font-size: 10px; font-family: monospace; padding: 1px 4px; border-radius: 3px; font-weight: bold; margin-top: 1px; }
          .kitab-kuning-theme .symbol-badge { background-color: #fbf5e6; color: #8c4f2b; border: 1px solid #e2c098; }

          /* Scholastic Badge Styles */
          .layer-badge {
            display: inline-block;
            font-size: 8.5px;
            letter-spacing: 0.05em;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            line-height: normal;
            margin-bottom: 6px;
            font-family: 'Inter', sans-serif;
          }

          .matan-badge {
            background-color: #ffe4e6;
            color: #9f1239;
            border: 1px solid #fecdd3;
          }

          .syarah-badge {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
          }

          .hasyiyah-badge {
            background-color: #ede9fe;
            color: #5b21b6;
            border: 1px solid #ddd6fe;
          }

          .taliq-badge {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }

          /* Kitab Kuning Theme Scholastic Badges OVERRIDES */
          .kitab-kuning-theme .matan-badge {
            background-color: #f5e3ca !important;
            color: #7c2d12 !important;
            border: 1px solid #e7c595 !important;
          }

          .kitab-kuning-theme .syarah-badge {
            background-color: #ecf3e6 !important;
            color: #224d1a !important;
            border: 1px solid #cbdcb8 !important;
          }

          .kitab-kuning-theme .hasyiyah-badge {
            background-color: #eae6f3 !important;
            color: #3b1e6e !important;
            border: 1px solid #c9bde4 !important;
          }

          .kitab-kuning-theme .taliq-badge {
            background-color: #f7eded !important;
            color: #822222 !important;
            border: 1px solid #eababa !important;
          }

          /* Layers Formatting */
          .layer-matan {
            border: 1px solid #fda4af;
            background-color: #fff1f2;
            border-radius: 6px;
            padding: 12px;
            margin-top: 14px;
            direction: rtl;
            text-align: right;
          }

          .kitab-kuning-theme .layer-matan {
            border: 1px solid #e7bd8c !important;
            background-color: #fcf9f2 !important;
          }

          .arabic-text-serif {
            font-family: 'Scheherazade New', 'Amiri', serif;
            font-size: 24px;
            font-weight: bold;
            line-height: 1.8;
            display: block;
            color: #9f1239;
          }

          .kitab-kuning-theme .arabic-text-serif {
            color: #7c2d12 !important;
          }

          .layer-syarah {
            border-right: 4px solid #10b981;
            background-color: #f0fdf4;
            border-radius: 0 6px 6px 0;
            padding: 12px;
            margin-top: 10px;
            text-align: left;
            direction: ltr;
          }

          .kitab-kuning-theme .layer-syarah {
            border-right: 4px solid #9e6f3b !important;
            background-color: #fbf9f4 !important;
          }

          .layer-hasyiyah {
            border-right: 4px solid #8b5cf6;
            background-color: #f5f3ff;
            border-radius: 0 6px 6px 0;
            padding: 12px;
            margin-top: 10px;
            text-align: left;
            direction: ltr;
          }

          .kitab-kuning-theme .layer-hasyiyah {
            border-right: 4px solid #7c51a5 !important;
            background-color: #f8f6f0 !important;
          }

          .layer-taliq {
            border-right: 4px solid #f59e0b;
            background-color: #fffbeb;
            border-radius: 0 6px 6px 0;
            padding: 10px 12px;
            margin-top: 10px;
            text-align: left;
            direction: ltr;
          }

          .kitab-kuning-theme .layer-taliq {
            border-right: 4px solid #b85b30 !important;
            background-color: #faf6ed !important;
          }

          .commentary-text {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            margin: 0;
            color: #374151;
          }

          .kitab-kuning-theme .commentary-text {
            color: #4a2f1b !important;
          }

          .translation-full {
            font-size: 14px;
            color: #374151;
            font-family: sans-serif;
            direction: ltr;
            text-align: left;
            background: #f1f5f9;
            padding: 10px;
            border-left: 3.5px solid #10b981;
            margin-top: 14px;
            border-radius: 4px;
          }
          
          .kitab-kuning-theme .translation-full {
            background-color: #f7f3e8 !important;
            border-left: 4.5px solid #a3754c !important;
            color: #4a2f1b !important;
          }
        </style>
      </head>
      <body class="${useKitabKuningStyle ? 'kitab-kuning-theme' : ''}">
        <div class="container">
          <h1>${project.title}</h1>
          <div class="meta">Oleh: ${project.author} <br/> ${project.description}</div>
          
          ${chaptersToExport.map(ch => `
            <div class="chapter">
              <h2 class="chapter-title">${ch.title}</h2>
              ${ch.sections.map(sec => `
                <div class="section">
                  <h3 class="section-title">${sec.title}</h3>
                  ${sec.lines.map(line => `
                    <div class="line">
                      <div class="arabic-container">
                        ${(line.words && line.words.length > 0 && exportShowMakna) ? 
                          line.words.map(w => `
                            <div class="word-block">
                              <span class="arabic-word">${w.arabic}</span>
                              ${(exportShowSymbols && w.symbol) ? `<span class="symbol-badge">${w.symbol}</span>` : ""}
                              <span class="makna-jenggot">${w.makna || ""}</span>
                            </div>
                          `).join("") 
                          : `<span style="font-size: 26px; font-weight: bold; font-family: 'Scheherazade New', 'Amiri', serif;">${line.arabicFull}</span>`
                        }
                      </div>

                      ${(exportShowTranslation && line.translationFull) ? `
                        <div class="translation-full">
                          <strong>Makna:</strong> ${line.translationFull}
                        </div>
                      ` : ""}

                      ${showMatan && line.matan ? `
                        <div class="layer-matan">
                          <span class="layer-badge matan-badge">MATAN</span>
                          <span class="arabic-text-serif" dir="rtl">${line.matan}</span>
                        </div>
                      ` : ""}

                      ${showSyarah && (line.syarah || line.notes) ? `
                        <div class="layer-syarah">
                          <span class="layer-badge syarah-badge">SYARAH</span>
                          <p class="commentary-text">${line.syarah || line.notes}</p>
                        </div>
                      ` : ""}

                      ${showHasyiyah && line.hasyiyah ? `
                        <div class="layer-hasyiyah">
                          <span class="layer-badge hasyiyah-badge">HASYIYAH</span>
                          <p class="commentary-text">${line.hasyiyah}</p>
                        </div>
                      ` : ""}

                      ${showTaliq && line.taliq ? `
                        <div class="layer-taliq">
                          <span class="layer-badge taliq-badge">TA'LIQ</span>
                          <p class="commentary-text">${line.taliq}</p>
                        </div>
                      ` : ""}
                    </div>
                  `).join("")}
                </div>
              `).join("")}
            </div>
          `).join("")}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `${project.title.replace(/\s+/g, '_')}_buku_makna.html`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotif("Ekspor dokumen HTML telah berhasil diunduh!", "success");
  }

  function generatePreviewHtml(): string {
    const chaptersToExport = exportScope === "all"
      ? project.chapters
      : project.chapters.filter(ch => ch.id === activeChapterId);

    const showMatan = exportShowMatan !== false;
    const showSyarah = exportShowSyarah !== false;
    const showHasyiyah = exportShowHasyiyah !== false;
    const showTaliq = exportShowTaliq !== false;
    const useKitabKuningStyle = exportStyleKitabKuning !== false;

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${project.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;500;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #0c0a09;
            line-height: 1.6;
            padding: 24.5px;
            direction: rtl;
          }

          /* Traditional Kitab Kuning Theme styling */
          .kitab-kuning-theme {
            background-color: #faf4e6 !important;
            color: #3d2414 !important;
          }
          
          .kitab-kuning-theme .line {
            background-color: #fcf9f2 !important;
            border: 1px solid #c49662 !important;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(139, 90, 43, 0.05);
            padding: 20px;
          }

          .kitab-kuning-theme h1 {
            color: #7c441c !important;
            border-bottom: 3px double #a8733e !important;
          }

          .kitab-kuning-theme .chapter-title {
            color: #7c441c !important;
            border-bottom: 2px double #c49662 !important;
            font-family: 'Scheherazade New', 'Amiri', serif !important;
          }

          .kitab-kuning-theme .section-title {
            color: #522f16 !important;
            border-right: 5px solid #a8733e !important;
          }

          .container { max-width: 900px; margin: 0 auto; direction: rtl; text-align: right; }
          h1 { text-align: center; color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 15px; font-family: 'Amiri', serif; margin-top: 10px; }
          .meta { text-align: center; color: #666; font-style: italic; margin-bottom: 30px; font-family: sans-serif; }
          .chapter { margin-top: 30px; border-bottom: 1px dashed #ccc; padding-bottom: 20px; }
          .chapter-title { color: #1e3a8a; text-align: center; font-size: 24px; font-family: 'Amiri', serif; }
          .section { margin: 20px 0; }
          .section-title { color: #0f172a; font-size: 18px; border-right: 4px solid #16a34a; padding-right: 12px; font-family: sans-serif; }
          .line { margin: 25px 0; background: #fafafa; padding: 18px; border-radius: 8px; border: 1px solid #eee; break-inside: avoid; }
          .arabic-container { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 12px; margin-bottom: 12px; line-height: 2.6; }
          
          .word-block { display: inline-flex; flex-direction: column; align-items: center; min-width: 44px; }
          .kitab-kuning-theme .word-block {
            background-color: #fdfbf7;
            border: 1px solid #eed8bf;
            border-radius: 6px;
            padding: 4px 6px;
          }

          .arabic-word { font-family: 'Scheherazade New', 'Amiri', serif; font-size: 26px; font-weight: bold; color: #000; }
          .kitab-kuning-theme .arabic-word { color: #2b180d !important; }

          .makna-jenggot { font-size: 11px; color: #555; text-align: center; font-family: sans-serif; margin-top: 2px; font-style: italic; }
          .kitab-kuning-theme .makna-jenggot { color: #5c3c26 !important; }

          .symbol-badge { background: #dcfce7; color: #166534; font-size: 10px; font-family: monospace; padding: 1px 4px; border-radius: 3px; font-weight: bold; margin-top: 1px; }
          .kitab-kuning-theme .symbol-badge { background-color: #fbf5e6; color: #8c4f2b; border: 1px solid #e2c098; }

          /* Scholastic Badge Styles */
          .layer-badge {
            display: inline-block;
            font-size: 8.5px;
            letter-spacing: 0.05em;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            line-height: normal;
            margin-bottom: 6px;
            font-family: 'Inter', sans-serif;
          }

          .matan-badge {
            background-color: #ffe4e6;
            color: #9f1239;
            border: 1px solid #fecdd3;
          }

          .syarah-badge {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
          }

          .hasyiyah-badge {
            background-color: #ede9fe;
            color: #5b21b6;
            border: 1px solid #ddd6fe;
          }

          .taliq-badge {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }

          /* Kitab Kuning Theme Scholastic Badges OVERRIDES */
          .kitab-kuning-theme .matan-badge {
            background-color: #f5e3ca !important;
            color: #7c2d12 !important;
            border: 1px solid #e7c595 !important;
          }

          .kitab-kuning-theme .syarah-badge {
            background-color: #ecf3e6 !important;
            color: #224d1a !important;
            border: 1px solid #cbdcb8 !important;
          }

          .kitab-kuning-theme .hasyiyah-badge {
            background-color: #eae6f3 !important;
            color: #3b1e6e !important;
            border: 1px solid #c9bde4 !important;
          }

          .kitab-kuning-theme .taliq-badge {
            background-color: #f7eded !important;
            color: #822222 !important;
            border: 1px solid #eababa !important;
          }

          /* Layers Formatting */
          .layer-matan {
            border: 1px solid #fda4af;
            background-color: #fff1f2;
            border-radius: 6px;
            padding: 10px;
            margin-top: 10px;
            direction: rtl;
            text-align: right;
          }

          .kitab-kuning-theme .layer-matan {
            border: 1px solid #e7bd8c !important;
            background-color: #fcf9f2 !important;
          }

          .arabic-text-serif {
            font-family: 'Scheherazade New', 'Amiri', serif;
            font-size: 22px;
            font-weight: bold;
            line-height: 1.8;
            display: block;
            color: #9f1239;
          }

          .kitab-kuning-theme .arabic-text-serif {
            color: #7c2d12 !important;
          }

          .layer-syarah {
            border-right: 4px solid #10b981;
            background-color: #f0fdf4;
            border-radius: 0 6px 6px 0;
            padding: 10px;
            margin-top: 8px;
            text-align: left;
            direction: ltr;
          }

          .kitab-kuning-theme .layer-syarah {
            border-right: 4px solid #9e6f3b !important;
            background-color: #fbf9f4 !important;
          }

          .layer-hasyiyah {
            border-right: 4px solid #8b5cf6;
            background-color: #f5f3ff;
            border-radius: 0 6px 6px 0;
            padding: 10px;
            margin-top: 8px;
            text-align: left;
            direction: ltr;
          }

          .kitab-kuning-theme .layer-hasyiyah {
            border-right: 4px solid #7c51a5 !important;
            background-color: #f8f6f0 !important;
          }

          .layer-taliq {
            border-right: 4px solid #f59e0b;
            background-color: #fffbeb;
            border-radius: 0 6px 6px 0;
            padding: 8px 10px;
            margin-top: 8px;
            text-align: left;
            direction: ltr;
          }

          .kitab-kuning-theme .layer-taliq {
            border-right: 4px solid #b85b30 !important;
            background-color: #faf6ed !important;
          }

          .commentary-text {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
            color: #374151;
          }

          .kitab-kuning-theme .commentary-text {
            color: #4a2f1b !important;
          }

          .translation-full {
            font-size: 13px;
            color: #374151;
            font-family: sans-serif;
            direction: ltr;
            text-align: left;
            background: #f1f5f9;
            padding: 8px;
            border-left: 3.5px solid #10b981;
            margin-top: 10px;
            border-radius: 4px;
          }
          
          .kitab-kuning-theme .translation-full {
            background-color: #f7f3e8 !important;
            border-left: 4.5px solid #a3754c !important;
            color: #4a2f1b !important;
          }
        </style>
      </head>
      <body class="${useKitabKuningStyle ? 'kitab-kuning-theme' : ''}">
        <div class="container">
          <h1>${project.title}</h1>
          <div class="meta">Oleh: ${project.author}</div>
          
          ${chaptersToExport.map(ch => `
            <div class="chapter">
              <h2 class="chapter-title">${ch.title}</h2>
              ${ch.sections.map(sec => `
                <div class="section">
                  <h3 class="section-title">${sec.title}</h3>
                  ${sec.lines.map(line => `
                    <div class="line">
                      <div class="arabic-container">
                        ${(line.words && line.words.length > 0 && exportShowMakna) ? 
                          line.words.map(w => `
                            <div class="word-block">
                              <span class="arabic-word">${w.arabic}</span>
                              ${(exportShowSymbols && w.symbol) ? `<span class="symbol-badge">${w.symbol}</span>` : ""}
                              <span class="makna-jenggot">${w.makna || ""}</span>
                            </div>
                          `).join("") 
                          : `<span style="font-size: 24px; font-weight: bold; font-family: 'Scheherazade New', 'Amiri', serif;">${line.arabicFull}</span>`
                        }
                      </div>

                      ${(exportShowTranslation && line.translationFull) ? `
                        <div class="translation-full">
                          <strong>Makna:</strong> ${line.translationFull}
                        </div>
                      ` : ""}

                      ${showMatan && line.matan ? `
                        <div class="layer-matan">
                          <span class="layer-badge matan-badge">MATAN</span>
                          <span class="arabic-text-serif" dir="rtl">${line.matan}</span>
                        </div>
                      ` : ""}

                      ${showSyarah && (line.syarah || line.notes) ? `
                        <div class="layer-syarah">
                          <span class="layer-badge syarah-badge">SYARAH</span>
                          <p class="commentary-text">${line.syarah || line.notes}</p>
                        </div>
                      ` : ""}

                      ${showHasyiyah && line.hasyiyah ? `
                        <div class="layer-hasyiyah">
                          <span class="layer-badge hasyiyah-badge">HASYIYAH</span>
                          <p class="commentary-text">${line.hasyiyah}</p>
                        </div>
                      ` : ""}

                      ${showTaliq && line.taliq ? `
                        <div class="layer-taliq">
                          <span class="layer-badge taliq-badge">TA'LIQ</span>
                          <p class="commentary-text">${line.taliq}</p>
                        </div>
                      ` : ""}
                    </div>
                  `).join("")}
                </div>
              `).join("")}
            </div>
          `).join("")}
        </div>
      </body>
      </html>
    `;
  }

  // --- Search computation ---
  // Subline word level matching based on diacritics ignoring keyword matching
  const matchingDictionary = dictionary.filter(item => {
    if (!kamusSearch.trim()) return kamusFilterCategory === "Semua" ? true : item.category === kamusFilterCategory;
    const strippedSearch = stripDiacritics(kamusSearch).toLowerCase();
    const strippedKeyword = stripDiacritics(item.keyword).toLowerCase();
    const matchTranslation = item.translation.toLowerCase().includes(strippedSearch);
    const matchKeyword = strippedKeyword.includes(strippedSearch);
    
    const categoryMatch = kamusFilterCategory === "Semua" || item.category === kamusFilterCategory;
    return (matchTranslation || matchKeyword) && categoryMatch;
  });

  // Global project level diacritics ignore search for lines
  const matchingLineSearchResults: Array<{ chapterTitle: string; sectionTitle: string; line: KitabLine }> = [];
  if (kitabSearch.trim().length >= 2) {
    const cleanQuery = stripDiacritics(kitabSearch).toLowerCase();
    project.chapters.forEach(ch => {
      ch.sections.forEach(sec => {
        sec.lines.forEach(line => {
          const cleanLineArabic = stripDiacritics(line.arabicFull).toLowerCase();
          const matchArabic = cleanLineArabic.includes(cleanQuery);
          const matchTranslation = line.translationFull.toLowerCase().includes(cleanQuery);
          const matchNotes = line.notes.toLowerCase().includes(cleanQuery);
          if (matchArabic || matchTranslation || matchNotes) {
            matchingLineSearchResults.push({
              chapterTitle: ch.title,
              sectionTitle: sec.title,
              line
            });
          }
        });
      });
    });
  }

  // Categories list
  const uniqueCategories = ["Semua", ...Array.from(new Set(dictionary.map(i => i.category || "Umum")))];

  // Statistics
  const totalChapters = project.chapters.length;
  const totalSections = project.chapters.reduce((acc, ch) => acc + ch.sections.length, 0);
  const totalLines = project.chapters.reduce((acc, ch) => acc + ch.sections.reduce((sAcc, s) => sAcc + s.lines.length, 0), 0);
  
  const totalArabicWords = project.chapters.reduce((acc, ch) => 
    acc + ch.sections.reduce((sAcc, s) => 
      sAcc + s.lines.reduce((lAcc, l) => {
        if (l.words && l.words.length > 0) return lAcc + l.words.length;
        // fallback to split spacing
        return lAcc + l.arabicFull.trim().split(/\s+/).filter(Boolean).length;
      }, 0)
    , 0)
  , 0);

  const activeChapterArabicWords = currentChapter
    ? currentChapter.sections.reduce((sAcc, s) => 
        sAcc + s.lines.reduce((lAcc, l) => {
          if (l.words && l.words.length > 0) return lAcc + l.words.length;
          return lAcc + l.arabicFull.trim().split(/\s+/).filter(Boolean).length;
        }, 0)
      , 0)
    : 0;

  return (
    <div id="app-root" className="flex flex-col h-screen w-full bg-[#0d0d0d] text-zinc-350 font-sans overflow-hidden border border-zinc-900 leading-normal select-none">
      
      {/* Top Main Navigation Header */}
      <header id="header-bar" className="flex items-center justify-between px-5 py-3.5 bg-[#151515] border-b border-zinc-900 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-emerald-600 flex items-center justify-center text-white font-serif text-2xl font-bold shadow-inner shadow-black/30">
            ك
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-zinc-100 font-sans">
                Kitab Scribe Pro
              </h1>
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-950/60 border border-emerald-900/60 rounded px-1 text-center py-0.2 tracking-widest uppercase">
                Offline
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-tight">
              {project.title} — {project.author || "Anonim"}
            </p>
          </div>
        </div>

        {/* Global Toolbar Commands */}
        <div className="flex items-center gap-3.5 text-xs text-zinc-400">
          <button
            id="btn-edit-metadata"
            onClick={() => {
              setProjectTitleInput(project.title);
              setProjectAuthorInput(project.author);
              setProjectDescInput(project.description);
              setIsEditingProjectMeta(!isEditingProjectMeta);
            }}
            className="hover:text-emerald-400 font-medium transition-colors cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900/40 border border-zinc-800"
            title="Edit info, judul, dan pengarang kitab utama"
          >
            <Info size={13} />
            <span>Info Kitab</span>
          </button>

          <button
            id="btn-load-sample"
            onClick={handleResetToDefaults}
            className="hover:text-amber-500 font-medium transition-colors cursor-pointer flex items-center gap-1 bg-zinc-900/20 px-2 py-1 border border-zinc-900/60 hover:border-amber-900/40 rounded"
            title="Kembalikan file sampel bawaan saku Al-Ajurrumiyyah"
          >
            <RefreshCw size={12} />
            <span>Reset Contoh</span>
          </button>

          {/* Hidden file selectors */}
          <input
            type="file"
            accept=".kitab,application/json"
            className="hidden"
            ref={fileLoaderRef}
            onChange={handleImportProjectFile}
          />
          <button
            id="btn-import-kitab"
            onClick={() => fileLoaderRef.current?.click()}
            className="hover:text-sky-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
            title="Unggah berkas *.kitab dari komputer Anda"
          >
            <FileUp size={14} />
            <span>Impor .kitab</span>
          </button>

          <button
            id="btn-export-kitab"
            onClick={downloadProjectAsFile}
            className="hover:text-emerald-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
            title="Unduh seluruh naskah tulisan dalam format berkas tunggal .kitab"
          >
            <FileDown size={14} />
            <span>Simpan (.kitab)</span>
          </button>

          <button
            id="btn-export-pro"
            onClick={() => setShowExportModal(true)}
            className="hover:text-amber-400 font-medium transition-colors cursor-pointer flex items-center gap-1 bg-amber-950/30 border border-amber-900/40 px-2 py-1.5 rounded hover:bg-amber-900/20"
            title="Ekspor tulisan ke PDF / Word (.docx) / HTML secara profesional"
          >
            <Download size={13} />
            <span>Ekspor Dokumen</span>
          </button>
        </div>

        {/* Global actions: Save button & Preferences */}
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 gap-0.5">
            <button
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className={`p-1.5 rounded transition cursor-pointer ${showLeftSidebar ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Toggle Panel Struktur Kitab (Sidebar Kiri)"
            >
              {showLeftSidebar ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            </button>
            <button
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className={`p-1.5 rounded transition cursor-pointer ${showRightSidebar ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Toggle Panel Referensi Kamus (Sidebar Kanan)"
            >
              {showRightSidebar ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          </div>

          <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5">
            <button
              onClick={() => setSplitViewMode(false)}
              className={`p-1.5 rounded transition ${!splitViewMode ? "bg-zinc-800 text-emerald-400" : "hover:text-zinc-300"}`}
              title="Tampilan Fokus Buku & Editor"
            >
              <BookOpen size={14} />
            </button>
            <button
              onClick={() => setSplitViewMode(true)}
              className={`p-1.5 rounded transition ${splitViewMode ? "bg-zinc-800 text-emerald-400" : "hover:text-zinc-300"}`}
              title="Tampilan Split: Editor Kiri, Terjemahan Kanan"
            >
              <Columns size={14} />
            </button>
          </div>

          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100"
            title="Konfigurasi Ukuran & Tampilan"
          >
            <Sliders size={14} />
          </button>

          <button
            onClick={() => saveToLocalStorage()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded shadow-md cursor-pointer transition-all"
            title="Simpan proyek saat ini ke memori permanen browser"
          >
            <Save size={14} />
            <span>Simpan</span>
          </button>
        </div>
      </header>

      {/* Main Body Grid */}
      <div id="main-frame" className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR LEFT: Bab & Fasal Explorer */}
        <AnimatePresence initial={false}>
          {showLeftSidebar && (
            <motion.aside
              id="sidebar-left"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-[#111111] border-r border-zinc-900 flex flex-col select-none overflow-hidden h-full shrink-0"
            >
              <div className="w-64 h-full flex flex-col shrink-0">
          
          {/* Chapter Actions */}
          <div className="p-4 border-b border-zinc-900">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center justify-between">
              <span>Struktur Kitab</span>
              <span className="text-[9px] text-emerald-500 font-mono tracking-normal capitalize">
                {totalChapters} Bab / {totalSections} Fasal
              </span>
            </h2>
            
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Tambah Bab Baru..."
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="flex-1 bg-[#161616] border border-zinc-800/80 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:border-emerald-600 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddChapter()}
              />
              <button
                onClick={handleAddChapter}
                className="p-1.5 rounded bg-emerald-950 border border-emerald-900 hover:bg-emerald-900 text-emerald-400 transition"
                title="Masukkan Bab Baru"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Hierarchy Directory List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {project.chapters.length === 0 ? (
              <p className="text-xs text-zinc-650 italic text-center p-4">Kitab belum memiliki bab.</p>
            ) : (
              project.chapters.map((ch, chIdx) => {
                const isChActive = ch.id === activeChapterId;
                return (
                  <div key={ch.id} className="space-y-1">
                    {/* Chapter Header */}
                    <div
                      onClick={() => {
                        setActiveChapterId(ch.id);
                        if (ch.sections.length > 0) {
                          setActiveSectionId(ch.sections[0].id);
                          if (ch.sections[0].lines.length > 0) {
                            setActiveLineId(ch.sections[0].lines[0].id);
                          } else {
                            setActiveLineId("");
                          }
                        } else {
                          setActiveSectionId("");
                          setActiveLineId("");
                        }
                      }}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                        isChActive
                          ? "bg-zinc-800/60 text-white border-l-2 border-emerald-500"
                          : "hover:bg-zinc-900/40 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] text-emerald-500 font-mono">#{chIdx + 1}</span>
                        <span className="text-xs font-semibold truncate uppercase">{ch.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteChapter(ch.id, e)}
                        className="p-1 text-zinc-600 hover:text-red-400 transition opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                        title="Hapus Bab ini"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Section subsections */}
                    {isChActive && (
                      <div className="pl-4 pr-1.5 space-y-1 py-1 border-l border-zinc-900 ml-3">
                        {ch.sections.map((sec, secIdx) => {
                          const isSecActive = sec.id === activeSectionId;
                          return (
                            <div
                              key={sec.id}
                              onClick={() => {
                                setActiveSectionId(sec.id);
                                if (sec.lines.length > 0) {
                                  setActiveLineId(sec.lines[0].id);
                                } else {
                                  setActiveLineId("");
                                }
                              }}
                              className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs transition ${
                                isSecActive
                                  ? "bg-zinc-900 text-zinc-200 border border-zinc-800"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              <span className="text-[10.5px] truncate flex items-center gap-1.5">
                                <span className={isSecActive ? "text-emerald-500" : "text-zinc-700"}>◈</span>
                                <span className="truncate">{sec.title}</span>
                              </span>
                              <button
                                onClick={(e) => handleDeleteSection(sec.id, e)}
                                className="p-0.5 text-zinc-700 hover:text-red-400 transition"
                                title="Hapus Fasal/Sub-bab"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          );
                        })}

                        {/* Add Fasal box under current active chapter */}
                        <div className="flex gap-1.5 pt-1.5">
                          <input
                            type="text"
                            placeholder="Fasal baru..."
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            className="w-full bg-[#161616] border border-zinc-800/80 rounded px-2 py-1 text-[11px] text-zinc-100 focus:outline-none"
                            onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
                          />
                          <button
                            onClick={handleAddSection}
                            className="px-1.5 py-1 text-[10px] bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded"
                            title="Konfirmasi tambah fasal"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-zinc-900 flex justify-center bg-zinc-950/20">
            <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-900 w-full text-[10px] space-y-1.5 leading-relaxed text-zinc-500 font-sans">
              <span className="text-emerald-500 font-bold uppercase tracking-wider block mb-1">
                Pintasan Penting
              </span>
              <div className="flex justify-between border-b border-zinc-900/60 pb-1">
                <span>Fathah (َ)</span>
                <span className="text-zinc-400 font-mono">Ctrl+B</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-1">
                <span>Kasrah (ِ)</span>
                <span className="text-zinc-400 font-mono">Ctrl+Shift+B</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-1">
                <span>Dammah (ُ)</span>
                <span className="text-zinc-400 font-mono">Ctrl+D</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-1">
                <span>Sukun (ْ)</span>
                <span className="text-zinc-400 font-mono">Ctrl+Shift+D</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-1">
                <span>Tasydid (ّ)</span>
                <span className="text-zinc-400 font-mono">Ctrl+T</span>
              </div>
              <div className="flex justify-between">
                <span>Simpan (.kitab)</span>
                <span className="text-zinc-400 font-mono">Ctrl+Shift+S</span>
              </div>
            </div>
          </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* AREA TENGAH: Editor Utama & Workspace */}
        <main className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
          
          {/* Preferences Sub-drawer */}
          {showPreferences && (
            <div className="p-4 bg-[#141414] border-b border-zinc-900 flex flex-wrap items-center justify-between gap-4 text-xs animate-slideDown">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Ukuran Teks Arab:</span>
                  <input
                    type="range"
                    min="20"
                    max="48"
                    value={config.fontSizeArabic}
                    onChange={(e) => setConfig({ ...config, fontSizeArabic: Number(e.target.value) })}
                    className="w-24 accent-emerald-500"
                  />
                  <span className="text-emerald-400 font-mono">{config.fontSizeArabic}px</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Ukuran Terjemah:</span>
                  <input
                    type="range"
                    min="11"
                    max="18"
                    value={config.fontSizeTranslation}
                    onChange={(e) => setConfig({ ...config, fontSizeTranslation: Number(e.target.value) })}
                    className="w-24 accent-emerald-500"
                  />
                  <span className="text-emerald-400 font-mono">{config.fontSizeTranslation}px</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showWordMakna}
                    onChange={(e) => setConfig({ ...config, showWordMakna: e.target.checked })}
                    className="rounded border-zinc-850 text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-25"
                  />
                  <span className="text-zinc-400 font-medium">Tampilkan Makna Per-kata (Jenggot)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showFullTranslation}
                    onChange={(e) => setConfig({ ...config, showFullTranslation: e.target.checked })}
                    className="rounded border-zinc-850 text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-25"
                  />
                  <span className="text-zinc-400 font-medium">Tampilkan Terjemahan Penuh</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showNotes}
                    onChange={(e) => setConfig({ ...config, showNotes: e.target.checked })}
                    className="rounded border-zinc-850 text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-25"
                  />
                  <span className="text-zinc-400 font-medium">Tampilkan Struktur Syarah & Catatan</span>
                </label>

                {config.showNotes && (
                  <div className="pl-5 space-y-2 border-l border-zinc-800 flex flex-col pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={config.showMatan !== false}
                        onChange={(e) => setConfig({ ...config, showMatan: e.target.checked })}
                        className="rounded border-zinc-850 text-amber-500 focus:ring-amber-500 focus:ring-opacity-25"
                      />
                      <span className="text-zinc-450">Tampilkan Matan (متن)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={config.showSyarah !== false}
                        onChange={(e) => setConfig({ ...config, showSyarah: e.target.checked })}
                        className="rounded border-zinc-850 text-emerald-500 focus:ring-emerald-500 focus:ring-opacity-25"
                      />
                      <span className="text-zinc-455">Tampilkan Syarah (شرح)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={config.showHasyiyah !== false}
                        onChange={(e) => setConfig({ ...config, showHasyiyah: e.target.checked })}
                        className="rounded border-zinc-850 text-indigo-500 focus:ring-indigo-500 focus:ring-opacity-25"
                      />
                      <span className="text-zinc-455">Tampilkan Hasyiyah (حاشية)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={config.showTaliq !== false}
                        onChange={(e) => setConfig({ ...config, showTaliq: e.target.checked })}
                        className="rounded border-zinc-850 text-rose-500 focus:ring-rose-500 focus:ring-opacity-25"
                      />
                      <span className="text-zinc-455">Tampilkan Ta'liq (تعليق)</span>
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPreferences(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1"
              >
                <X size={13} />
                <span>Tutup Panel</span>
              </button>
            </div>
          )}

          {/* Project Info Edit Form (Modal Overlay style) */}
          {isEditingProjectMeta && (
            <div className="p-4 bg-[#141414] border-b border-zinc-900 text-xs max-h-56 overflow-y-auto space-y-3">
              <p className="font-bold text-zinc-200">INFORMASI TATA LETAK & PROFIL KITAB</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500">Judul Kitab Utama:</span>
                  <input
                    type="text"
                    value={projectTitleInput}
                    onChange={(e) => setProjectTitleInput(e.target.value)}
                    className="bg-[#1b1b1b] border border-zinc-800 rounded px-2.5 py-1.5 focus:border-emerald-600 text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500">Pengarang/Kolektor:</span>
                  <input
                    type="text"
                    value={projectAuthorInput}
                    onChange={(e) => setProjectAuthorInput(e.target.value)}
                    className="bg-[#1b1b1b] border border-zinc-800 rounded px-2.5 py-1.5 focus:border-emerald-600 text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500">Deskripsi Ringkat/Khasiat:</span>
                  <input
                    type="text"
                    value={projectDescInput}
                    onChange={(e) => setProjectDescInput(e.target.value)}
                    className="bg-[#1b1b1b] border border-zinc-800 rounded px-2.5 py-1.5 focus:border-emerald-600 text-zinc-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsEditingProjectMeta(false)}
                  className="px-3 py-1.5 border border-zinc-800 rounded text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveProjectMeta}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-semibold"
                >
                  Terapkan Perubahan
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE WORKSPACE GRID */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT SPLIT (Visible in Split Mode or default view): Books Visualizer / Preview */}
            <div className={`flex flex-col flex-1 ${splitViewMode ? "border-r border-zinc-900" : ""} overflow-hidden`}>
              
              {/* Context Selector Bar */}
              <div className="bg-[#101010] border-b border-zinc-900 px-4 py-2 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-300">Kitab Asli:</span>
                  <span>{currentChapter?.title || "Draf Utama"}</span>
                  {currentSection && (
                    <>
                      <ChevronRight size={13} className="text-zinc-700" />
                      <span className="text-emerald-500">{currentSection.title}</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddEmptyLine}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/60 rounded text-[10px] font-bold"
                    title="Tambah baris tulisan di bagian bawah fasal ini"
                  >
                    <Plus size={11} />
                    <span>Baris Teks</span>
                  </button>
                </div>
              </div>

              {/* Book Viewer (Kitab Yellowish Paper Aesthetic but adjusted to Dark Theme gracefully) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-[#0a0a0a] scrollbar-thin scrollbar-thumb-zinc-800">
                {currentLinesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-800 rounded-lg p-6 text-center">
                    <p className="text-sm text-zinc-500 mb-2">Fasal ini tidak mengandung baris teks.</p>
                    <button
                      onClick={handleAddEmptyLine}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-semibold transition"
                    >
                      Mulai Tulis Baris Pertama
                    </button>
                  </div>
                ) : (
                  currentLinesList.map((line, lIdx) => {
                    const isLineSelected = line.id === activeLineId;
                    return (
                      <div
                        key={line.id}
                        id={`viewport-line-${line.id}`}
                        onClick={() => setActiveLineId(line.id)}
                        className={`group relative p-6 bg-[#111111]/90 rounded border transition-all cursor-pointer ${
                          isLineSelected
                            ? "border-emerald-600 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-900/20"
                            : "border-zinc-900 hover:border-zinc-850 hover:bg-[#121212]"
                        }`}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -left-3 flex flex-col gap-1.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isLineSelected ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-500"
                          }`} title={`Urutan ke-${lIdx+1}`}>
                            {lIdx + 1}
                          </span>
                        </div>

                        {/* Traditional Arabic Sublinear / Makna Jenggot Layout */}
                        {config.showWordMakna && line.words && line.words.length > 0 ? (
                          <div
                            className="w-full text-right leading-[4.5rem] flex flex-wrap flex-row-reverse justify-start items-end pb-4"
                            dir="rtl"
                          >
                            {line.words.map((w, wIdx) => (
                              <div
                                key={w.id}
                                className="inline-flex flex-col items-center mx-2.5 my-2.5 relative select-all group/word"
                              >
                                {/* Arabic Display word */}
                                <span
                                  className="font-serif leading-none text-zinc-100 group-hover/word:text-emerald-400 select-all font-medium whitespace-nowrap"
                                  style={{ fontSize: `${config.fontSizeArabic}px` }}
                                >
                                  {w.arabic}
                                </span>
                                
                                {/* Annotation lines */}
                                <div className="flex flex-col items-center select-none" dir="ltr">
                                  {w.symbol && (
                                    <span className="text-[10px] px-1 bg-zinc-900 text-emerald-400 font-mono rounded border border-zinc-800/60 font-semibold mb-0.5 leading-none py-0.5" title={`Kedudukan irab Nahwu: ${w.symbol}`}>
                                      {w.symbol}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-[#8e8d8d] font-sans whitespace-nowrap text-center max-w-[130px] overflow-hidden text-ellipsis italic tracking-tight leading-3">
                                    {w.makna || ""}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Full continuous Arabic rendering without separation
                          <p
                            className="text-right text-zinc-100 font-serif leading-loose font-medium select-all"
                            dir="rtl"
                            style={{ fontSize: `${config.fontSizeArabic}px` }}
                          >
                            {line.arabicFull}
                          </p>
                        )}

                        {/* Separator line when selected */}
                        {isLineSelected && (
                          <div className="h-px bg-zinc-850 my-3"></div>
                        )}

                        {/* Ind Indonesia or translation annotations */}
                        {config.showFullTranslation && (
                          <div className="text-zinc-400 mt-2.5 flex items-start gap-2" dir="ltr">
                            <span className="text-[10px] uppercase font-semibold text-emerald-600 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.2 rounded mt-0.5">
                              ID
                            </span>
                            <p
                              style={{ fontSize: `${config.fontSizeTranslation}px` }}
                              className="font-sans leading-relaxed text-zinc-300"
                            >
                              {line.translationFull || <span className="text-zinc-600 italic">Belum ada terjemahan penuh...</span>}
                            </p>
                          </div>
                        )}

                        {/* Scholastic structure layers (Matan, Syarah, Hasyiyah, Ta'liq) */}
                        {config.showNotes && (
                          <div className="mt-2 space-y-2 border-t border-zinc-900 pt-2 flex flex-col gap-1.5" dir="ltr">
                            {/* 1. Matan */}
                            {((config.showMatan !== false) && line.matan) && (
                              <div className="text-xs flex items-start gap-2">
                                <span className="text-[9px] tracking-wider font-extrabold text-amber-500 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded leading-none mt-0.5">
                                  MATAN
                                </span>
                                <p className="font-sans leading-relaxed text-amber-200/90 font-medium">
                                  {line.matan}
                                </p>
                              </div>
                            )}

                            {/* 2. Syarah (fallback to notes if syarah is not populated yet) */}
                            {((config.showSyarah !== false) && (line.syarah || line.notes)) && (
                              <div className="text-xs flex items-start gap-2">
                                <span className="text-[10px] tracking-wider font-extrabold text-emerald-500 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded leading-none mt-0.5">
                                  SYARAH
                                </span>
                                <p className="font-sans leading-relaxed text-zinc-350">
                                  {line.syarah || line.notes}
                                </p>
                              </div>
                            )}

                            {/* 3. Hasyiyah */}
                            {((config.showHasyiyah !== false) && line.hasyiyah) && (
                              <div className="text-xs flex items-start gap-2 pl-2 border-l border-indigo-900/60 bg-indigo-950/10 py-1 rounded">
                                <span className="text-[9px] tracking-wider font-extrabold text-indigo-400 bg-indigo-950/50 border border-indigo-900/40 px-1.5 py-0.5 rounded leading-none mt-0.5">
                                  HASYIYAH
                                </span>
                                <p className="font-sans italic leading-relaxed text-zinc-400">
                                  {line.hasyiyah}
                                </p>
                              </div>
                            )}

                            {/* 4. Ta'liq */}
                            {((config.showTaliq !== false) && line.taliq) && (
                              <div className="text-[11px] flex items-start gap-2 bg-rose-950/5 py-1 px-1 rounded border border-rose-950/10">
                                <span className="text-[8px] tracking-wider font-extrabold text-rose-400 bg-rose-950/30 border border-rose-900/30 px-1.5 py-0.5 rounded leading-none mt-0.5">
                                  TA'LIQ
                                </span>
                                <p className="font-sans leading-relaxed text-zinc-500 italic">
                                  {line.taliq}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteLine(line.id, e)}
                            className="p-1 px-1.5 rounded bg-zinc-900 text-zinc-650 hover:text-red-400 border border-zinc-800 transition"
                            title="Hapus baris"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SPLIT ZONE 2: Dedicated Editing Workbench */}
            {(!splitViewMode || activeLineId) && (
              <div className="w-[450px] bg-[#111111] border-l border-zinc-900 flex flex-col overflow-y-auto">
                
                {/* Header of editing panel */}
                <div className="bg-[#141414] border-b border-zinc-900 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 size={15} className="text-emerald-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                      Editor Baris Aktif
                    </h3>
                  </div>
                  {activeLineId && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Line ID: {activeLineId.substring(0, 8)}...
                    </span>
                  )}
                </div>

                {/* Main Content scroll of editing */}
                {activeLineId ? (
                  <div className="p-4 space-y-5">
                    
                    {/* Arabic Text Form */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-semibold text-zinc-400">Kalimat Arab Utama (Tanpa/Dengan Syakal)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setLineArabicInput(stripDiacritics(lineArabicInput));
                            showNotif("Harakat dinonaktifkan dari baris input", "info");
                          }}
                          className="text-[10px] text-red-400 hover:underline"
                          title="Melucuti harakat untuk memudahkan pengolahan pencarian"
                        >
                          Hapus Harakat
                        </button>
                      </div>

                      <div className="relative">
                        <textarea
                          ref={arabicInputRef}
                          value={lineArabicInput}
                          onChange={(e) => setLineArabicInput(e.target.value)}
                          placeholder="الْكَلَامُ هُوَ اللَّفْظُ الْمُرَكَّبُ..."
                          className="w-full bg-[#161616] border border-zinc-800/80 rounded p-3 text-right font-serif leading-relaxed text-2xl text-zinc-100 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          rows={4}
                          dir="rtl"
                        />
                      </div>
                    </div>

                    {/* Transliteration typing buffer helper */}
                    <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-emerald-500">Transliterasi Latin → Arab instan</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isTransliterating}
                            onChange={(e) => setIsTransliterating(e.target.checked)}
                            className="rounded-sm bg-zinc-900 border-zinc-800 text-emerald-500 w-3 h-3"
                          />
                          <span className="text-[10px] text-zinc-400 font-semibold select-none">Aktifkan</span>
                        </label>
                      </div>
                      
                      {isTransliterating && (
                        <div className="space-y-2 pt-1 animate-slideDown">
                          <input
                            type="text"
                            placeholder="Ketik disini (cth: 'ism', 'bismillah', 'ts', 'kh')"
                            value={latinInputBuf}
                            onChange={(e) => setLatinInputBuf(e.target.value)}
                            className="w-full bg-[#202020] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-emerald-500"
                          />
                          {arabicConvertedBuf && (
                            <div className="flex items-center justify-between gap-2 p-1.5 bg-[#17251a] border border-[#1b3f21]/40 rounded">
                              <span className="text-xs text-zinc-500">Hasil:</span>
                              <span className="font-serif text-lg text-emerald-400 font-bold" dir="rtl">{arabicConvertedBuf}</span>
                              <button
                                type="button"
                                onClick={handleInsertConvertedArabic}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] text-white font-bold"
                              >
                                Sisipkan
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Integrated mini syakal keyboard */}
                    <ToolbarArabic
                      onInsertChar={handleInsertChar}
                      isTransliterating={isTransliterating}
                      onToggleTransliteration={() => setIsTransliterating(!isTransliterating)}
                      onTriggerWordBreakdown={triggerAiWordBreakdown}
                      isProcessingBreakdown={apiLoading && apiType === "breakdown"}
                    />

                    {/* Full Translation Form */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-zinc-400">Terjemahan Penuh (Bahasa Indonesia / Pegon)</label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => triggerAiTranslation(false)}
                            disabled={apiLoading}
                            className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                            title="Menerjemahkan bahasa Arab atas bantuan Gemini AI"
                          >
                            <Languages size={10} />
                            <span>Terjemah Indonesia (AI)</span>
                          </button>
                          <span className="text-zinc-700">|</span>
                          <button
                            type="button"
                            onClick={() => triggerAiTranslation(true)}
                            disabled={apiLoading}
                            className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                            title="Menerjemahkan ke Arab Pegon Jenggot"
                          >
                            <Sparkles size={10} />
                            <span>Pegon (AI)</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={lineTranslationInput}
                        onChange={(e) => setLineTranslationInput(e.target.value)}
                        placeholder="Masukkan naskah terjemahan komparasi lengkap..."
                        className="w-full bg-[#161616] border border-zinc-800/80 rounded p-2.5 text-xs text-zinc-200 focus:border-emerald-600 focus:outline-none"
                        rows={2}
                      />
                    </div>

                    {/* Scholastic Commentary Layers Form */}
                    <div className="space-y-3.5 border-t border-zinc-900 pt-3">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block">
                        Kategori & Struktur Syarah (Kitab Kuning)
                      </span>

                      {/* 1. Matan */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] tracking-wider font-extrabold text-amber-500 bg-amber-950/40 border border-amber-900/40 px-1 py-0.2 rounded leading-none">
                            MATAN (متن)
                          </span>
                          <span className="text-[10px] text-zinc-500">Teks dasar/inti yang dirujuk</span>
                        </div>
                        <input
                          type="text"
                          value={lineMatanInput}
                          onChange={(e) => setLineMatanInput(e.target.value)}
                          placeholder="Kutipan ungkapan pokok dari teks mukhtashar/matan..."
                          className="w-full bg-[#161616] border border-zinc-800/80 rounded p-2 text-xs text-zinc-200 focus:border-amber-600 focus:outline-none"
                        />
                      </div>

                      {/* 2. Syarah */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] tracking-wider font-extrabold text-emerald-500 bg-emerald-950/40 border border-emerald-900/40 px-1 py-0.2 rounded leading-none">
                            SYARAH (شرح)
                          </span>
                          <span className="text-[10px] text-zinc-500">Uraian ulasan penjelas utama</span>
                        </div>
                        <textarea
                          value={lineNotesInput}
                          onChange={(e) => setLineNotesInput(e.target.value)}
                          placeholder="Penjelasan gramatika, makna luas, pandangan madzhab dll..."
                          className="w-full bg-[#161616] border border-zinc-800/80 rounded p-2 text-xs text-zinc-205 focus:border-emerald-600 focus:outline-none"
                          rows={2}
                        />
                      </div>

                      {/* 3. Hasyiyah */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] tracking-wider font-extrabold text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-1 py-0.2 rounded leading-none">
                            HASYIYAH (حاشية)
                          </span>
                          <span className="text-[10px] text-zinc-500">Super-komentar / penjelasan mendalam atas Syarah</span>
                        </div>
                        <textarea
                          value={lineHasyiyahInput}
                          onChange={(e) => setLineHasyiyahInput(e.target.value)}
                          placeholder="Catatan tambahan mendalam dari mualif hasyiah (ulasan sekunder)..."
                          className="w-full bg-[#161616] border border-zinc-800/80 rounded p-2 text-xs text-zinc-200 focus:border-indigo-600 focus:outline-none"
                          rows={2}
                        />
                      </div>

                      {/* 4. Ta'liq */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] tracking-wider font-extrabold text-[#f43f5e] bg-rose-955/35 border border-rose-900/40 px-1 py-0.2 rounded leading-none">
                            TA'LIQ (تعليق)
                          </span>
                          <span className="text-[10px] text-zinc-500">Anotasi ringkas / catatan kaki koreksi</span>
                        </div>
                        <input
                          type="text"
                          value={lineTaliqInput}
                          onChange={(e) => setLineTaliqInput(e.target.value)}
                          placeholder="Tanda korektif, ringkasan margin, atau catatan kaki..."
                          className="w-full bg-[#161616] border border-zinc-800/80 rounded p-2 text-xs text-zinc-200 focus:border-rose-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Sublinear Word breakdowns editor list */}
                    <div className="pt-3 border-t border-zinc-900 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-300">Makna Per-kata Tradisional ({lineWords.length})</span>
                        <div className="text-[10px] text-zinc-500 italic">Mendukung urutan bacaan pesantren</div>
                      </div>

                      {/* Word bubbles grid */}
                      <div className="flex flex-wrap gap-2 py-2">
                        {lineWords.map((node, idx) => {
                          const isWordSelected = idx === editingWordIndex;
                          return (
                            <div
                              key={node.id}
                              className={`p-2 rounded text-xs border flex items-center justify-between gap-2.5 transition ${
                                isWordSelected 
                                  ? "bg-emerald-950/40 border-emerald-500/70"
                                  : "bg-zinc-950/70 border-zinc-850"
                              }`}
                            >
                              <div
                                onClick={() => handleSelectWordForEditing(idx)}
                                className="cursor-pointer space-y-1 text-right"
                                dir="rtl"
                              >
                                <div className="font-serif text-sm font-semibold text-zinc-100 flex items-center gap-1">
                                  <span>{node.arabic}</span>
                                  {node.symbol && (
                                    <span className="text-[8px] tracking-normal font-sans px-1 bg-zinc-900 text-emerald-400 rounded">
                                      {node.symbol}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-450 italic font-sans" dir="ltr">{node.makna || <span className="text-zinc-700">belum dimaknai</span>}</div>
                              </div>

                              <div className="flex flex-col gap-1 items-center border-l border-zinc-850 pl-2">
                                <button
                                  onClick={() => handleDeleteWordNode(idx)}
                                  className="text-[9px] text-[#ef4444] hover:bg-zinc-900 p-0.5 rounded transition"
                                  title="Buang kata"
                                >
                                  <X size={10} />
                                </button>
                                <div className="flex gap-0.5">
                                  <button
                                    onClick={() => handleMoveWordNode(idx, "left")}
                                    className="text-[9px] hover:bg-zinc-900 p-0.5 rounded text-zinc-500 hover:text-zinc-300"
                                    title="Pindahkan ke kiri"
                                  >
                                    <ChevronLeft size={10} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveWordNode(idx, "right")}
                                    className="text-[9px] hover:bg-zinc-900 p-0.5 rounded text-zinc-500 hover:text-zinc-300"
                                    title="Pindahkan ke kanan"
                                  >
                                    <ChevronRight size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setEditingWordIndex(null);
                            setWordArabic("");
                            setWordMakna("");
                            setWordSymbol("");
                          }}
                          className="p-2 border border-dashed border-zinc-800 rounded text-xs text-zinc-500 hover:text-white hover:border-zinc-500 flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>Baru</span>
                        </button>
                      </div>

                      {/* Editing / Inserting chosen word detail */}
                      <div className="bg-[#171717] border border-zinc-850 p-3.5 rounded-xl space-y-3.5 shadow-md">
                        <div className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                          <span>{editingWordIndex !== null ? `Mudarosah Kata #${editingWordIndex + 1}` : "Makna Per Kata (Sublinear)"}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickInputMode(!isQuickInputMode);
                              showNotif(`Mode Input Cepat ${!isQuickInputMode ? "diaktifkan" : "dinonaktifkan"}!`, "info");
                            }}
                            className={`px-2 py-0.5.5 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer outline-none border ${
                              isQuickInputMode
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                            }`}
                            title="Konversi otomatis kode Latin pesantren ke Simbol I'rab Arab secara real-time"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isQuickInputMode ? "bg-emerald-400 animate-ping absolute" : "bg-zinc-500"}`} />
                            {isQuickInputMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative" />}
                            <span>Input Cepat: {isQuickInputMode ? "Aktif" : "Mati"}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 block font-medium">Lafadz Arab:</span>
                            <div className="relative">
                              <input
                                ref={wordArabicRef}
                                type="text"
                                value={wordArabic}
                                onChange={(e) => setWordArabic(e.target.value)}
                                className="w-full bg-[#202020] border border-zinc-805 rounded-lg px-2.5 py-1.5 text-right font-serif text-sm text-zinc-100 placeholder-zinc-700 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/30"
                                dir="rtl"
                                placeholder="کلمة"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 block font-medium">Kedudukan (I'rab/Simbol):</span>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={isQuickInputMode ? "Ketik 'm' + Spasi, dsb." : "cth: م, خ, ف"}
                                value={wordSymbol}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (isQuickInputMode) {
                                    // 1) Space-terminated shorthand check
                                    if (val.endsWith(" ")) {
                                      const trimmed = val.trim().toLowerCase();
                                      if (QUICK_IRAB_MAP[trimmed]) {
                                        setWordSymbol(QUICK_IRAB_MAP[trimmed].char);
                                        showNotif(`Konversi otomatis: ${trimmed} ➜ ${QUICK_IRAB_MAP[trimmed].char} (${QUICK_IRAB_MAP[trimmed].name})`, "success");
                                        return;
                                      }
                                    }
                                  }
                                  setWordSymbol(val);
                                }}
                                className="w-full bg-[#202020] border border-zinc-805 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100 placeholder-zinc-650 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/30 font-medium"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interactive Board/Grid of I'rab Shortcuts when Quick Input is Enabled */}
                        {isQuickInputMode && (
                          <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-lg p-2.5 space-y-2">
                            <div className="flex justify-between items-center text-[9px]">
                              <span className="font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                                <Sparkles size={10} className="text-amber-400 animate-pulse" />
                                <span>Papan Klik Simbol Rab Cepat</span>
                              </span>
                              <span className="text-zinc-600">Klik tombol untuk tempel langsung</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 max-h-[145px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                              {Object.entries(QUICK_IRAB_MAP)
                                .filter(([key]) => ["m", "kh", "f", "maf", "n", "j", "h", "t", "g", "nb", "sh", "jw"].includes(key))
                                .map(([key, item]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      setWordSymbol(item.char);
                                      showNotif(`Simbol I'rab: ${item.char} (${item.name}) diterapkan.`, "success");
                                    }}
                                    className="p-1 px-2 rounded bg-[#1f1f1f]/80 hover:bg-[#252525] border border-zinc-800 hover:border-emerald-500/40 text-left transition flex items-center justify-between cursor-pointer select-none"
                                    title={`${item.desc} - ketik latin "${key}" lalu Spasi`}
                                  >
                                    <span className="text-[10.5px] font-bold text-emerald-400 font-serif leading-none">{item.char}</span>
                                    <div className="text-right">
                                      <span className="text-[7.5px] text-zinc-500 font-bold block leading-none font-mono">[{key}]</span>
                                      <span className="text-[7px] text-zinc-400 transform scale-90 origin-right block leading-none truncate max-w-16 mt-0.5">{item.name}</span>
                                    </div>
                                  </button>
                                ))}
                            </div>
                            <p className="text-[8.5px] text-zinc-500 italic mt-0.5 leading-normal">
                              🧠 <strong className="text-zinc-400">Tips:</strong> Di kolom input Kedudukan di atas, Anda bisa mengetik pintasan seperti <code className="text-amber-400 font-mono font-bold bg-zinc-900 px-0.5 rounded">m</code> atau <code className="text-amber-400 font-mono font-bold bg-zinc-900 px-0.5 rounded">kh</code> lalu tekan tombol <strong className="text-zinc-400">Spasi</strong> untuk konversi otomatis!
                            </p>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-500 block font-medium">Makna Jandul (Jenggot/Indonesia):</span>
                          <input
                            type="text"
                            placeholder="cth: utawi sekabehane puji / segala puji"
                            value={wordMakna}
                            onChange={(e) => setWordMakna(e.target.value)}
                            className="w-full bg-[#202020] border border-zinc-805 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-700/80 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/30"
                          />
                        </div>

                        <div className="flex justify-end gap-2 text-xs">
                          {editingWordIndex !== null && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWordIndex(null);
                                setWordArabic("");
                                setWordMakna("");
                                setWordSymbol("");
                              }}
                              className="px-2.5 py-1 border border-zinc-800 rounded text-zinc-400 hover:text-white"
                            >
                              Batal
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={editingWordIndex !== null ? handleSaveWordNode : handleAddWordNode}
                            className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-bold leading-tight"
                          >
                            {editingWordIndex !== null ? "Simpan Perubahan Kata" : "Tambah Kata"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Final Line Action Bar */}
                    <div className="pt-2">
                      <button
                        onClick={handleSaveActiveLine}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow flex items-center justify-center gap-2 transition"
                      >
                        <Check size={16} />
                        <span>Simpan Baris Naskah Klasik</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-600 italic space-y-2">
                    <p className="text-xs">Pilih salah satu baris paragraf kitab di panel kiri/tengah untuk memuat perkakas editor.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* SIDEBAR RIGHT: Kamus Offline & Pencarian */}
        <AnimatePresence initial={false}>
          {showRightSidebar && (
            <motion.aside
              id="sidebar-right"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-[#111111] border-l border-zinc-900 flex flex-col select-none overflow-hidden h-full shrink-0"
            >
              <div className="w-[340px] h-full flex flex-col shrink-0">
            
            {/* Nav tabs for search tool (Kamus vs Naskah search) */}
            <div className="p-4 border-b border-zinc-900 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <BookMarked size={14} className="text-emerald-500" />
                  <span>Referensi & Kamus Pintar</span>
                </h2>
                
                <span className="text-[10px] text-zinc-650 italic">
                  {dictionary.length} entri terdaftar
                </span>
              </div>

              {/* Keyword text search ignoring diacritics */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari lafadz (bisa tanpa harakat)..."
                  value={kamusSearch}
                  onChange={(e) => setKamusSearch(e.target.value)}
                  className="w-full bg-[#161616] border border-zinc-800 rounded pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-600 focus:outline-none"
                />
                <Search size={14} className="absolute left-3 top-2 text-zinc-600" />
              </div>

              {/* Category Filters row */}
              <div className="flex flex-wrap gap-1">
                {uniqueCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setKamusFilterCategory(cat)}
                    className={`px-2 py-0.5 rounded-full text-[9px] transition-all font-semibold ${
                      kamusFilterCategory === cat
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dictionary Results lists */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {matchingDictionary.length === 0 ? (
                <div className="text-center p-6 text-xs text-zinc-650 italic">
                  Tidak ada istilah kamus yang cocok.
                </div>
              ) : (
                matchingDictionary.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded bg-zinc-950/70 border border-zinc-900 hover:border-zinc-800 transition relative group/item"
                  >
                    <div className="flex justify-between items-center mb-1.5 flex-row-reverse">
                      <span className="font-serif text-xl font-bold text-zinc-100" dir="rtl">{item.keyword}</span>
                      {item.category && (
                        <span className="text-[8.5px] uppercase tracking-wider text-emerald-500 font-mono font-bold bg-emerald-950/40 px-1.5 rounded">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed text-left" dir="ltr">
                      {item.translation}
                    </p>

                    <button
                      onClick={() => handleDeleteKamusItem(item.id)}
                      className="absolute bottom-2.5 right-2 px-1 py-0.5 rounded bg-zinc-900 text-zinc-700 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      title="Hapus kata dari kamus"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Custom Interactive additions to the Dictionary */}
            <div className="p-3 border-y border-zinc-900 bg-zinc-950/50 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7] block">
                Tambah Kosakata Kamus Populer
              </span>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Lafadz Arab (contoh: رَحِمَ)"
                  value={newKamusKeyword}
                  onChange={(e) => setNewKamusKeyword(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100"
                />
                <input
                  type="text"
                  placeholder="Terjemahan (contoh: Mengasihi)"
                  value={newKamusTranslation}
                  onChange={(e) => setNewKamusTranslation(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100"
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                <select
                  value={newKamusCategory}
                  onChange={(e) => setNewKamusCategory(e.target.value)}
                  className="bg-[#1c1c1c] border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-300 focus:outline-none"
                >
                  <option value="Umum">Umum</option>
                  <option value="Nahwu">Nahwu</option>
                  <option value="Shorof">Shorof</option>
                  <option value="Fiqh">Fiqh</option>
                  <option value="Tasawwuf">Tasawwuf</option>
                </select>

                <button
                  onClick={handleAddKamusItem}
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] text-white font-bold whitespace-nowrap"
                >
                  Daftarkan Lafadz +
                </button>
              </div>

              {/* CSV Import */}
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center">
                <span className="text-[9px] text-zinc-550">Impor Kamus dari CSV:</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  ref={kamusLoaderRef}
                  onChange={handleImportKamusCSV}
                />
                <button
                  onClick={() => kamusLoaderRef.current?.click()}
                  className="text-[9.5px] font-bold text-sky-400 hover:underline flex items-center gap-0.5"
                >
                  Unggah CSV
                </button>
              </div>
            </div>

            {/* Global Project search section */}
            <div className="p-3.5 bg-zinc-950/80 border-t border-zinc-900 space-y-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block">
                Pencarian Kitab Utama (Ignore Harakat)
              </span>
              <input
                type="text"
                placeholder="Cari lafadz atau terjemah di seluruh bab..."
                value={kitabSearch}
                onChange={(e) => setKitabSearch(e.target.value)}
                className="w-full bg-[#161616] border border-zinc-850 rounded px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-600"
              />
              
              {kitabSearch.trim().length >= 2 && (
                <div className="max-h-24 overflow-y-auto space-y-1.5 pt-1">
                  {matchingLineSearchResults.length === 0 ? (
                    <span className="text-[9.5px] text-zinc-600 italic block">Tidak ada hasil di bab-bab kitab.</span>
                  ) : (
                    matchingLineSearchResults.map((res, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          // Try activating
                          setActiveLineId(res.line.id);
                        }}
                        className="p-1 px-2 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-300 cursor-pointer truncate border border-zinc-800/40"
                      >
                        <span className="text-emerald-500 font-bold font-serif">{res.line.arabicFull.substring(0, 30)}... </span>
                        <span className="text-zinc-500">({res.sectionTitle})</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Statistics and Information status block */}
            <div className="p-4 border-t border-zinc-900 mt-auto bg-zinc-950/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Statistik Naskah</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-zinc-300">
                <div className="p-2 bg-zinc-900/80 rounded border border-zinc-850">
                  <p className="text-[9px] text-zinc-500 uppercase leading-none">Lafadz</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">{totalArabicWords}</p>
                </div>
                <div className="p-2 bg-zinc-900/80 rounded border border-zinc-850">
                  <p className="text-[9px] text-zinc-500 uppercase leading-none">Baris</p>
                  <p className="text-sm font-bold text-zinc-100 mt-1">{totalLines}</p>
                </div>
                <div className="p-2 bg-zinc-900/80 rounded border border-zinc-850">
                  <p className="text-[9px] text-zinc-500 uppercase leading-none">Fasal</p>
                  <p className="text-sm font-bold text-indigo-400 mt-1">{totalSections}</p>
                </div>
              </div>
            </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Status Notification Alerts */}
      {notif && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform animate-bounce">
          <div className={`px-4.5 py-2.5 rounded-md shadow-2xl flex items-center gap-2 border text-xs font-semibold ${
            notif.type === "success" 
              ? "bg-[#0c2f16] text-[#4ade80] border-[#14532d]" 
              : notif.type === "error"
              ? "bg-[#450a0a] text-[#f87171] border-[#7f1d1d]"
              : "bg-[#0f172a] text-[#38bdf8] border-[#1e293b]"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
            <span>{notif.message}</span>
          </div>
        </div>
      )}

      {/* Embedded API Loading Backdrop */}
      {apiLoading && (
        <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3.5 z-40">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-950 border-t-emerald-500 animate-spin"></div>
          <div className="text-center space-y-1">
            <p className="text-sm text-zinc-200 font-bold tracking-wide">Menghubungkan ke Gemini AI</p>
            <p className="text-xs text-zinc-500 animate-pulse">{apiStatusMsg}</p>
          </div>
        </div>
      )}

      {/* Modern Multi-Format Exporter Modal Dialog */}
      {showExportModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-40 transition-all duration-300">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] md:h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Download size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-150 uppercase tracking-wide">Ekspor Naskah Scribe Pro</h3>
                  <p className="text-[10px] text-zinc-500">Ekspor bab atau seluruh kitab dengan tata letak visual rapi</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-zinc-550 hover:text-zinc-300 p-1.5 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                title="Tutup dialog ekspor"
              >
                <X size={15} />
              </button>
            </div>

            {/* Mobile Tab Toggle */}
            <div className="flex border-b border-zinc-900 bg-[#161616] md:hidden shrink-0">
              <button
                onClick={() => setExportMobileTab("options")}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-semibold text-[11px] transition-colors ${
                  exportMobileTab === "options"
                    ? "border-b-2 border-emerald-500 bg-zinc-900/40 text-emerald-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Sliders size={12} />
                <span>Pengaturan Ekspor</span>
              </button>
              <button
                onClick={() => setExportMobileTab("preview")}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-semibold text-[11px] transition-colors ${
                  exportMobileTab === "preview"
                    ? "border-b-2 border-emerald-500 bg-zinc-900/40 text-emerald-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Eye size={12} />
                <span>Pratinjau Live HTML</span>
              </button>
            </div>

            {/* Split Content Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              
              {/* Left Column: Form Settings */}
              <div
                className={`w-full md:w-[380px] overflow-y-auto border-r border-zinc-905 p-6 space-y-5 text-xs shrink-0 scroll-smooth ${
                  exportMobileTab === "options" ? "block" : "hidden md:block"
                }`}
                style={{ scrollbarWidth: "thin" }}
              >
                {/* Step 1: Format Selection */}
                <div className="space-y-2">
                  <label className="text-zinc-450 uppercase font-bold text-[10px] tracking-wider block">1. Pilih Format Berkas</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => setExportFormat("pdf")}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        exportFormat === "pdf"
                          ? "bg-amber-950/15 border-amber-500/70 text-amber-300 shadow-lg shadow-amber-950/30"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="p-1 px-2.5 bg-amber-500/10 rounded-md">
                        <span className="font-serif text-sm font-bold">PDF</span>
                      </div>
                      <div>
                        <p className="font-bold text-[10.5px]">PDF Cetak</p>
                        <p className="text-[8.5px] text-zinc-500 mt-0.5 leading-none">RTL-Sempurna</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setExportFormat("docx")}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        exportFormat === "docx"
                          ? "bg-sky-950/15 border-sky-500/70 text-sky-300 shadow-lg shadow-sky-950/30"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="p-1 px-2.5 bg-sky-500/10 rounded-md">
                        <span className="font-serif text-sm font-bold">DOCX</span>
                      </div>
                      <div>
                        <p className="font-bold text-[10.5px]">Word Doc</p>
                        <p className="text-[8.5px] text-zinc-500 mt-0.5 leading-none">Bisa Diedit</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setExportFormat("html")}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        exportFormat === "html"
                          ? "bg-emerald-950/15 border-emerald-500/70 text-emerald-300 shadow-lg shadow-emerald-950/30"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="p-1 px-2.5 bg-emerald-500/10 rounded-md">
                        <span className="font-serif text-sm font-bold">HTML</span>
                      </div>
                      <div>
                        <p className="font-bold text-[10.5px]">Web Page</p>
                        <p className="text-[8.5px] text-zinc-500 mt-0.5 leading-none">Mandiri</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Step 2: Scope Selection */}
                <div className="space-y-2">
                  <label className="text-zinc-450 uppercase font-bold text-[10px] tracking-wider block">2. Tentukan Ruang Lingkup Ekspor</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition ${
                      exportScope === "current" ? "bg-zinc-900 border-zinc-750 text-zinc-100" : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-850"
                    }`}>
                      <input
                        type="radio"
                        name="export_scope"
                        checked={exportScope === "current"}
                        onChange={() => setExportScope("current")}
                        className="rounded-full border-zinc-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-[#0d0d0d]"
                      />
                      <div className="leading-tight">
                        <p className="font-bold text-[10.5px]">Bab Saat Ini</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5 truncate max-w-[120px]">
                          {currentChapter ? currentChapter.title : "Hanya bab aktif"}
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition ${
                      exportScope === "all" ? "bg-zinc-900 border-zinc-750 text-zinc-100" : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-850"
                    }`}>
                      <input
                        type="radio"
                        name="export_scope"
                        checked={exportScope === "all"}
                        onChange={() => setExportScope("all")}
                        className="rounded-full border-zinc-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-[#0d0d0d]"
                      />
                      <div className="leading-tight">
                        <p className="font-bold text-[10.5px]">Seluruh Kitab</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Semua bab ({totalChapters} Bab)</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Step 3: Elements Filter */}
                <div className="space-y-2">
                  <label className="text-zinc-450 uppercase font-bold text-[10px] tracking-wider block">3. Opsi Isi & Detail Tampilan</label>
                  <div className="bg-zinc-950/50 border border-zinc-900/60 rounded-lg p-3.5 space-y-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exportShowMakna}
                          onChange={(e) => setExportShowMakna(e.target.checked)}
                          className="rounded border-zinc-800 bg-[#0d0d0d] text-emerald-600 focus:ring-emerald-500/20"
                        />
                        <span>Makna Jenggot</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exportShowSymbols}
                          onChange={(e) => setExportShowSymbols(e.target.checked)}
                          className="rounded border-zinc-800 bg-[#0d0d0d] text-emerald-600 focus:ring-emerald-500/20"
                        />
                        <span>Kedudukan Nahwu</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exportShowTranslation}
                          onChange={(e) => setExportShowTranslation(e.target.checked)}
                          className="rounded border-zinc-800 bg-[#0d0d0d] text-emerald-600 focus:ring-emerald-500/20"
                        />
                        <span>Terjemahan</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exportShowNotes}
                          onChange={(e) => setExportShowNotes(e.target.checked)}
                          className="rounded border-zinc-800 bg-[#0d0d0d] text-emerald-600 focus:ring-emerald-500/20"
                        />
                        <span>Catatan Samping</span>
                      </label>
                    </div>

                    {/* Scholastic layers checkboxes block */}
                    <div className="border-t border-zinc-900 pt-2.5 mt-2.5">
                      <span className="text-[9.5px] uppercase font-bold tracking-widest text-emerald-450 block mb-2">Pilih Lapisan Kitab Kuning</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="flex items-center gap-2.5 text-zinc-450 hover:text-zinc-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={exportShowMatan}
                            onChange={(e) => setExportShowMatan(e.target.checked)}
                            className="rounded border-zinc-850 bg-[#0d0d0d] text-rose-600 focus:ring-rose-500/20"
                          />
                          <span>Matan (Utama)</span>
                        </label>
                        
                        <label className="flex items-center gap-2.5 text-zinc-450 hover:text-zinc-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={exportShowSyarah}
                            onChange={(e) => setExportShowSyarah(e.target.checked)}
                            className="rounded border-zinc-850 bg-[#0d0d0d] text-emerald-600 focus:ring-emerald-500/20"
                          />
                          <span>Syarah (Penjelas)</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-zinc-450 hover:text-zinc-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={exportShowHasyiyah}
                            onChange={(e) => setExportShowHasyiyah(e.target.checked)}
                            className="rounded border-zinc-850 bg-[#0d0d0d] text-purple-600 focus:ring-purple-500/20"
                          />
                          <span>Hasyiyah</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-zinc-450 hover:text-zinc-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={exportShowTaliq}
                            onChange={(e) => setExportShowTaliq(e.target.checked)}
                            className="rounded border-zinc-850 bg-[#0d0d0d] text-amber-600 focus:ring-amber-500/20"
                          />
                          <span>Ta'liq (Koreksi)</span>
                        </label>
                      </div>
                    </div>

                    {/* Classical style customization checkbox */}
                    <div className="border-t border-zinc-900 pt-2.5 mt-2.5">
                      <span className="text-[9.5px] uppercase font-bold tracking-widest text-[#abafb5] block mb-2">Tema & Seni Desain</span>
                      <label className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-950/10 border border-amber-900/20 text-amber-300 hover:text-amber-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exportStyleKitabKuning}
                          onChange={(e) => setExportStyleKitabKuning(e.target.checked)}
                          className="rounded border-amber-700 bg-[#0d0d0d] text-amber-600 focus:ring-amber-500/20 mt-0.5"
                        />
                        <div className="leading-snug">
                          <p className="font-bold text-[10px]">Gaya Kitab Kuning Klasik</p>
                          <p className="text-[8px] text-amber-400/80 mt-0.5 leading-snug">Menerapkan kertas krem kekuningan antik, bingkai border Arab, dan multi-komentar pesantren.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Live Preview Panel */}
              <div
                className={`flex-1 bg-[#161616] flex flex-col min-h-0 overflow-hidden relative ${
                  exportMobileTab === "preview" ? "flex" : "hidden md:flex"
                }`}
              >
                {/* Live Preview Toolbar banner */}
                <div className="px-5 py-3 bg-zinc-950/80 border-b border-zinc-900 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-zinc-300 font-bold tracking-wide uppercase text-[10px]">Pratinjau Live Tata Letak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shadow-xs uppercase tracking-wider font-mono">
                      {exportFormat}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shadow-xs uppercase tracking-wider font-mono">
                      {exportScope === "all" ? "Seluruh Kitab" : "Bab Aktif"}
                    </span>
                    <button 
                      onClick={() => {
                        showNotif("Pratinjau diperbarui secara instan!", "info");
                      }}
                      className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Perbarui Pratinjau"
                    >
                      <RefreshCw size={11} className="animate-spin-slow" />
                    </button>
                  </div>
                </div>

                {/* Sub-toolbar note */}
                <div className="bg-zinc-900/40 border-b border-zinc-950 px-5 py-2 flex items-center justify-between text-[10px] text-zinc-500 shrink-0">
                  <span>Tata letak di bawah ini mewakili berkas akhir dokumen HTML dan PDF yang diunduh.</span>
                  <span className="text-amber-500/80 flex items-center gap-1 font-semibold">
                    <Sparkles size={11} />
                    Live Render
                  </span>
                </div>

                {/* Live Sandbox Container */}
                <div className="flex-1 p-5 bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full rounded-lg border border-zinc-800/80 bg-[#121212] flex flex-col overflow-hidden shadow-2xl relative">
                    <iframe
                      srcDoc={generatePreviewHtml()}
                      title="Scribe Pro Kitab Kuning Live Preview"
                      className="w-full h-full bg-white border-0"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-zinc-500 italic hidden sm:block">Perubahan opsi di sisi kiri akan diperbarui secara langsung di panel pratinjau.</span>
              <span className="text-[10px] text-zinc-500 italic block sm:hidden">Desain diperbarui secara langsung.</span>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleRunExport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition cursor-pointer"
                >
                  <Download size={13} />
                  <span>Unduh Berkas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <footer id="footer-bar" className="h-8.5 bg-[#151515] border-t border-zinc-900 flex items-center justify-between px-4 text-[11px] text-zinc-500 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow shadow-emerald-400 animate-pulse"></span>
            <span>SQLite & LocalDB Aktif</span>
          </div>
          <span>Total Bab: {totalChapters}</span>
          <span>Kata di Bab Aktif: <strong className="text-zinc-300 font-semibold">{activeChapterArabicWords}</strong></span>
          <span>Total Kata Arab: {totalArabicWords}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850/60 font-mono text-[9px] text-zinc-400">RTL-Arabic</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850/60 font-mono text-[9px] text-zinc-400">Pegon-Malay</span>
          </div>
          <span className="text-zinc-550 flex items-center gap-1 flex-row-reverse" dir="rtl">
            <Clock size={11} />
            <span>Auto backup tersimpan otomatis: {lastSaved || "Baru saja"}</span>
          </span>
          <span className="font-mono text-zinc-600">UTF-8</span>
        </div>
      </footer>
    </div>
  );
}
