/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Keyboard, Sparkles, BookMarked, HelpCircle, Info } from "lucide-react";
import { motion } from "motion/react";

interface ToolbarArabicProps {
  onInsertChar: (char: string) => void;
  isTransliterating: boolean;
  onToggleTransliteration: () => void;
  onTriggerWordBreakdown?: () => void;
  isProcessingBreakdown?: boolean;
}

export default function ToolbarArabic({
  onInsertChar,
  isTransliterating,
  onToggleTransliteration,
  onTriggerWordBreakdown,
  isProcessingBreakdown = false
}: ToolbarArabicProps) {
  // Virtual Keyboard states
  const [showVisualKeyboard, setShowVisualKeyboard] = useState(false);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({
    Control: false,
    Shift: false,
    Alt: false,
    b: false,
    d: false,
    t: false
  });

  const [lockedCtrl, setLockedCtrl] = useState(false);
  const [lockedShift, setLockedShift] = useState(false);
  const [lockedAlt, setLockedAlt] = useState(false);

  useEffect(() => {
    if (!showVisualKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => ({
        ...prev,
        Control: e.ctrlKey,
        Shift: e.shiftKey,
        Alt: e.altKey,
        b: key === 'b',
        d: key === 'd',
        t: key === 't'
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => ({
        ...prev,
        Control: e.ctrlKey,
        Shift: e.shiftKey,
        Alt: e.altKey,
        b: key === 'b' ? false : prev.b,
        d: key === 'd' ? false : prev.d,
        t: key === 't' ? false : prev.t
      }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const handleBlur = () => {
      setActiveKeys({ Control: false, Shift: false, Alt: false, b: false, d: false, t: false });
    };
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [showVisualKeyboard]);

  const isCtrl = activeKeys.Control || lockedCtrl;
  const isShift = activeKeys.Shift || lockedShift;
  const isAlt = activeKeys.Alt || lockedAlt;

  // Find character for each key based on current modifier state
  const getCharForB = () => {
    if (isCtrl && isAlt && isShift) return { char: "ٍ", name: "Kasratain" };
    if (isCtrl && isAlt) return { char: "ً", name: "Fathatain" };
    if (isCtrl && isShift) return { char: "ِ", name: "Kasrah" };
    if (isCtrl) return { char: "َ", name: "Fathah" };
    return { char: "", name: "Tahan Ctrl untuk pintasan" };
  };

  const getCharForD = () => {
    if (isCtrl && isAlt) return { char: "ٌ", name: "Dammatain" };
    if (isCtrl && isShift) return { char: "ْ", name: "Sukun" };
    if (isCtrl) return { char: "ُ", name: "Dammah" };
    return { char: "", name: "Tahan Ctrl untuk pintasan" };
  };

  const getCharForT = () => {
    if (isCtrl) return { char: "ّ", name: "Tasydid" };
    return { char: "", name: "Tahan Ctrl untuk pintasan" };
  };

  const bTarget = getCharForB();
  const dTarget = getCharForD();
  const tTarget = getCharForT();

  // Common Arabic diacritics
  const harakats = [
    { label: "Fathah", char: "َ", shortcut: "Ctrl+B" },
    { label: "Kasrah", char: "ِ", shortcut: "Ctrl+Shift+B" },
    { label: "Dammah", char: "ُ", shortcut: "Ctrl+D" },
    { label: "Sukun", char: "ْ", shortcut: "Ctrl+Shift+D" },
    { label: "Tasydid", char: "ّ", shortcut: "Ctrl+T" },
    { label: "Fathatain", char: "ً", shortcut: "Ctrl+Alt+B" },
    { label: "Kasratain", char: "ٍ", shortcut: "Ctrl+Alt+Shift+B" },
    { label: "Dammatain", char: "ٌ", shortcut: "Ctrl+Alt+D" },
  ];

  // Common Kitab Kuning symbolic markers used for Nahwu parsing
  const symbols = [
    { char: "ﷺ", desc: "Shollallahu 'alaihi wasallam" },
    { char: "م", desc: "Mubtada' (مبتدأ = Subjek)" },
    { char: "خ", desc: "Khabar (خبر = Predikat)" },
    { char: "ف", desc: "Fa'il (فاعل = Pelaku)" },
    { char: "مف", desc: "Ma'ful bih (مفعول به = Objek)" },
    { char: "ح", desc: "Hal (حال = Kondisi)" },
    { char: "ج", desc: "Jawab (جواب = Jawaban)" },
    { char: "ش", desc: "Syarat (شرط = Syarat)" },
    { char: "ص", desc: "Sifat / Na'at (صفة = Keterangan Sifat)" },
    { char: "إلخ", desc: "Ila akhirihi (إلى آخره = Dan seterusnya)" },
    { char: "ﺿ", desc: "Dlamir (ضمير)" },
    { char: "ﻉ", desc: "Amil (عامل)" },
    { char: "ﻕ", desc: "Qila (قيل = Dikatakan)" },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800 p-2.5 flex flex-col gap-2">
      {/* Top row: Interactive Options and Action Links */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleTransliteration}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              isTransliterating
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100/10 text-slate-700 dark:text-slate-300"
            }`}
            title="Ketik Latin untuk diubah otomatis menjadi teks Arab"
          >
            <Keyboard size={14} />
            <span>Transliterasi: {isTransliterating ? "Aktif" : "Nonaktif"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVisualKeyboard(!showVisualKeyboard)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              showVisualKeyboard
                ? "bg-amber-600 text-white hover:bg-amber-500 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100/10 text-slate-700 dark:text-slate-300"
            }`}
            title="Tampilkan Keyboard Visual interaktif untuk bantuan pintasan harakat"
          >
            <Keyboard size={14} className={showVisualKeyboard ? "text-amber-300" : ""} />
            <span>Keyboard Visual: {showVisualKeyboard ? "Terbuka" : "Tertutup"}</span>
          </button>

          {onTriggerWordBreakdown && (
            <button
               type="button"
               onClick={onTriggerWordBreakdown}
               disabled={isProcessingBreakdown}
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition-all disabled:opacity-50 cursor-pointer"
               title="Menganalisis kalimat Arab dan memecahnya otomatis per-kata menggunakan Gemini AI!"
            >
              <Sparkles size={14} className={isProcessingBreakdown ? "animate-pulse" : ""} />
              <span>{isProcessingBreakdown ? "Membedah..." : "Bedah Kata Arab (AI)"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <BookMarked size={14} />
          <span>Gunakan kombinasi tombol harakat (Contoh: Ctrl + B / Ctrl + Shift + B) sewaktu menulis.</span>
        </div>
      </div>

      {/* Expandable Interactive Keyboard Visual Map */}
      {showVisualKeyboard && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-slate-100 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3 space-y-3 overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800/80 pb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Keyboard size={12} className="text-amber-500 animate-pulse" />
              <span>Peta Keyboard Harakat Interaktif</span>
            </span>
            <span className="text-[10.5px] text-zinc-500">
              Tekan tombol fisik di keyboard atau mainkan tombol virtual untuk melacak harakat yang dihasilkan.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Left Box: Active/Composer Preview */}
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800/80 pb-3 md:pb-0 md:pr-4 flex flex-col justify-between space-y-2">
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">Status Modifiers</span>
                <div className="flex flex-wrap gap-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold select-none transition border ${
                    isCtrl
                      ? "bg-amber-100 dark:bg-amber-950/50 border-amber-400/60 text-amber-700 dark:text-amber-400"
                      : "bg-slate-200/50 dark:bg-zinc-900 border-transparent text-zinc-400"
                  }`}>Ctrl</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold select-none transition border ${
                    isShift
                      ? "bg-sky-100 dark:bg-sky-950/50 border-sky-400/60 text-sky-700 dark:text-sky-400"
                      : "bg-slate-200/50 dark:bg-zinc-900 border-transparent text-zinc-400"
                  }`}>Shift</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold select-none transition border ${
                    isAlt
                      ? "bg-purple-100 dark:bg-purple-950/50 border-purple-400/60 text-purple-700 dark:text-purple-400"
                      : "bg-slate-200/50 dark:bg-zinc-900 border-transparent text-zinc-400"
                  }`}>Alt</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 p-2 rounded border border-slate-200/60 dark:border-zinc-800/80 text-center shadow-sm">
                <span className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Komposisi Aktif</span>
                <div className="text-3xl font-extrabold text-amber-500 dark:text-amber-400 h-10 flex items-center justify-center font-sans">
                  {activeKeys.b && bTarget.char ? bTarget.char : activeKeys.d && dTarget.char ? dTarget.char : activeKeys.t && tTarget.char ? tTarget.char : "•"}
                </div>
                <div className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 h-4 truncate">
                  {activeKeys.b && bTarget.char ? `${bTarget.name} (B)` : activeKeys.d && dTarget.char ? `${dTarget.name} (D)` : activeKeys.t && tTarget.char ? `${tTarget.name} (T)` : "Tekan B, D, atau T"}
                </div>
              </div>
            </div>

            {/* Right Box: Visual Keyboard Modifiers + Keys */}
            <div className="md:col-span-3 space-y-3.5">
              {/* Virtual Modifiers Controls */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-zinc-900/30 p-1.5 rounded-md border border-slate-200/40 dark:border-zinc-800/40">
                <span className="text-[9px] font-black text-slate-400 mr-1 uppercase">Sakelar Virtual (Untuk Tablet/Mouse):</span>
                <button
                  type="button"
                  onClick={() => setLockedCtrl(!lockedCtrl)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-black transition cursor-pointer border ${
                    lockedCtrl
                      ? "bg-amber-600 border-amber-500 text-white shadow"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:border-amber-400"
                  }`}
                  title="Kunci tombol Ctrl untuk simulasi"
                >
                  Ctrl {lockedCtrl ? "🔒" : "🔓"}
                </button>
                <button
                  type="button"
                  onClick={() => setLockedShift(!lockedShift)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-black transition cursor-pointer border ${
                    lockedShift
                      ? "bg-sky-600 border-sky-500 text-white shadow"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:border-sky-400"
                  }`}
                  title="Kunci tombol Shift untuk simulasi"
                >
                  Shift {lockedShift ? "🔒" : "🔓"}
                </button>
                <button
                  type="button"
                  onClick={() => setLockedAlt(!lockedAlt)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-black transition cursor-pointer border ${
                    lockedAlt
                      ? "bg-purple-600 border-purple-500 text-white shadow"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:border-purple-400"
                  }`}
                  title="Kunci tombol Alt untuk simulasi"
                >
                  Alt {lockedAlt ? "🔒" : "🔓"}
                </button>

                {(lockedCtrl || lockedShift || lockedAlt) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLockedCtrl(false);
                      setLockedShift(false);
                      setLockedAlt(false);
                    }}
                    className="text-[9px] font-extrabold text-red-500 hover:text-red-400 hover:bg-red-50 pr-1 pl-1 border border-red-500/10 rounded cursor-pointer transition uppercase"
                  >
                    Bebaskan Kunci
                  </button>
                )}
              </div>

              {/* Mapped Keys (Interactive Matrix) */}
              <div className="grid grid-cols-3 gap-3">
                {/* T Key Box */}
                <button
                  type="button"
                  onClick={() => tTarget.char && onInsertChar(tTarget.char)}
                  disabled={!tTarget.char}
                  className={`flex flex-col items-center justify-between p-2.5 h-16 rounded-lg border text-center transition cursor-pointer relative ${
                    activeKeys.t
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-lg"
                      : tTarget.char
                      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 text-slate-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      : "bg-slate-100/50 dark:bg-zinc-900/20 border-slate-200/50 dark:border-zinc-800/50 text-slate-350 dark:text-zinc-600 opacity-50 cursor-not-allowed"
                  }`}
                  title="Klik untuk menyisipkan harakat Tasydid"
                >
                  <div className="absolute top-1 left-2 font-mono text-[9px] text-slate-400 font-extrabold select-none">T</div>
                  <div className="font-bold text-xl leading-none mt-1">
                    {tTarget.char || "-"}
                  </div>
                  <div className="text-[8.5.px] text-slate-500 dark:text-zinc-400 leading-none truncate w-full">
                    {tTarget.char ? tTarget.name : "Gunakan Ctrl"}
                  </div>
                </button>

                {/* D Key Box */}
                <button
                  type="button"
                  onClick={() => dTarget.char && onInsertChar(dTarget.char)}
                  disabled={!dTarget.char}
                  className={`flex flex-col items-center justify-between p-2.5 h-16 rounded-lg border text-center transition cursor-pointer relative ${
                    activeKeys.d
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-lg"
                      : dTarget.char
                      ? "bg-sky-50 dark:bg-sky-950/20 border-sky-305 dark:border-sky-900/60 text-slate-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30"
                      : "bg-slate-100/50 dark:bg-zinc-900/20 border-slate-200/50 dark:border-zinc-800/50 text-slate-350 dark:text-zinc-600 opacity-50 cursor-not-allowed"
                  }`}
                  title="Klik untuk menyisipkan harakat dammah, sukun, atau dammatain"
                >
                  <div className="absolute top-1 left-2 font-mono text-[9px] text-slate-400 font-extrabold select-none">D</div>
                  <div className="font-bold text-xl leading-none mt-1">
                    {dTarget.char || "-"}
                  </div>
                  <div className="text-[8.5px] text-slate-500 dark:text-zinc-400 leading-none truncate w-full">
                    {dTarget.char ? dTarget.name : "Gunakan Ctrl"}
                  </div>
                </button>

                {/* B Key Box */}
                <button
                  type="button"
                  onClick={() => bTarget.char && onInsertChar(bTarget.char)}
                  disabled={!bTarget.char}
                  className={`flex flex-col items-center justify-between p-2.5 h-16 rounded-lg border text-center transition cursor-pointer relative ${
                    activeKeys.b
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-lg"
                      : bTarget.char
                      ? "bg-indigo-50 dark:bg-purple-950/20 border-indigo-300 dark:border-purple-900/60 text-slate-800 dark:text-purple-305 hover:bg-indigo-100 dark:hover:bg-purple-900/30"
                      : "bg-slate-100/50 dark:bg-zinc-900/20 border-slate-200/50 dark:border-zinc-800/50 text-slate-350 dark:text-zinc-600 opacity-50 cursor-not-allowed"
                  }`}
                  title="Klik untuk menyisipkan fathah, kasrah, fathatain, atau kasratain"
                >
                  <div className="absolute top-1 left-2 font-mono text-[9px] text-slate-400 font-extrabold select-none">B</div>
                  <div className="font-bold text-xl leading-none mt-1">
                    {bTarget.char || "-"}
                  </div>
                  <div className="text-[8.5px] text-slate-500 dark:text-zinc-400 leading-none truncate w-full">
                    {bTarget.char ? bTarget.name : "Gunakan Ctrl"}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 bg-white/40 dark:bg-zinc-900/20 p-2 rounded border border-slate-200/40 dark:border-zinc-800/10">
            <Info size={11} className="text-amber-500" />
            <span className="leading-tight">
              <strong>Tips Menghafal:</strong> Tekan <code className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.2 rounded text-[9.5px]">Ctrl</code> untuk Harakat Utama. Tambahkan <code className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.2 rounded text-[9.5px]">Shift</code> untuk varian bawah/mati (Kasrah/Sukun). Tambahkan <code className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.2 rounded text-[9.5px]">Alt</code> untuk Tanwin.
            </span>
          </div>
        </motion.div>
      )}

      {/* Second row: Diacritics and Symbols Grid */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
        {/* Diacritics Subsection */}
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
            Harakat / Syakal
          </div>
          <div className="flex flex-wrap gap-1">
            {harakats.map((h, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onInsertChar(h.char)}
                className="group relative flex flex-col items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-md shadow-sm text-lg font-medium text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
              >
                <span className="leading-none mt-1">{h.char}</span>
                <span className="text-[9px] text-slate-400 leading-none mt-1 group-hover:text-emerald-500 transition-colors">
                  {h.label.substring(0, 4)}
                </span>
                
                {/* Custom Tooltip */}
                <div className="absolute bottom-11 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {h.label} <span className="text-slate-400 ml-1">({h.shortcut})</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Symbols Subsection */}
        <div className="sm:max-w-[45%]">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center gap-1">
            <span>Simbol Makna Pegon</span>
            <span className="cursor-help text-slate-500 hover:text-indigo-500 relative group">
              <HelpCircle size={10} />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[9px] rounded p-2 tracking-normal capitalize w-48 z-50 shadow-lg leading-tight pointer-events-none text-center">
                Simbol tradisional pesantren (م = mubtada, خ = khobar, dsb) untuk menerangkan kedudukan i'rab kata.
              </div>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {symbols.map((s, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onInsertChar(s.char)}
                className="group relative flex items-center justify-center min-w-8 h-10 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-md shadow-sm font-sans text-base text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                title={`${s.char}: ${s.desc}`}
              >
                <span className="font-sans font-medium text-slate-750 dark:text-slate-200">{s.char}</span>
                
                {/* Small popup description */}
                <div className="absolute bottom-11 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {s.desc}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
