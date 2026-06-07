/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Initialize GoogleGenAI client lazily to avoid crashing if the key is initially missing,
// although AI Studio guarantees its presence.
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. Gemini features will run in sandbox mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Ensure the browser sees clear API routes first
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLang = "indonesian", context = "" } = req.body;
    if (!text || text.trim() === "") {
       res.status(400).json({ error: "Text must not be empty" });
       return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Sandbox fallback if API key is not present during testing
      res.json({
        translation: `[Mock Translation] Terjemahan untuk: "${text}" ke ${targetLang === "pegon" ? "Bahasa Pegon" : "Bahasa Indonesia"}. (Harap setel API Key untuk terjemahan AI asli!)`
      });
      return;
    }

    const systemInstruction = targetLang === "pegon" 
      ? "You are an expert in Islamic classical literature (Kitab Kuning) and Javanese/Sunda/Malay languages written in Arab-Pegon script. Translate the given classical Arabic text directly into Arab-Pegon script for sublinear annotation (makna jandul/jenggot)."
      : "Anda adalah pakar penerjemah kitab kuning klasik berbahasa Arab ke dalam Bahasa Indonesia yang baku namun mudah dipahami secara keilmuan pesantren. Terjemahkan teks Arab ini dengan seakurat mungkin sesuai gramatika (Nahwu Shorof).";

    const prompt = `Terjemahkan teks Arab berikut ini:\n\nTeks Arab:\n${text}\n\n${context ? `Konteks/Syarah tambahan:\n${context}\n\n` : ""}Berikan langsung terjemahan terbaiknya secara utuh tanpa komentar tambahan.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    res.json({ translation: response.text?.trim() || "Tidak ada hasil." });
  } catch (error: any) {
    console.error("Translation error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

app.post("/api/word-breakdown", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
       res.status(400).json({ error: "Text must not be empty" });
       return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Sandbox fallback
      const mockWords = text.trim().split(/\s+/).map((w: string, i: number) => ({
        id: `mock-${i}`,
        arabic: w,
        makna: `Makna-${w}`,
        symbol: i === 0 ? "م" : "خ"
      }));
      res.json({ words: mockWords });
      return;
    }

    // Attempt to break down sentences into grammatical words with Pegon and Indonesian meanings
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Pecah kalimat atau kata Arab berikut menjadi kata per-kata atau frasa kecil untuk makna 'jenggot' pesantren.
Teks: "${text}"

Untuk setiap kata/frasa, berikan:
1. Kata Arab aslinya.
2. Makna bahasa Indonesia kasarnya (bisa dicampur Pegon Jawa jika relevan, misal: "utawi sekabehane puji / segala puji", "iku kagungane Allah / bagi Allah").
3. Kode Nahwu/Sintaksis yang sesuai dari daftar berikut:
   - "م" (Mubtada')
   - "خ" (Khabar)
   - "ف" (Fa'il)
   - "مف" (Ma'ful bih)
   - "ح" (Hal)
   - "ج" (Jawab)
   - "ش" (Syarat)
   - "ص" (Sifat / Na'at)
   - "" (jika tidak ada yang cocok)

Kembalikan dalam format JSON murni berupa array of objects.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              arabic: { type: Type.STRING, description: "Kata asli" },
              makna: { type: Type.STRING, description: "Makna melayu/indonesia jenggot" },
              symbol: { type: Type.STRING, description: "Kode nahwu singkat, maks 3 karakter seperti م atau خ atau ف atau empty" }
            },
            required: ["arabic", "makna"]
          }
        },
        temperature: 0.2,
      }
    });

    const wordsData = JSON.parse(response.text?.trim() || "[]");
    const wordsWithIds = wordsData.map((item: any, idx: number) => ({
      id: `word-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      arabic: item.arabic || "",
      makna: item.makna || "",
      symbol: item.symbol || ""
    }));

    res.json({ words: wordsWithIds });
  } catch (error: any) {
    console.error("Word breakdown error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Configure Vite middleware in development or static assets in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Kitab Scribe Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
