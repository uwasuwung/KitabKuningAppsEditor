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
  PanelRightOpen,
  Camera,
  RotateCw,
  Upload,
  Image,
  FileText
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
  const [kitabSearchCategory, setKitabSearchCategory] = useState<string>("Semua");
  const [kitabSearchStartChapterId, setKitabSearchStartChapterId] = useState<string>("all");
  const [kitabSearchEndChapterId, setKitabSearchEndChapterId] = useState<string>("all");

  // --- Sidebar & Panel Toggle ---
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [splitViewMode, setSplitViewMode] = useState<boolean>(false);

  // --- Camera & Visual Reference States ---
  const [rightSidebarTab, setRightSidebarTab] = useState<"kamus" | "kamera">("kamus");
  const [capturedRefImage, setCapturedRefImage] = useState<string | null>(() => {
    return localStorage.getItem("kitab_visual_reference") || null;
  });
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraBrightness, setCameraBrightness] = useState<number>(100);
  const [cameraContrast, setCameraContrast] = useState<number>(100);
  const [cameraRotate, setCameraRotate] = useState<number>(0);
  const [cameraZoom, setCameraZoom] = useState<number>(1);
  const [cameraPanX, setCameraPanX] = useState<number>(0);
  const [cameraPanY, setCameraPanY] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visualRefLoaderRef = useRef<HTMLInputElement | null>(null);

  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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
  const [exportMarginLayout, setExportMarginLayout] = useState<"standard" | "left" | "both">("both");
  const [exportMobileTab, setExportMobileTab] = useState<"options" | "preview">("options");

  const [newChapterTitle, setNewChapterTitle] = useState<string>("");
  const [newChapterCategory, setNewChapterCategory] = useState<string>("Umum");
  const [sidebarCategoryFilter, setSidebarCategoryFilter] = useState<string>("Semua");
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
  const pdfLoaderRef = useRef<HTMLInputElement | null>(null);

  // --- Auto-Baca PDF States ---
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfParsingStatus, setPdfParsingStatus] = useState<string>("");
  const [pdfParsedRows, setPdfParsedRows] = useState<{ id: string; arabic: string; translation: string; isSelected: boolean }[]>([]);
  const [pdfPairingMode, setPdfPairingMode] = useState<"smart" | "separate">("smart");
  const [pdfTargetChapterId, setPdfTargetChapterId] = useState<string>("new");
  const [pdfNewChapterTitle, setPdfNewChapterTitle] = useState<string>("Bab Hasil Impor PDF");
  const [pdfNewChapterCategory, setPdfNewChapterCategory] = useState<string>("Umum");
  const [pdfRawTextLines, setPdfRawTextLines] = useState<string[]>([]);

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

  // --- Camera & Visual Reference Effects & Handlers ---
  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          streamRef.current = stream;
        })
        .catch(err => {
          console.error("Gagal mengakses kamera:", err);
          showNotif("Gagal mengakses kamera. Pastikan izin kamera diberikan.", "error");
          setIsCameraActive(false);
        });
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraActive]);

  function stopCameraStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }

  function handleCapturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedRefImage(dataUrl);
        localStorage.setItem("kitab_visual_reference", dataUrl);
        setIsCameraActive(false);
        showNotif("Foto naskah berhasil diambil!", "success");
      }
    } catch (e) {
      console.error(e);
      showNotif("Gagal mengambil foto dari kamera.", "error");
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedRefImage(dataUrl);
      localStorage.setItem("kitab_visual_reference", dataUrl);
      showNotif("Gambar referensi berhasil diunggah!", "success");
    };
    reader.onerror = () => {
      showNotif("Gagal membaca file gambar.", "error");
    };
    reader.readAsDataURL(file);
  }

  function handleDeleteRefImage() {
    if (confirm("Hapus visual referensi kitab dari panel?")) {
      setCapturedRefImage(null);
      localStorage.removeItem("kitab_visual_reference");
      setIsCameraActive(false);
      stopCameraStream();
      // Reset view options
      setCameraBrightness(100);
      setCameraContrast(100);
      setCameraRotate(0);
      setCameraZoom(1);
      setCameraPanX(0);
      setCameraPanY(0);
      showNotif("Referensi visual berhasil dihapus.", "success");
    }
  }

  function resetViewport() {
    setCameraZoom(1);
    setCameraPanX(0);
    setCameraPanY(0);
    setCameraRotate(0);
    showNotif("Tampilan referensi di-reset ke default.", "info");
  }

  const handleRefMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - cameraPanX, y: e.clientY - cameraPanY });
  };

  const handleRefMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setCameraPanX(e.clientX - panStart.x);
    setCameraPanY(e.clientY - panStart.y);
  };

  const handleRefMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const handleRefTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX - cameraPanX, y: touch.clientY - cameraPanY });
    }
  };

  const handleRefTouchMove = (e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setCameraPanX(touch.clientX - panStart.x);
    setCameraPanY(touch.clientY - panStart.y);
  };

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
      category: newChapterCategory,
      sections: []
    };
    setProject(prev => ({
      ...prev,
      chapters: [...prev.chapters, newCh]
    }));
    setNewChapterTitle("");
    setNewChapterCategory("Umum");
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

  // --- Auto-Baca PDF parsing & pairing algorithm ---
  async function handleImportPdfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setPdfLoading(true);
    setPdfParsingStatus("Memuat pustaka pembaca PDF...");
    
    try {
      let pdfjsLib: any = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
          script.onload = () => {
            const lib = (window as any).pdfjsLib;
            lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
            resolve();
          };
          script.onerror = () => reject(new Error("Gagal mengunduh modul PDF.js online. Periksa koneksi internet Anda."));
          document.head.appendChild(script);
        });
        pdfjsLib = (window as any).pdfjsLib;
      }
      
      setPdfParsingStatus("Membaca berkas PDF...");
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          
          let compiledLines: string[] = [];
          
          for (let i = 1; i <= pdf.numPages; i++) {
            setPdfParsingStatus(`Memindai Teks Halaman ${i} dari ${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const items = textContent.items as any[];
            if (!items || items.length === 0) continue;
            
            items.sort((a, b) => {
              const yDiff = b.transform[5] - a.transform[5];
              if (Math.abs(yDiff) > 5) return yDiff;
              return a.transform[4] - b.transform[4];
            });
            
            let linesInPage: string[] = [];
            let currentLine = "";
            let lastY = -1;
            
            for (const item of items) {
              if (lastY === -1) {
                currentLine = item.str;
                lastY = item.transform[5];
              } else if (Math.abs(item.transform[5] - lastY) > 8) {
                if (currentLine.trim()) {
                  linesInPage.push(currentLine.trim());
                }
                currentLine = item.str;
                lastY = item.transform[5];
              } else {
                currentLine += " " + item.str;
              }
            }
            if (currentLine.trim()) {
              linesInPage.push(currentLine.trim());
            }
            
            compiledLines = [...compiledLines, ...linesInPage];
          }
          
          if (compiledLines.length === 0) {
            throw new Error("Teks PDF kosong atau berupa pindaian gambar (OCR diperlukan).");
          }
          
          setPdfRawTextLines(compiledLines);
          
          const pairedRows: { id: string; arabic: string; translation: string; isSelected: boolean }[] = [];
          let currentArabic = "";
          let currentTranslation = "";

          for (const line of compiledLines) {
            const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
            if (isAr) {
              if (currentArabic.trim()) {
                pairedRows.push({
                  id: "pdf-pair-" + Math.random().toString(36).substr(2, 9),
                  arabic: currentArabic.trim(),
                  translation: currentTranslation.trim(),
                  isSelected: true
                });
                currentArabic = "";
                currentTranslation = "";
              }
              currentArabic = line;
            } else {
              if (currentArabic.trim()) {
                currentTranslation += (currentTranslation ? " " : "") + line;
              } else {
                pairedRows.push({
                  id: "pdf-pair-" + Math.random().toString(36).substr(2, 9),
                  arabic: "",
                  translation: line,
                  isSelected: true
                });
              }
            }
          }
          if (currentArabic.trim() || currentTranslation.trim()) {
            pairedRows.push({
              id: "pdf-pair-" + Math.random().toString(36).substr(2, 9),
              arabic: currentArabic.trim(),
              translation: currentTranslation.trim(),
              isSelected: true
            });
          }
          
          setPdfParsedRows(pairedRows);
          setPdfTargetChapterId("new");
          setPdfNewChapterTitle(`Kitab Impor - ${(file.name || "Untitled").replace(/\.pdf$/i, "")}`);
          setShowPdfModal(true);
          showNotif("Sukses membaca PDF! Silakan periksa hasil tinjau.", "success");
          
        } catch (err: any) {
          showNotif(`Gagal memuat isi PDF: ${err.message}`, "error");
        } finally {
          setPdfLoading(false);
          setPdfParsingStatus("");
        }
      };
      
      fileReader.onerror = () => {
        showNotif("Gagal membaca berkas lokal PDF.", "error");
        setPdfLoading(false);
        setPdfParsingStatus("");
      };
      
      fileReader.readAsArrayBuffer(file);
      
    } catch (err: any) {
      showNotif(err.message, "error");
      setPdfLoading(false);
      setPdfParsingStatus("");
    }
  }

  function handleRecalculatePdfRows(mode: "smart" | "separate") {
    setPdfPairingMode(mode);
    if (pdfRawTextLines.length === 0) return;
    
    if (mode === "smart") {
      const pairedRows: { id: string; arabic: string; translation: string; isSelected: boolean }[] = [];
      let currentArabic = "";
      let currentTranslation = "";

      for (const line of pdfRawTextLines) {
        const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
        if (isAr) {
          if (currentArabic.trim()) {
            pairedRows.push({
              id: "pdf-pair-" + Math.random().toString(36).substr(2, 9),
              arabic: currentArabic.trim(),
              translation: currentTranslation.trim(),
              isSelected: true
            });
            currentArabic = "";
            currentTranslation = "";
          }
          currentArabic = line;
        } else {
          if (currentArabic.trim()) {
            currentTranslation += (currentTranslation ? " " : "") + line;
          } else {
            pairedRows.push({
              id: "pdf-pair-" + Math.random().toString(36).substr(2, 9),
              arabic: "",
              translation: line,
              isSelected: true
            });
          }
        }
      }
      if (currentArabic.trim() || currentTranslation.trim()) {
        pairedRows.push({
          id: "pdf-pair-" + Math.random().toString(36).substr(2, 9),
          arabic: currentArabic.trim(),
          translation: currentTranslation.trim(),
          isSelected: true
        });
      }
      setPdfParsedRows(pairedRows);
    } else {
      const separateRows = pdfRawTextLines.map(line => {
        const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
        return {
          id: "pdf-sep-" + Math.random().toString(36).substr(2, 9),
          arabic: isAr ? line : "",
          translation: isAr ? "" : line,
          isSelected: true
        };
      });
      setPdfParsedRows(separateRows);
    }
  }

  function handleApplyPdfImport() {
    const selectedRows = pdfParsedRows.filter(row => row.isSelected && (row.arabic.trim() || row.translation.trim()));
    if (selectedRows.length === 0) {
      showNotif("Tidak ada baris terpilih yang memiliki teks untuk diimpor.", "error");
      return;
    }

    const newLines: KitabLine[] = selectedRows.map((row, idx) => {
      const wordsArr = row.arabic.trim()
        ? row.arabic.trim().split(/\s+/).map((word, wIdx) => ({
            id: `w-pdf-${Date.now()}-${idx}-${wIdx}-${Math.random()}`,
            arabic: word,
            makna: "",
            symbol: ""
          }))
        : [];
      return {
        id: `line-pdf-${Date.now()}-${idx}-${Math.random()}`,
        arabicFull: row.arabic || "...",
        translationFull: row.translation || "",
        notes: "Hasil otomatisasi impor PDF.",
        words: wordsArr,
        matan: "",
        syarah: "",
        hasyiyah: "",
        taliq: ""
      };
    });

    let targetChId = pdfTargetChapterId;
    let targetSecId = "";

    setProject(prev => {
      let updatedChapters = [...prev.chapters];

      if (targetChId === "new") {
        const newChapterId = `ch-pdf-${Date.now()}`;
        const newSectionId = `sec-pdf-${Date.now()}`;
        targetChId = newChapterId;
        targetSecId = newSectionId;

        const newChapter = {
          id: newChapterId,
          title: pdfNewChapterTitle || "Bab Hasil Impor PDF",
          category: pdfNewChapterCategory || "Umum",
          order: prev.chapters.length + 1,
          sections: [
            {
              id: newSectionId,
              title: "Fasal Hasil Impor PDF",
              lines: newLines,
              order: 1
            }
          ]
        };
        updatedChapters.push(newChapter);
      } else {
        updatedChapters = updatedChapters.map(ch => {
          if (ch.id === targetChId) {
            let updatedSections = [...ch.sections];
            if (updatedSections.length === 0) {
              const newSectionId = `sec-pdf-${Date.now()}`;
              targetSecId = newSectionId;
              updatedSections.push({
                id: newSectionId,
                title: "Fasal Hasil Impor PDF",
                lines: newLines,
                order: 1
              });
            } else {
              targetSecId = updatedSections[0].id;
              updatedSections[0] = {
                ...updatedSections[0],
                lines: [...updatedSections[0].lines, ...newLines]
              };
            }
            return {
              ...ch,
              sections: updatedSections
            };
          }
          return ch;
        });
      }

      return {
        ...prev,
        chapters: updatedChapters,
        dateModified: new Date().toISOString()
      };
    });

    setActiveChapterId(targetChId);
    if (targetSecId) {
      setActiveSectionId(targetSecId);
    }

    if (newLines.length > 0) {
      setActiveLineId(newLines[0].id);
    }

    setShowPdfModal(false);
    showNotif(`Berhasil mengimpor ${newLines.length} baris dari PDF ke bab!`, "success");
    setTimeout(() => {
      saveToLocalStorage();
    }, 100);
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
          styleKitabKuning: exportStyleKitabKuning,
          marginLayout: exportMarginLayout
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
          styleKitabKuning: exportStyleKitabKuning,
          marginLayout: exportMarginLayout
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

          /* Marginal Layout CSS styles */
          .margin-container-row {
            display: flex;
            gap: 16px;
            align-items: stretch;
            direction: rtl; /* Flow lines Right to Left */
            margin-bottom: 30px;
            break-inside: avoid;
            width: 100%;
          }

          .center-text-frame {
            flex: 2.2;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 24px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background-color: #fafafa;
          }

          .kitab-kuning-theme .center-text-frame {
            background-color: #fdfaf3 !important;
            border: 4px double #c49662 !important; /* Authentic double borders just like the vintage plates in the picture! */
            border-radius: 4px;
            padding: 24px;
          }

          .side-commentary-margin {
            flex: 0.9;
            min-width: 130px;
            max-width: 250px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 14px;
            background-color: #ffffff;
            border-radius: 6px;
            border: 1px dashed #d1d5db;
            justify-content: flex-start;
            font-size: 11px;
          }

          .kitab-kuning-theme .side-commentary-margin {
            background-color: #fbf8f0 !important;
            border: 1px solid #eedec4 !important;
            border-radius: 4px;
          }

          .margin-left-border {
            border-left: 3px solid #6b21a8;
          }
          .kitab-kuning-theme .margin-left-border {
            border-left: 3px solid #ad8053 !important;
          }

          .margin-right-border {
            border-right: 3px solid #b45309;
          }
          .kitab-kuning-theme .margin-right-border {
            border-right: 3px solid #ad8053 !important;
          }

          .empty-margin {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0.5;
            text-align: center;
            border-style: dotted !important;
          }
          .decorative-leaf {
            font-size: 14px;
            color: #c49662;
            opacity: 0.7;
            margin-bottom: 4px;
          }
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
                  ${sec.lines.map(line => {
                    const hasWords = line.words && line.words.length > 0;
                    const marginLayout = exportMarginLayout || "both";

                    const arabicRowHtml = `
                      <div class="arabic-container">
                        ${(hasWords && exportShowMakna) ? 
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
                    `;

                    const translationHtml = (exportShowTranslation && line.translationFull) ? `
                      <div class="translation-full">
                        <strong>Makna:</strong> ${line.translationFull}
                      </div>
                    ` : "";

                    const matanHtml = showMatan && line.matan ? `
                      <div class="layer-matan">
                        <span class="layer-badge matan-badge">MATAN</span>
                        <span class="arabic-text-serif" dir="rtl">${line.matan}</span>
                      </div>
                    ` : "";

                    const syarahHtml = showSyarah && (line.syarah || line.notes) ? `
                      <div class="layer-syarah">
                        <span class="layer-badge syarah-badge">SYARAH</span>
                        <p class="commentary-text">${line.syarah || line.notes}</p>
                      </div>
                    ` : "";

                    const hasyiyahHtml = showHasyiyah && line.hasyiyah ? `
                      <div class="layer-hasyiyah">
                        <span class="layer-badge hasyiyah-badge">HASYIYAH</span>
                        <p class="commentary-text">${line.hasyiyah}</p>
                      </div>
                    ` : "";

                    const taliqHtml = showTaliq && line.taliq ? `
                      <div class="layer-taliq">
                        <span class="layer-badge taliq-badge">TA'LIQ</span>
                        <p class="commentary-text">${line.taliq}</p>
                      </div>
                    ` : "";

                    if (marginLayout === "standard") {
                      return `
                        <div class="line">
                          ${arabicRowHtml}
                          ${translationHtml}
                          ${matanHtml}
                          ${syarahHtml}
                          ${hasyiyahHtml}
                          ${taliqHtml}
                        </div>
                      `;
                    } else if (marginLayout === "left") {
                      const hasLeftCommentary = syarahHtml || hasyiyahHtml || taliqHtml;
                      return `
                        <div class="margin-container-row">
                          <!-- Main Content Center Block -->
                          <div class="center-text-frame">
                            ${arabicRowHtml}
                            ${matanHtml}
                            ${translationHtml}
                          </div>
                          
                          <!-- Left Marginal Commentary Block -->
                          ${hasLeftCommentary ? `
                            <div class="side-commentary-margin margin-left-border">
                              ${syarahHtml}
                              ${hasyiyahHtml}
                              ${taliqHtml}
                            </div>
                          ` : `
                            <div class="side-commentary-margin margin-left-border empty-margin">
                              <span class="decorative-leaf">✿</span>
                              <span style="font-size: 9px; color: #a47c5c; opacity: 0.6; font-family: monospace;">HASYIYAH</span>
                            </div>
                          `}
                        </div>
                      `;
                    } else {
                      // Both (Dua Sisi Kiri-Kanan)
                      const hasLeftCommentary = syarahHtml || hasyiyahHtml;
                      const hasRightCommentary = taliqHtml;
                      
                      return `
                        <div class="margin-container-row">
                          <!-- Right Marginal Block -->
                          ${hasRightCommentary ? `
                            <div class="side-commentary-margin margin-right-border">
                              ${taliqHtml}
                            </div>
                          ` : `
                            <div class="side-commentary-margin margin-right-border empty-margin">
                              <span class="decorative-leaf">✿</span>
                              <span style="font-size: 8px; color: #a47c5c; opacity: 0.6; font-family: monospace;">TA'LIQ</span>
                            </div>
                          `}

                          <!-- Main Content Center Block -->
                          <div class="center-text-frame">
                            ${arabicRowHtml}
                            ${matanHtml}
                            ${translationHtml}
                          </div>

                          <!-- Left Marginal Block -->
                          ${hasLeftCommentary ? `
                            <div class="side-commentary-margin margin-left-border">
                              ${syarahHtml}
                              ${hasyiyahHtml}
                            </div>
                          ` : `
                            <div class="side-commentary-margin margin-left-border empty-margin">
                              <span class="decorative-leaf">✿</span>
                              <span style="font-size: 8px; color: #a47c5c; opacity: 0.6; font-family: monospace;">HASYIYAH</span>
                            </div>
                          `}
                        </div>
                      `;
                    }
                  }).join("")}
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
    
    let startIdx = 0;
    let endIdx = project.chapters.length - 1;
    
    if (kitabSearchStartChapterId !== "all") {
      const idx = project.chapters.findIndex(c => c.id === kitabSearchStartChapterId);
      if (idx !== -1) startIdx = idx;
    }
    if (kitabSearchEndChapterId !== "all") {
      const idx = project.chapters.findIndex(c => c.id === kitabSearchEndChapterId);
      if (idx !== -1) endIdx = idx;
    }
    
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    
    project.chapters.forEach((ch, chIdx) => {
      // 1. Filter by Chapter Range
      if (chIdx < minIdx || chIdx > maxIdx) return;
      
      // 2. Filter by Category
      const chCategory = ch.category || "Umum";
      if (kitabSearchCategory !== "Semua" && chCategory !== kitabSearchCategory) return;
      
      // 3. Search lines
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

  const isSepia = config.theme === "sepia";
  const isLight = config.theme === "light";
  const isDark = !isSepia && !isLight;

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
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={pdfLoaderRef}
            onChange={handleImportPdfFile}
          />
          <button
            id="btn-import-pdf"
            onClick={() => pdfLoaderRef.current?.click()}
            className="hover:text-rose-400 font-medium transition-colors cursor-pointer flex items-center gap-1 text-rose-300"
            title="Unggah kitab PDF dan baca isinya secara otomatis untuk diimpor"
          >
            <FileText size={14} />
            <span>Auto-Baca PDF</span>
          </button>
          
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
            
            <div className="flex gap-1.5 mb-2">
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
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-zinc-500 font-medium">Kategori:</span>
              <select
                value={newChapterCategory}
                onChange={(e) => setNewChapterCategory(e.target.value)}
                className="flex-1 bg-[#161616] border border-zinc-850 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="Umum">Umum</option>
                <option value="Nahwu">Nahwu</option>
                <option value="Shorof">Shorof</option>
                <option value="Fiqh">Fiqh</option>
                <option value="Tasawwuf">Tasawwuf</option>
                <option value="Tauhid">Tauhid</option>
                <option value="Hadits">Hadits</option>
                <option value="Tafsir">Tafsir</option>
              </select>
            </div>

            {/* Dropdown Filter Bab */}
            <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-2 border-t border-zinc-900/60">
              <span className="text-emerald-500 font-bold uppercase tracking-wider text-[9px]">Saring Bab:</span>
              <select
                value={sidebarCategoryFilter}
                onChange={(e) => setSidebarCategoryFilter(e.target.value)}
                className="flex-1 bg-[#0b2f1a]/80 border border-[#165030]/60 rounded px-2 py-1 text-[#59ff9b] font-bold focus:outline-none cursor-pointer text-[10px]"
              >
                <option value="Semua">Semua Jenis Kitab</option>
                <option value="Umum">Umum</option>
                <option value="Nahwu">Nahwu</option>
                <option value="Shorof">Shorof</option>
                <option value="Fiqh">Fiqh</option>
                <option value="Tasawwuf">Tasawwuf</option>
                <option value="Tauhid">Tauhid</option>
                <option value="Hadits">Hadits</option>
                <option value="Tafsir">Tafsir</option>
              </select>
            </div>
          </div>

          {/* Hierarchy Directory List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {project.chapters.length === 0 ? (
              <p className="text-xs text-zinc-650 italic text-center p-4">Kitab belum memiliki bab.</p>
            ) : (
              (() => {
                const filteredChapters = project.chapters
                  .map((ch, originalIdx) => ({ ch, originalIdx }))
                  .filter(({ ch }) => sidebarCategoryFilter === "Semua" || (ch.category || "Umum") === sidebarCategoryFilter);

                if (filteredChapters.length === 0) {
                  return (
                    <div className="text-center p-6 text-xs text-zinc-600 italic">
                      Tidak ada bab dengan kategori "{sidebarCategoryFilter}".
                    </div>
                  );
                }

                return filteredChapters.map(({ ch, originalIdx }) => {
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
                          <span className="text-[10px] text-emerald-500 font-mono">#{originalIdx + 1}</span>
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-semibold truncate uppercase leading-tight">{ch.title}</span>
                          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={ch.category || "Umum"}
                              onChange={(e) => {
                                const updatedVal = e.target.value;
                                setProject(prev => ({
                                  ...prev,
                                  chapters: prev.chapters.map(c => c.id === ch.id ? { ...c, category: updatedVal } : c)
                                }));
                                showNotif(`Kategori bab diubah menjadi: ${updatedVal}`, "success");
                              }}
                              className={`${
                                isChActive 
                                  ? "bg-zinc-900 border-zinc-700 text-emerald-400" 
                                  : "bg-zinc-950 border-zinc-850 text-zinc-500"
                              } text-[8.5px] font-mono uppercase border rounded px-1 py-0.5 cursor-pointer max-w-[90px] truncate focus:outline-none`}
                            >
                              <option value="Umum">Umum</option>
                              <option value="Nahwu">Nahwu</option>
                              <option value="Shorof">Shorof</option>
                              <option value="Fiqh">Fiqh</option>
                              <option value="Tasawwuf">Tasawwuf</option>
                              <option value="Tauhid">Tauhid</option>
                              <option value="Hadits">Hadits</option>
                              <option value="Tafsir">Tafsir</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteChapter(ch.id, e)}
                        className="p-1 text-zinc-650 hover:text-red-400 transition"
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
              })()
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
        <main className={`flex-1 flex flex-col overflow-hidden transition-colors duration-200 ${
          isSepia
            ? "bg-[#faf4e6]"
            : isLight
              ? "bg-zinc-50"
              : "bg-[#0a0a0a]"
        }`}>
          
          {/* Preferences Sub-drawer */}
          {showPreferences && (
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 text-xs animate-slideDown transition-colors duration-200 ${
              isSepia
                ? "bg-[#f3ead3] border-[#ebd6bd]"
                : isLight
                  ? "bg-zinc-100 border-zinc-200"
                  : "bg-[#141414] border-zinc-900"
            }`}>
              <div className="flex flex-wrap items-center gap-6">
                
                {/* Tema Selector */}
                <div className={`flex items-center gap-2 pr-4 border-r ${
                  isSepia ? "border-[#ebd6bd]" : isLight ? "border-zinc-300" : "border-zinc-800"
                }`}>
                  <span className={`font-semibold ${isSepia ? "text-[#5c3c26]" : isLight ? "text-zinc-700" : "text-zinc-400"}`}>
                    Tema Editor:
                  </span>
                  <div className={`flex rounded p-0.5 gap-1 border ${
                    isSepia
                      ? "bg-[#faf4e6] border-[#ebd6bd]"
                      : isLight
                        ? "bg-white border-zinc-300"
                        : "bg-[#1d1d1d] border-zinc-850"
                  }`}>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, theme: "dark" })}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                        config.theme === "dark"
                          ? "bg-emerald-600 text-white"
                          : isSepia
                            ? "text-[#a8733e] hover:text-[#5c3c26]"
                            : "text-zinc-500 hover:text-zinc-350"
                      }`}
                    >
                      Gelap
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, theme: "light" })}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                        config.theme === "light"
                          ? "bg-emerald-600 text-white"
                          : isSepia
                            ? "text-[#a8733e] hover:text-[#5c3c26]"
                            : "text-zinc-500 hover:text-zinc-850"
                      }`}
                    >
                      Terang
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, theme: "sepia" })}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                        config.theme === "sepia"
                          ? "bg-amber-700 text-white"
                          : isSepia
                            ? "text-[#a8733e] hover:text-[#5c3c26]"
                            : "text-zinc-500 hover:text-amber-600"
                      }`}
                    >
                      Kertas Kuno
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`${isSepia ? "text-[#5c3c26]" : isLight ? "text-zinc-700" : "text-zinc-400"} font-medium`}>Ukuran Teks Arab:</span>
                  <input
                    type="range"
                    min="20"
                    max="48"
                    value={config.fontSizeArabic}
                    onChange={(e) => setConfig({ ...config, fontSizeArabic: Number(e.target.value) })}
                    className="w-24 accent-emerald-500"
                  />
                  <span className={`${isSepia ? "text-[#8c4f2b]" : "text-emerald-400"} font-mono`}>{config.fontSizeArabic}px</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`${isSepia ? "text-[#5c3c26]" : isLight ? "text-zinc-700" : "text-zinc-400"} font-medium`}>Ukuran Terjemah:</span>
                  <input
                    type="range"
                    min="11"
                    max="18"
                    value={config.fontSizeTranslation}
                    onChange={(e) => setConfig({ ...config, fontSizeTranslation: Number(e.target.value) })}
                    className="w-24 accent-emerald-500"
                  />
                  <span className={`${isSepia ? "text-[#8c4f2b]" : "text-emerald-400"} font-mono`}>{config.fontSizeTranslation}px</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showWordMakna}
                    onChange={(e) => setConfig({ ...config, showWordMakna: e.target.checked })}
                    className="rounded border-zinc-850 text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-25"
                  />
                  <span className={`${isSepia ? "text-[#5c3c26]" : isLight ? "text-zinc-700" : "text-zinc-400"} font-medium`}>Tampilkan Makna Per-kata (Jenggot)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showFullTranslation}
                    onChange={(e) => setConfig({ ...config, showFullTranslation: e.target.checked })}
                    className="rounded border-zinc-850 text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-25"
                  />
                  <span className={`${isSepia ? "text-[#5c3c26]" : isLight ? "text-zinc-700" : "text-zinc-400"} font-medium`}>Tampilkan Terjemahan Penuh</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showNotes}
                    onChange={(e) => setConfig({ ...config, showNotes: e.target.checked })}
                    className="rounded border-zinc-850 text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-25"
                  />
                  <span className={`${isSepia ? "text-[#5c3c26]" : isLight ? "text-zinc-700" : "text-zinc-400"} font-medium`}>Tampilkan Struktur Syarah & Catatan</span>
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
                      <span className={isSepia ? "text-[#5c3c26]" : "text-zinc-455"}>Tampilkan Matan (متن)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={config.showSyarah !== false}
                        onChange={(e) => setConfig({ ...config, showSyarah: e.target.checked })}
                        className="rounded border-zinc-850 text-emerald-500 focus:ring-emerald-500 focus:ring-opacity-25"
                      />
                      <span className={isSepia ? "text-[#5c3c26]" : "text-zinc-455"}>Tampilkan Syarah (شرح)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={config.showHasyiyah !== false}
                        onChange={(e) => setConfig({ ...config, showHasyiyah: e.target.checked })}
                        className="rounded border-zinc-850 text-indigo-500 focus:ring-indigo-500 focus:ring-opacity-25"
                      />
                      <span className={isSepia ? "text-[#5c3c26]" : "text-zinc-455"}>Tampilkan Hasyiyah (حاشية)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={config.showTaliq !== false}
                        onChange={(e) => setConfig({ ...config, showTaliq: e.target.checked })}
                        className="rounded border-zinc-850 text-rose-500 focus:ring-rose-500 focus:ring-opacity-25"
                      />
                      <span className={isSepia ? "text-[#5c3c26]" : "text-zinc-455"}>Tampilkan Ta'liq (تعليق)</span>
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPreferences(false)}
                className={`text-xs flex items-center gap-1 transition-colors ${
                  isSepia ? "text-[#a8733e] hover:text-[#5c3c26]" : "text-zinc-500 hover:text-zinc-350"
                }`}
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
              <div className={`border-b px-4 py-2 flex items-center justify-between text-xs transition-colors duration-200 ${
                isSepia
                  ? "bg-[#ebd6bd]/30 border-[#ebd6bd] text-[#5c3c26]"
                  : isLight
                    ? "bg-zinc-100 border-zinc-200 text-zinc-600"
                    : "bg-[#101010] border-zinc-900 text-zinc-400"
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold ${isSepia ? "text-[#3d2414]" : isLight ? "text-zinc-800" : "text-zinc-300"}`}>Kitab Asli:</span>
                  <span>{currentChapter?.title || "Draf Utama"}</span>
                  {currentSection && (
                    <>
                      <ChevronRight size={13} className={isSepia ? "text-[#a8733e]" : isLight ? "text-zinc-400" : "text-zinc-700"} />
                      <span className="text-emerald-600 font-medium">{currentSection.title}</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddEmptyLine}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold border transition-colors ${
                      isSepia
                        ? "bg-[#faf4e6]/90 border-[#8c4f2b]/60 text-[#8c4f2b] hover:bg-[#ebd6bd]/50"
                        : isLight
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50"
                          : "bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/60"
                    }`}
                    title="Tambah baris tulisan di bagian bawah fasal ini"
                  >
                    <Plus size={11} />
                    <span>Baris Teks</span>
                  </button>
                </div>
              </div>

              {/* Book Viewer (Kitab Yellowish Paper Aesthetic dynamically adjusted) */}
              <div className={`flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scrollbar-thin transition-colors duration-200 ${
                isSepia
                  ? "bg-[#faf4e6] scrollbar-thumb-[#ebd6bd]"
                  : isLight
                    ? "bg-zinc-50 scrollbar-thumb-zinc-350"
                    : "bg-[#0a0a0a] scrollbar-thumb-zinc-800"
              }`}>
                {currentLinesList.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-48 border border-dashed rounded-lg p-6 text-center ${
                    isSepia ? "border-[#ebd6bd] bg-[#f9f3e3]" : isLight ? "border-zinc-300 bg-white" : "border-zinc-800 bg-black/10"
                  }`}>
                    <p className={`text-sm mb-2 ${isSepia ? "text-[#8c4f2b]/80" : isLight ? "text-zinc-550" : "text-zinc-500"}`}>Fasal ini tidak mengandung baris teks.</p>
                    <button
                      onClick={handleAddEmptyLine}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-semibold transition shadow-md"
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
                        className={`group relative p-6 rounded border transition-all cursor-pointer duration-200 ${
                          isLineSelected
                            ? isSepia
                              ? "bg-white border-[#8c4f2b] shadow-md shadow-[#8c4f2b]/5 ring-1 ring-[#8c4f2b]/10"
                              : isLight
                                ? "bg-white border-emerald-600 shadow-sm"
                                : "border-emerald-600 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-900/20 bg-[#111111]/90"
                            : isSepia
                              ? "bg-white/40 border-[#ebd6bd]/40 hover:border-[#ebd6bd]/80 hover:bg-white/80"
                              : isLight
                                ? "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-white"
                                : "border-zinc-900 bg-[#111111]/90 hover:border-zinc-850 hover:bg-[#121212]"
                        }`}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -left-3 flex flex-col gap-1.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm transition-all duration-200 ${
                            isLineSelected
                              ? "bg-emerald-600 text-white"
                              : isSepia
                                ? "bg-[#ebd6bd] text-[#5c3c26]"
                                : isLight
                                  ? "bg-zinc-200 text-zinc-650"
                                  : "bg-zinc-900 text-zinc-500"
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
                                  className={`font-serif leading-none group-hover/word:text-emerald-500 transition-colors select-all font-medium whitespace-nowrap ${
                                    isSepia
                                      ? "text-[#3d2414]"
                                      : isLight
                                        ? "text-zinc-900"
                                        : "text-zinc-100"
                                  }`}
                                  style={{ fontSize: `${config.fontSizeArabic}px` }}
                                >
                                  {w.arabic}
                                </span>
                                
                                {/* Annotation lines */}
                                <div className="flex flex-col items-center select-none" dir="ltr">
                                  {w.symbol && (
                                    <span className={`text-[10px] px-1 font-mono rounded border font-semibold mb-0.5 leading-none py-0.5 ${
                                      isSepia
                                        ? "bg-[#faf4e6] text-[#8c4f2b] border-[#ebd6bd]/80"
                                        : isLight
                                          ? "bg-zinc-100 text-emerald-700 border-zinc-200"
                                          : "bg-zinc-900 text-emerald-400 border-zinc-800/60"
                                    }`} title={`Kedudukan irab Nahwu: ${w.symbol}`}>
                                      {w.symbol}
                                    </span>
                                  )}
                                  <span className={`text-[11px] font-sans whitespace-nowrap text-center max-w-[130px] overflow-hidden text-ellipsis italic tracking-tight leading-3 ${
                                    isSepia
                                      ? "text-[#5c3c26]"
                                      : isLight
                                        ? "text-zinc-650"
                                        : "text-[#8e8d8d]"
                                  }`}>
                                    {w.makna || ""}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Full continuous Arabic rendering without separation
                          <p
                            className={`text-right font-serif leading-loose font-medium select-all ${
                              isSepia ? "text-[#3d2414]" : isLight ? "text-zinc-900" : "text-zinc-100"
                            }`}
                            dir="rtl"
                            style={{ fontSize: `${config.fontSizeArabic}px` }}
                          >
                            {line.arabicFull}
                          </p>
                        )}

                        {/* Separator line when selected */}
                        {isLineSelected && (
                          <div className={`h-px my-3 ${isSepia ? "bg-[#ebd6bd]" : isLight ? "bg-zinc-200" : "bg-zinc-850"}`}></div>
                        )}

                        {/* Ind Indonesia or translation annotations */}
                        {config.showFullTranslation && (
                          <div className="mt-2.5 flex items-start gap-2" dir="ltr">
                            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                              isSepia
                                ? "text-[#8c4f2b] bg-[#ebd6bd]/40 border border-[#ebd6bd]/60"
                                : isLight
                                  ? "text-emerald-700 bg-emerald-50 border border-emerald-150"
                                  : "text-emerald-600 bg-emerald-950/40 border border-emerald-900/40"
                            }`}>
                              ID
                            </span>
                            <p
                              style={{ fontSize: `${config.fontSizeTranslation}px` }}
                              className={`font-sans leading-relaxed ${
                                isSepia ? "text-[#3d2414]" : isLight ? "text-zinc-800" : "text-zinc-300"
                              }`}
                            >
                              {line.translationFull || <span className="text-zinc-500 italic">Belum ada terjemahan penuh...</span>}
                            </p>
                          </div>
                        )}

                        {/* Scholastic structure layers (Matan, Syarah, Hasyiyah, Ta'liq) */}
                        {config.showNotes && (
                          <div className={`mt-2 space-y-2 border-t pt-2 flex flex-col gap-1.5 ${
                            isSepia ? "border-[#ebd6bd]" : isLight ? "border-zinc-200" : "border-zinc-900"
                          }`} dir="ltr">
                            {/* 1. Matan */}
                            {((config.showMatan !== false) && line.matan) && (
                              <div className="text-xs flex items-start gap-2">
                                <span className={`text-[9px] tracking-wider font-extrabold px-1.5 py-0.5 rounded leading-none mt-0.5 ${
                                  isSepia
                                    ? "text-[#8c4f2b] bg-amber-50 border border-amber-200"
                                    : "text-amber-500 bg-amber-950/40 border border-amber-900/40"
                                }`}>
                                  MATAN
                                </span>
                                <p className={`font-sans leading-relaxed font-medium ${
                                  isSepia ? "text-amber-900" : "text-amber-200/90"
                                }`}>
                                  {line.matan}
                                </p>
                              </div>
                            )}

                            {/* 2. Syarah (fallback to notes if syarah is not populated yet) */}
                            {((config.showSyarah !== false) && (line.syarah || line.notes)) && (
                              <div className="text-xs flex items-start gap-2">
                                <span className={`text-[10px] tracking-wider font-extrabold px-1.5 py-0.5 rounded leading-none mt-0.5 ${
                                  isSepia
                                    ? "text-emerald-800 bg-emerald-50 border border-emerald-2001"
                                    : "text-emerald-500 bg-emerald-950/40 border border-emerald-900/40"
                                }`}>
                                  SYARAH
                                </span>
                                <p className={`font-sans leading-relaxed ${
                                  isSepia ? "text-[#3d2414]" : isLight ? "text-zinc-850" : "text-zinc-350"
                                }`}>
                                  {line.syarah || line.notes}
                                </p>
                              </div>
                            )}

                            {/* 3. Hasyiyah */}
                            {((config.showHasyiyah !== false) && line.hasyiyah) && (
                              <div className={`text-xs flex items-start gap-2 pl-2 rounded ${
                                isSepia
                                  ? "border-l border-[#8c4f2b]/45 bg-[#ebd6bd]/20"
                                  : isLight
                                    ? "border-l border-indigo-200 bg-indigo-50/50"
                                    : "border-l border-indigo-900/60 bg-indigo-950/10 py-1"
                              }`}>
                                <span className={`text-[9px] tracking-wider font-extrabold px-1.5 py-0.5 rounded leading-none mt-0.5 ${
                                  isSepia
                                    ? "text-indigo-800 bg-indigo-50 border border-indigo-200"
                                    : "text-indigo-400 bg-indigo-950/50 border border-indigo-900/40"
                                }`}>
                                  HASYIYAH
                                </span>
                                <p className={`font-sans italic leading-relaxed ${
                                  isSepia ? "text-[#5c3c26]" : isLight ? "text-zinc-650" : "text-zinc-400"
                                }`}>
                                  {line.hasyiyah}
                                </p>
                              </div>
                            )}

                            {/* 4. Ta'liq */}
                            {((config.showTaliq !== false) && line.taliq) && (
                              <div className={`text-[11px] flex items-start gap-2 py-1 px-1 rounded border ${
                                isSepia
                                  ? "bg-[#faf4e6] border-[#ebd6bd]"
                                  : isLight
                                    ? "bg-zinc-150/40 border-zinc-200"
                                    : "bg-rose-950/5 border-rose-950/10"
                              }`}>
                                <span className={`text-[8px] tracking-wider font-extrabold px-1.5 py-0.5 rounded leading-none mt-0.5 ${
                                  isSepia
                                    ? "text-rose-800 bg-rose-50 border border-rose-200"
                                    : "text-rose-400 bg-rose-950/30 border border-rose-900/30"
                                }`}>
                                  TA'LIQ
                                </span>
                                <p className={`font-sans leading-relaxed italic ${
                                  isSepia ? "text-[#5c3c26]/80" : isLight ? "text-zinc-550" : "text-zinc-500"
                                }`}>
                                  {line.taliq}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteLine(line.id, e)}
                            className={`p-1 px-1.5 rounded transition border ${
                              isSepia
                                ? "bg-[#faf4e6] text-[#8c4f2b] border-[#ebd6bd] hover:bg-rose-100 hover:text-red-600 hover:border-rose-200"
                                : isLight
                                  ? "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-rose-50 hover:text-red-600 hover:border-rose-200"
                                  : "bg-zinc-900 text-zinc-650 hover:text-red-400 border border-zinc-800"
                            }`}
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
                  <div className="p-8 text-center text-[#555555] italic space-y-2">
                    <p className="text-xs">Pilih salah satu baris paragraf kitab di panel kiri/tengah untuk memuat perkakas editor.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
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
                
                {/* Right Sidebar Tab switchers */}
                <div className="p-2 bg-zinc-950 border-b border-zinc-900 flex gap-1 shrink-0">
                  <button
                    onClick={() => setRightSidebarTab("kamus")}
                    className={`flex-1 py-1.5 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider text-center transition flex items-center justify-center gap-1 border cursor-pointer ${
                      rightSidebarTab === "kamus"
                        ? "bg-[#0b2f1a]/80 text-[#59ff9b] border-[#165030]/60 font-bold"
                        : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-350 hover:bg-zinc-900/40"
                    }`}
                  >
                    <BookMarked size={12} />
                    <span>Kamus & Cari</span>
                  </button>
                  <button
                    onClick={() => setRightSidebarTab("kamera")}
                    className={`flex-1 py-1.5 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider text-center transition flex items-center justify-center gap-1 border cursor-pointer ${
                      rightSidebarTab === "kamera"
                        ? "bg-[#0b2f1a]/80 text-[#59ff9b] border-[#165030]/60 font-bold"
                        : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-350 hover:bg-zinc-900/40"
                    }`}
                  >
                    <Camera size={12} />
                    <span>Kamera Referensi</span>
                  </button>
                </div>

                {rightSidebarTab === "kamus" ? (
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Dictionary and Project search */}
                    {/* Nav tabs for search tool (Kamus vs Naskah search) */}
                    <div className="p-4 border-b border-zinc-900 space-y-4 shrink-0">
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
                            className={`px-2 py-0.5 rounded-full text-[9px] transition-all font-semibold cursor-pointer ${
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
                              className="absolute bottom-2.5 right-2 px-1 py-0.5 rounded bg-zinc-900 text-zinc-700 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                              title="Hapus kata dari kamus"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Custom Interactive additions to the Dictionary */}
                    <div className="p-3 border-y border-zinc-900 bg-zinc-950/50 space-y-3 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7] block">
                        Tambah Kosakata Kamus Populer
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Lafadz Arab (contoh: رَحِمَ)"
                          value={newKamusKeyword}
                          onChange={(e) => setNewKamusKeyword(e.target.value)}
                          className="w-full bg-[#1c1c1c] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Terjemahan (contoh: Mengasihi)"
                          value={newKamusTranslation}
                          onChange={(e) => setNewKamusTranslation(e.target.value)}
                          className="w-full bg-[#1c1c1c] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <select
                          value={newKamusCategory}
                          onChange={(e) => setNewKamusCategory(e.target.value)}
                          className="bg-[#1c1c1c] border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-300 focus:outline-none cursor-pointer"
                        >
                          <option value="Umum">Umum</option>
                          <option value="Nahwu">Nahwu</option>
                          <option value="Shorof">Shorof</option>
                          <option value="Fiqh">Fiqh</option>
                          <option value="Tasawwuf">Tasawwuf</option>
                        </select>

                        <button
                          onClick={handleAddKamusItem}
                          className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] text-white font-bold whitespace-nowrap cursor-pointer"
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
                          className="text-[9.5px] font-bold text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-none"
                        >
                          Unggah CSV
                        </button>
                      </div>
                    </div>

                    {/* Global Project search section */}
                    <div className="p-3.5 bg-zinc-950/80 border-t border-zinc-900 space-y-3 shrink-0">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block flex items-center justify-between">
                        <span>Pencarian Kitab Utama</span>
                        <span className="text-[9px] text-indigo-400 lowercase">(ignore harakat)</span>
                      </span>
                      
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari lafadz atau terjemah..."
                          value={kitabSearch}
                          onChange={(e) => setKitabSearch(e.target.value)}
                          className="w-full bg-[#161616] border border-zinc-850 rounded pl-3 pr-8 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-600"
                        />
                        {kitabSearch.trim().length > 0 && (
                          <button
                            onClick={() => setKitabSearch("")}
                            className="absolute right-2.5 top-2.5 text-zinc-600 hover:text-white text-[12px] font-bold leading-none cursor-pointer"
                            title="Kosongkan"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Advanced Filters Area */}
                      <div className="bg-zinc-900/40 border border-zinc-900 rounded p-2 text-y-2 mt-1 space-y-2">
                        <div className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wide flex justify-between items-center">
                          <span>Filter Lanjutan</span>
                          {(kitabSearchCategory !== "Semua" || kitabSearchStartChapterId !== "all" || kitabSearchEndChapterId !== "all") && (
                            <button
                              onClick={() => {
                                setKitabSearchCategory("Semua");
                                setKitabSearchStartChapterId("all");
                                setKitabSearchEndChapterId("all");
                              }}
                              className="text-amber-500 hover:text-amber-400 capitalize font-semibold text-[8px] cursor-pointer bg-transparent"
                            >
                              Reset Filter
                            </button>
                          )}
                        </div>

                        {/* 1. Kategori Filter */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-400 block font-medium">Berdasarkan Kategori:</span>
                          <select
                            value={kitabSearchCategory}
                            onChange={(e) => setKitabSearchCategory(e.target.value)}
                            className="w-full bg-[#161616] border border-zinc-850 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none cursor-pointer"
                          >
                            <option value="Semua">Semua Kategori</option>
                            <option value="Umum">Umum</option>
                            <option value="Nahwu">Nahwu</option>
                            <option value="Shorof">Shorof</option>
                            <option value="Fiqh">Fiqh</option>
                            <option value="Tasawwuf">Tasawwuf</option>
                            <option value="Tauhid">Tauhid</option>
                            <option value="Hadits">Hadits</option>
                            <option value="Tafsir">Tafsir</option>
                          </select>
                        </div>

                        {/* 2. Rentang Bab Filter */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-400 block font-medium">Rentang Bab:</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <span className="text-[8px] text-zinc-500 block leading-none mb-0.5">Dari Bab:</span>
                              <select
                                value={kitabSearchStartChapterId}
                                onChange={(e) => setKitabSearchStartChapterId(e.target.value)}
                                className="w-full bg-[#161616] border border-zinc-850 rounded px-1.5 py-1 text-[9px] text-zinc-300 focus:outline-none cursor-pointer truncate"
                              >
                                <option value="all">Mulai Pertama</option>
                                {project.chapters.map((ch, i) => (
                                  <option key={ch.id} value={ch.id}>
                                    {"Bab " + (i + 1) + ": " + ch.title.substring(0, 16)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[8px] text-zinc-500 block leading-none mb-0.5">Sampai Bab:</span>
                              <select
                                value={kitabSearchEndChapterId}
                                onChange={(e) => setKitabSearchEndChapterId(e.target.value)}
                                className="w-full bg-[#161616] border border-zinc-850 rounded px-1.5 py-1 text-[9px] text-zinc-300 focus:outline-none cursor-pointer truncate"
                              >
                                <option value="all">Hingga Akhir</option>
                                {project.chapters.map((ch, i) => (
                                  <option key={ch.id} value={ch.id}>
                                    {"Bab " + (i + 1) + ": " + ch.title.substring(0, 16)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status & Results */}
                      {kitabSearch.trim().length >= 2 && (
                        <div className="text-[9px] text-zinc-500 italic px-0.5 flex justify-between pt-1">
                          <span>Hasil pencarian:</span>
                          <span className="text-emerald-400 font-bold">{matchingLineSearchResults.length} baris cocok</span>
                        </div>
                      )}
                      
                      {kitabSearch.trim().length >= 2 && (
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 scrollbar-thin scrollbar-thumb-zinc-800">
                          {matchingLineSearchResults.length === 0 ? (
                            <span className="text-[9.5px] text-zinc-600 italic block text-center py-2">Tidak ada hasil cocok.</span>
                          ) : (
                            matchingLineSearchResults.map((res, i) => {
                              const chIdx = project.chapters.findIndex(c => c.title === res.chapterTitle);
                              return (
                                <div
                                  key={i}
                                  onClick={() => {
                                    const matchedCh = project.chapters.find(ch => 
                                      ch.sections.some(s => s.id === res.line.id || s.lines.some(l => l.id === res.line.id))
                                    ) || project.chapters.find(ch => ch.title === res.chapterTitle);
                                    
                                    if (matchedCh) {
                                      setActiveChapterId(matchedCh.id);
                                      const matchedSec = matchedCh.sections.find(s => 
                                        s.lines.some(l => l.id === res.line.id)
                                      );
                                      if (matchedSec) {
                                        setActiveSectionId(matchedSec.id);
                                      }
                                    }
                                    setActiveLineId(res.line.id);
                                    showNotif(`Menampilkan hasil #${i + 1}`, "info");
                                  }}
                                  className="p-1.5 rounded bg-[#151515] hover:bg-[#1f1f1f] border border-zinc-900 hover:border-zinc-800 transition text-[10px] text-zinc-300 cursor-pointer flex flex-col space-y-0.5 text-left"
                                >
                                  <div className="flex justify-between text-[8px] text-zinc-500 font-semibold space-x-1">
                                    <span className="uppercase text-indigo-400 truncate max-w-[110px]">Bab {chIdx !== -1 ? chIdx + 1 : ""} - {res.chapterTitle}</span>
                                    <span className="truncate max-w-[110px]">◈ {res.sectionTitle}</span>
                                  </div>
                                  <p className="text-emerald-400 font-bold font-serif text-right pr-1 truncate animate-fade-in" dir="rtl">
                                    {res.line.arabicFull}
                                  </p>
                                  <p className="text-[9px] text-zinc-550 italic truncate pl-1">
                                    {res.line.translationFull || "Belum ada terjemahan..."}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Statistics and Information status block */}
                    <div className="p-4 border-t border-zinc-900 mt-auto bg-zinc-950/40 shrink-0">
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
                ) : (
                  /* CAMERA REFERENCE VIEW PANEL */
                  <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7] flex items-center gap-1.5">
                        <Camera size={14} className="text-emerald-500" />
                        <span>Kamera Referensi Kitab</span>
                      </h2>
                      {capturedRefImage && (
                        <button
                          onClick={resetViewport}
                          className="text-[9px] text-[#eab308] hover:underline font-semibold bg-transparent border-none cursor-pointer"
                        >
                          Reset Posisi
                        </button>
                      )}
                    </div>

                    {/* Camera active live stream OR captured static image image viewing */}
                    {isCameraActive ? (
                      <div className="relative rounded-lg overflow-hidden border border-emerald-900 bg-black flex flex-col shadow-2xl animate-pulse">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-56 object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 to-transparent flex gap-2 justify-center">
                          <button
                            onClick={handleCapturePhoto}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 hover:scale-105 active:scale-95 transition cursor-pointer"
                          >
                            <Camera size={13} />
                            <span>Ambil Foto</span>
                          </button>
                          <button
                            onClick={() => setIsCameraActive(false)}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10.5px] rounded cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : capturedRefImage ? (
                      /* ACTIVE CANVAS REF PANEL */
                      <div className="space-y-3 flex flex-col self-stretch">
                        <div
                          className="w-full h-[280px] bg-zinc-950 rounded-lg border border-zinc-805 relative overflow-hidden select-none cursor-grab active:cursor-grabbing group/viewport shadow-inner"
                          onMouseDown={handleRefMouseDown}
                          onMouseMove={handleRefMouseMove}
                          onMouseUp={handleRefMouseUpOrLeave}
                          onMouseLeave={handleRefMouseUpOrLeave}
                          onTouchStart={handleRefTouchStart}
                          onTouchMove={handleRefTouchMove}
                          onTouchEnd={handleRefMouseUpOrLeave}
                        >
                          <img
                            src={capturedRefImage}
                            alt="Manuscript reference view"
                            draggable={false}
                            className="absolute pointer-events-none origin-center"
                            style={{
                              transform: `translate(${cameraPanX}px, ${cameraPanY}px) scale(${cameraZoom}) rotate(${cameraRotate}deg)`,
                              filter: `brightness(${cameraBrightness}%) contrast(${cameraContrast}%)`,
                              transition: isPanning ? "none" : "transform 0.15s ease-out, filter 0.1s ease-out"
                            }}
                          />
                          {/* Instructions overlay */}
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/80 border border-zinc-800/80 text-[8.5px] text-zinc-400 pointer-events-none opacity-0 group-hover/viewport:opacity-100 transition-opacity">
                            Drag untuk menggeser naskah / Zoom di bawah
                          </div>
                        </div>

                        {/* Control panel options for enhancement rendering */}
                        <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-lg space-y-3.5">
                          {/* ZOOMING SECTION */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] text-zinc-400">
                              <span className="font-semibold text-zinc-300">Magnifikasi (Zoom):</span>
                              <span className="font-mono text-emerald-400 font-bold">{Math.round(cameraZoom * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCameraZoom(p => Math.max(0.5, p - 0.2))}
                                className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded font-bold transition flex items-center justify-center text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="range"
                                min="0.5"
                                max="4"
                                step="0.1"
                                value={cameraZoom}
                                onChange={(e) => setCameraZoom(parseFloat(e.target.value))}
                                className="flex-1 accent-emerald-500 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
                              />
                              <button
                                onClick={() => setCameraZoom(p => Math.min(4, p + 0.2))}
                                className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded font-bold transition flex items-center justify-center text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* CAMERA 90 ROTATOR */}
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-900">
                            <span className="font-semibold text-[#a855f7]">Orientasi Halaman:</span>
                            <button
                              onClick={() => setCameraRotate(r => (r + 90) % 360)}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-200 text-[10px] flex items-center gap-1.5 font-bold transition cursor-pointer"
                            >
                              <RotateCw size={11} className="text-teal-400" />
                              <span>Putar 90°</span>
                            </button>
                          </div>

                          {/* BRIGHTNESS CONTROL */}
                          <div className="space-y-1.5 border-t border-zinc-900 pt-2.5">
                            <div className="flex justify-between items-center text-[10px] text-zinc-400">
                              <span>Pencahayaan (Brightness):</span>
                              <span className="font-mono text-zinc-300 font-semibold">{cameraBrightness}%</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="200"
                              value={cameraBrightness}
                              onChange={(e) => setCameraBrightness(parseInt(e.target.value))}
                              className="w-full accent-indigo-500 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* CONTRAST IMPROVEMENT */}
                          <div className="space-y-1.5 border-t border-zinc-900 pt-2.5">
                            <div className="flex justify-between items-center text-[10px] text-zinc-400">
                              <span>Ketajaman Teks (Contrast):</span>
                              <span className="font-mono text-zinc-300 font-semibold">{cameraContrast}%</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="200"
                              value={cameraContrast}
                              onChange={(e) => setCameraContrast(parseInt(e.target.value))}
                              className="w-full accent-[#a855f7] h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* DUAL BUTTON ACTIONS FOR RE-CAMERA OR TERMINATION */}
                          <div className="flex gap-2 border-t border-zinc-900 pt-3 text-[10.5px]">
                            <button
                              onClick={() => setIsCameraActive(true)}
                              className="flex-1 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-zinc-800 text-zinc-100 rounded font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Camera size={12} className="text-emerald-500" />
                              <span>Ambil Ulang</span>
                            </button>
                            <button
                              onClick={handleDeleteRefImage}
                              className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-900/30 text-red-400 rounded font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* BLANK/EMPTY REFERENCE PLACEHOLDER STATE */
                      <div className="p-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center space-y-4 flex flex-col justify-center items-center py-10">
                        <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-550 shadow-inner">
                          <Image size={22} className="text-emerald-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Tidak ada referensi visual</p>
                          <p className="text-[10px] text-zinc-500 leading-relaxed max-w-[240px]">
                            Gunakan kamera untuk mengambil foto halaman kitab asli Anda, atau unggah file gambar lokal naskah agar dapat mendayagunakan contekan visual interaktif di panel editor ini.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 w-full pt-2">
                          <button
                            onClick={() => setIsCameraActive(true)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition shadow cursor-pointer"
                          >
                            <Camera size={13} />
                            <span>Buka Kamera Hub</span>
                          </button>
                          
                          <button
                            onClick={() => visualRefLoaderRef.current?.click()}
                            className="w-full py-1.5 bg-[#141414] hover:bg-[#1f1f1f] border border-zinc-800 text-zinc-400 font-bold text-[10.5px] rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Upload size={12} />
                            <span>Unggah Referensi Berkas</span>
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            ref={visualRefLoaderRef}
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

                    {/* Kitab Kuning Margin Layout selection */}
                    <div className="border-t border-zinc-900 pt-3 mt-3">
                      <span className="text-[9.5px] uppercase font-bold tracking-widest text-[#abafb5] block mb-2">Formatur Tata Letak Hamis (Margin)</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setExportMarginLayout("standard")}
                          className={`py-2 px-1 rounded-md border text-center transition-all cursor-pointer ${
                            exportMarginLayout === "standard"
                              ? "bg-amber-950/15 border-amber-600/70 text-amber-300 font-bold text-[9.5px]"
                              : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-700 text-[9.5px]"
                          }`}
                        >
                          <p>Tumpuk</p>
                          <span className="text-[7.5px] text-zinc-500 font-normal block mt-0.5">Mendatar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExportMarginLayout("left")}
                          className={`py-2 px-1 rounded-md border text-center transition-all cursor-pointer ${
                            exportMarginLayout === "left"
                              ? "bg-amber-950/15 border-amber-600/70 text-amber-300 font-bold text-[9.5px]"
                              : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-700 text-[9.5px]"
                          }`}
                        >
                          <p>Hamis Kiri</p>
                          <span className="text-[7.5px] text-zinc-500 font-normal block mt-0.5">1 Sisi Pinggir</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExportMarginLayout("both")}
                          className={`py-2 px-1 rounded-md border text-center transition-all cursor-pointer ${
                            exportMarginLayout === "both"
                              ? "bg-amber-950/15 border-amber-600/70 text-amber-300 font-bold text-[9.5px]"
                              : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-700 text-[9.5px]"
                          }`}
                        >
                          <p>Dua Sisi</p>
                          <span className="text-[7.5px] text-zinc-500 font-normal block mt-0.5">Kiri & Kanan</span>
                        </button>
                      </div>
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

      {/* Dynamic PDF Reader & Parser Modal Dialog */}
      {showPdfModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-40 transition-all duration-300">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] md:h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-150 uppercase tracking-wide">Penafsir & Pendeteksi Naskah PDF</h3>
                  <p className="text-[10px] text-zinc-500">Membaca isi kitab PDF kepingan, mengidentifikasi teks Arab, dan memetakannya otomatis</p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-zinc-550 hover:text-zinc-300 p-1.5 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body Grid */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-zinc-950/20">
              {/* Left Column: Import Settings */}
              <div className="w-full md:w-[350px] bg-[#161616] p-5 border-b md:border-b-0 md:border-r border-zinc-900 overflow-y-auto shrink-0 space-y-5 flex flex-col text-xs text-zinc-300">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Struktur Bab Impor</span>
                  <div className="space-y-3.5 bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-850/60 mt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Target Bab:</label>
                      <select
                        value={pdfTargetChapterId}
                        onChange={(e) => setPdfTargetChapterId(e.target.value)}
                        className="w-full bg-[#0d0d0d] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 font-medium focus:border-red-500 text-xs cursor-pointer"
                      >
                        <option value="new">+ Buat Bab Baru</option>
                        {project.chapters.map(ch => (
                          <option key={ch.id} value={ch.id}>{ch.title}</option>
                        ))}
                      </select>
                    </div>

                    {pdfTargetChapterId === "new" && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Nama Bab Baru:</label>
                          <input
                            type="text"
                            value={pdfNewChapterTitle}
                            onChange={(e) => setPdfNewChapterTitle(e.target.value)}
                            placeholder="Contoh: Bab Bersuci (Thaharah)"
                            className="w-full bg-[#0d0d0d] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 font-medium focus:border-red-500 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Kategori Jenis:</label>
                          <select
                            value={pdfNewChapterCategory}
                            onChange={(e) => setPdfNewChapterCategory(e.target.value)}
                            className="w-full bg-[#0d0d0d] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 font-medium focus:border-red-500 text-xs cursor-pointer"
                          >
                            <option value="Umum">Umum</option>
                            <option value="Nahwu">Nahwu</option>
                            <option value="Shorof">Shorof</option>
                            <option value="Fiqh">Fiqh</option>
                            <option value="Tasawwuf">Tasawwuf</option>
                            <option value="Tauhid">Tauhid</option>
                            <option value="Hadits">Hadits</option>
                            <option value="Tafsir">Tafsir</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Model Penyelaras Baris</span>
                  <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-850/60 mt-1">
                    <label className="flex items-start gap-2 cursor-pointer pb-2 border-b border-zinc-850/40">
                      <input
                        type="radio"
                        name="pdfPairMode"
                        checked={pdfPairingMode === "smart"}
                        onChange={() => handleRecalculatePdfRows("smart")}
                        className="mt-0.5 accent-red-500 text-red-500"
                      />
                      <div>
                        <p className="font-bold text-zinc-250">Sandingkan Arab-Latin Otomatis</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Sistem mendeteksi tulisan Arab dan memasangkannya dengan kalimat terjemah di bawahnya jadi satu baris tunggal.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer pt-2">
                      <input
                        type="radio"
                        name="pdfPairMode"
                        checked={pdfPairingMode === "separate"}
                        onChange={() => handleRecalculatePdfRows("separate")}
                        className="mt-0.5 accent-red-500 text-red-500"
                      />
                      <div>
                        <p className="font-bold text-zinc-250">Impor Baris Terpisah</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Impor setiap baris tulisan terdeteksi secara utuh terpisah satu-satu.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-red-950/20 rounded-lg p-3 text-red-400 space-y-1 border border-red-900/10 leading-relaxed text-[10px] mt-auto">
                  <p className="font-bold uppercase tracking-wider text-[10px]">Tinjauan Aturan Saku:</p>
                  <p>Anda dapat mencentang/menghapus baris yang akan diimpor, atau mengoreksi lafadz & makna secara langsung dari kolom pratinjau sebelum tombol diterapkan.</p>
                </div>
              </div>

              {/* Right Column: Previews Grid */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-5 py-3 bg-zinc-900/40 border-b border-zinc-900 shrink-0 flex items-center justify-between text-xs text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-150 uppercase tracking-wide">Tabel Hasil Penyandingan ({pdfParsedRows.length} baris)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPdfParsedRows(prev => prev.map(r => ({ ...r, isSelected: true })))}
                      className="text-[10px] hover:text-zinc-200 transition bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      onClick={() => setPdfParsedRows(prev => prev.map(r => ({ ...r, isSelected: false })))}
                      className="text-[10px] hover:text-zinc-200 transition bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  </div>
                </div>

                {/* Grid List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {pdfParsedRows.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                      Teks belum diekstrak atau kosong.
                    </div>
                  ) : (
                    pdfParsedRows.map((row, rIdx) => (
                      <div
                        key={row.id}
                        className={`flex gap-3 p-3 rounded-lg border transition-all ${
                          row.isSelected
                            ? "bg-[#18181b]/50 border-zinc-800"
                            : "bg-[#18181b]/10 border-zinc-950 opacity-40"
                        }`}
                      >
                        {/* Checkbox and Index */}
                        <div className="flex flex-col items-center justify-start pt-1.5 shrink-0 select-none">
                          <input
                            type="checkbox"
                            checked={row.isSelected}
                            onChange={() => {
                              setPdfParsedRows(prev => prev.map(r => r.id === row.id ? { ...r, isSelected: !r.isSelected } : r));
                            }}
                            className="accent-rose-500 scale-105 cursor-pointer"
                          />
                          <span className="text-[9px] text-zinc-650 mt-2 font-mono">#{rIdx + 1}</span>
                        </div>

                        {/* Editing fields */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                          {/* Arabic Input */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block font-mono">Lafadz Arab:</span>
                            <textarea
                              value={row.arabic}
                              dir="rtl"
                              onChange={(e) => {
                                const v = e.target.value;
                                setPdfParsedRows(prev => prev.map(r => r.id === row.id ? { ...r, arabic: v } : r));
                              }}
                              className="w-full bg-[#121212] border border-zinc-800/80 text-emerald-400 font-serif text-lg p-2.5 rounded focus:outline-none focus:border-emerald-600 leading-normal"
                              rows={2}
                            />
                          </div>

                          {/* Translation Input */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-rose-450 font-bold uppercase tracking-wider block font-mono">Makna / Terjemah:</span>
                            <textarea
                              value={row.translation}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPdfParsedRows(prev => prev.map(r => r.id === row.id ? { ...r, translation: v } : r));
                              }}
                              className="w-full bg-[#121212] border border-zinc-800/80 text-zinc-300 text-xs p-2.5 rounded focus:outline-none focus:border-rose-800 leading-relaxed"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-zinc-500 italic">Sistem membagi lafadz menjadi perkakas kata individual otomatis agar transliterasi bekerja seketika.</span>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleApplyPdfImport}
                  className="px-5 py-2 bg-[#8c1d1d] hover:bg-[#a12323] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-[#4a0e0e]/20 transition cursor-pointer"
                >
                  <Check size={13} />
                  <span>Selesaikan Impor PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* pdfLoading Backdrop */}
      {pdfLoading && (
        <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3.5 z-50">
          <div className="w-10 h-10 rounded-full border-4 border-[#3a1515] border-t-red-500 animate-spin"></div>
          <div className="text-center space-y-1">
            <p className="text-sm text-zinc-200 font-bold tracking-wide">Pendeteksi Auto-Baca PDF kepingan</p>
            <p className="text-xs text-zinc-500 animate-pulse">{pdfParsingStatus}</p>
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
