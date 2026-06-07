/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} from "docx";

import { KitabProject } from "../types";

export interface ExportOptions {
  scope: "all" | "current";
  currentChapterId?: string;
  showMakna: boolean;
  showSymbols: boolean;
  showTranslation: boolean;
  showNotes: boolean;
  showMatan?: boolean;
  showSyarah?: boolean;
  showHasyiyah?: boolean;
  showTaliq?: boolean;
  styleKitabKuning?: boolean;
  marginLayout?: "standard" | "left" | "both";
}

/**
 * Exports either the current chapter or the entire project to a well-formatted PDF file.
 * To achieve flawless RTL, complex Arabic character shaping, and perfect alignment of
 * sublinear "makna jenggot" text, this function utilizes the browser's native print engine
 * by creating a high-fidelity print template inside a temporary iframe.
 */
export function exportToPdf(project: KitabProject, options: ExportOptions): void {
  // Determine chapters to export
  const chapters = options.scope === "current" && options.currentChapterId
    ? project.chapters.filter(ch => ch.id === options.currentChapterId)
    : project.chapters;

  if (chapters.length === 0) {
    throw new Error("Tidak ada bab yang dapat diekspor.");
  }

  // Create an iframe to hold the printable content
  const printIframe = document.createElement("iframe");
  printIframe.style.position = "absolute";
  printIframe.style.width = "0px";
  printIframe.style.height = "0px";
  printIframe.style.border = "none";
  printIframe.style.left = "-2000px";
  printIframe.style.top = "-2000px";
  document.body.appendChild(printIframe);

  const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
  if (!iframeDoc) {
    throw new Error("Gagal menginisialisasi modul cetak dokumen.");
  }

  const showMatan = options.showMatan !== false;
  const showSyarah = options.showSyarah !== false;
  const showHasyiyah = options.showHasyiyah !== false;
  const showTaliq = options.showTaliq !== false;
  const useKitabKuningStyle = options.styleKitabKuning !== false;

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
          padding: 30px;
          direction: rtl;
        }

        /* Traditional Kitab Kuning Theme styling */
        .kitab-kuning-theme {
          background-color: #faf4e6 !important;
          color: #3d2414 !important;
        }
        
        .kitab-kuning-theme .line-card {
          background-color: #fcf9f2 !important;
          border: 1px solid #c49662 !important;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(139, 90, 43, 0.05);
          padding: 24px;
        }

        .kitab-kuning-theme .header-container {
          border-bottom: 3px double #a8733e !important;
        }

        .kitab-kuning-theme .header-container h1 {
          color: #7c441c !important;
          font-family: 'Scheherazade New', 'Amiri', serif !important;
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
        
        /* Layout container */
        .container {
          max-width: 850px;
          margin: 0 auto;
        }

        /* Front title page or top banner */
        .header-container {
          text-align: center;
          margin-bottom: 50px;
          border-bottom: 3px double #059669;
          padding-bottom: 25px;
          direction: ltr; /* keep meta aligned naturally or styled nicely */
        }
        .header-container h1 {
          font-family: 'Amiri', serif;
          font-size: 34px;
          font-weight: bold;
          color: #065f46;
          margin: 0 0 12px 0;
          direction: rtl;
        }
        .header-container .author {
          font-size: 16px;
          color: #374151;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .header-container .description {
          font-size: 13.5px;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
        }

        /* Chapter block */
        .chapter-container {
          margin-top: 50px;
          page-break-before: always;
        }
        .chapter-container:first-of-type {
          page-break-before: avoid;
        }
        .chapter-title {
          font-family: 'Amiri', serif;
          font-size: 26px;
          font-weight: bold;
          color: #1e3a8a;
          text-align: center;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 10px;
          margin-bottom: 30px;
          break-after: avoid;
        }

        /* Section block */
        .section-container {
          margin-top: 35px;
        }
        .section-title {
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          border-right: 5px solid #10b981;
          padding-right: 12px;
          margin-bottom: 20px;
          text-align: right;
          break-after: avoid;
        }

        /* Line card / container */
        .line-card {
          margin-bottom: 28px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          background-color: #f9fafb;
          break-inside: avoid;
        }

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

        /* Arabic phrase with sublinear jenggot annotations */
        .arabic-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          gap: 16px 24px;
          direction: rtl;
          line-height: 2.8;
          margin-bottom: 16px;
          text-align: right;
        }
        .word-cell {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          min-width: 50px;
          transition: all 0.2s;
        }
        
        .kitab-kuning-theme .word-cell {
          background-color: #fdfbf7;
          border: 1px solid #eed8bf;
          border-radius: 6px;
          padding: 4px 8px;
        }

        .arabic-text {
          font-family: 'Scheherazade New', 'Amiri', serif;
          font-size: 30px;
          font-weight: bold;
          color: #000000;
          direction: rtl;
          line-height: 1.25;
        }
        
        .kitab-kuning-theme .arabic-text {
          color: #2b180d !important;
        }

        .jenggot-text {
          font-size: 11.5px;
          color: #4b5563;
          text-align: center;
          margin-top: 5px;
          max-width: 120px;
          white-space: normal;
          line-height: 1.2;
          font-family: 'Inter', system-ui, sans-serif;
          font-style: italic;
        }
        
        .kitab-kuning-theme .jenggot-text {
          color: #5c3c26 !important;
        }

        .symbol-tag {
          font-family: 'Amiri', serif;
          font-size: 11px;
          background-color: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          border-radius: 4px;
          padding: 0 5.5px;
          font-weight: bold;
          line-height: 1.1;
          margin-top: 3px;
        }

        .kitab-kuning-theme .symbol-tag {
          background-color: #fbf5e6;
          color: #8c4f2b;
          border: 1px solid #e2c098;
        }

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

        /* Full explanations / translation blocks */
        .translation-block {
          background-color: #f1f5f9;
          border-left: 4.5px solid #10b981;
          border-radius: 4px;
          padding: 12px 16px;
          font-size: 14px;
          color: #1f2937;
          direction: ltr;
          text-align: left;
          margin-top: 14px;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .kitab-kuning-theme .translation-block {
          background-color: #f7f3e8 !important;
          border-left: 4.5px solid #a3754c !important;
          color: #4a2f1b !important;
        }

        .notes-block {
          font-size: 12.5px;
          color: #4b5563;
          margin-top: 10px;
          direction: ltr;
          text-align: left;
          padding-left: 16px;
          border-left: 2px dashed #9ca3af;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .kitab-kuning-theme .notes-block {
          color: #5c412e !important;
          border-left: 2px dashed #a3754c !important;
        }

        /* Printing elements stylesheet rules */
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .kitab-kuning-theme {
            background-color: #faf4e6 !important;
            color: #3d2414 !important;
          }
          
          .line-card {
            border: 1px solid #d1d5db;
            background-color: #ffffff;
            break-inside: avoid;
            box-shadow: none !important;
          }

          .kitab-kuning-theme .line-card {
            background-color: #fcf9f2 !important;
            border: 1px solid #c49662 !important;
          }

          .translation-block {
            background-color: #f3f4f6;
            border-left: 4px solid #10b981;
          }

          .kitab-kuning-theme .translation-block {
            background-color: #f7f3e8 !important;
            border-left: 4.5px solid #a3754c !important;
          }

          .footer-print {
            display: block !important;
          }
        }

        .footer-print {
          display: none;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
          margin-top: 40px;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
          direction: ltr;
          font-family: 'Inter', sans-serif;
        }
        
        .kitab-kuning-theme .footer-print {
          color: #8c5d37 !important;
          border-top: 1px solid #eddcc6 !important;
        }
      </style>
    </head>
    <body class="${useKitabKuningStyle ? 'kitab-kuning-theme' : ''}">
      <div class="container">
        <div class="header-container">
          <h1>${project.title}</h1>
          ${project.author ? `<div class="author">Karya: ${project.author}</div>` : ""}
          ${project.description ? `<div class="description">${project.description}</div>` : ""}
        </div>

        ${chapters.map(ch => `
          <div class="chapter-container">
            <h2 class="chapter-title">${ch.title}</h2>
            ${ch.sections.map(sec => `
              <div class="section-container">
                <h3 class="section-title">${sec.title}</h3>
                ${sec.lines.map(line => {
                  const hasWords = line.words && line.words.length > 0;
                  const marginLayout = options.marginLayout || "both"; // default to bilateral/both margins to fit beautifully!

                  const arabicRowHtml = `
                    <div class="arabic-row">
                      ${hasWords && options.showMakna
                        ? line.words.map(w => `
                            <div class="word-cell">
                              <span class="arabic-text">${w.arabic}</span>
                              ${options.showSymbols && w.symbol ? `<span class="symbol-tag">${w.symbol}</span>` : ""}
                              <span class="jenggot-text">${w.makna || ""}</span>
                            </div>
                          `).join("")
                        : `<div class="word-cell" style="width: 100%; text-align: right;">
                            <span class="arabic-text" style="font-size: 28px;">${line.arabicFull}</span>
                           </div>`
                      }
                    </div>
                  `;

                  const translationHtml = options.showTranslation && line.translationFull ? `
                    <div class="translation-block">
                      <strong>Terjemah:</strong> ${line.translationFull}
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
                      <div class="line-card">
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
                    // Both (Dua Sisi)
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

        <div class="footer-print">
          Diekspor secara otomatis melalui Kitab Scribe Pro — ${new Date().toLocaleDateString('id-ID')}
        </div>
      </div>

      <script>
        // Trigger system printing once typography files are fetched
        document.fonts.ready.then(() => {
          setTimeout(() => {
            window.print();
          }, 600);
        });
      </script>
    </body>
    </html>
  `;

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Clean-up iframe afterward
  setTimeout(() => {
    if (document.body.contains(printIframe)) {
      document.body.removeChild(printIframe);
    }
  }, 15000);
}

/**
 * Exports either the current chapter or the entire project to an editable DOCX file.
 * Formats chapters, sections, and builds a dedicated sublinear RTL table grid
 * mapping Arabic words and its associated pesantren definitions neatly in Microsoft Word!
 */
export async function exportToDocx(project: KitabProject, options: ExportOptions): Promise<void> {
  const chapters = options.scope === "current" && options.currentChapterId
    ? project.chapters.filter(ch => ch.id === options.currentChapterId)
    : project.chapters;

  if (chapters.length === 0) {
    throw new Error("Tidak ada bab yang dapat diekspor.");
  }

  const docElements: (Paragraph | Table)[] = [];

  // 1. Cover / Title Section
  docElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: project.title,
          bold: true,
          size: 36, // 18pt
          color: "065f46" // emerald green
        })
      ]
    })
  );

  if (project.author) {
    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Karya: ${project.author}`,
            italics: true,
            size: 24, // 12pt
            color: "374151"
          })
        ]
      })
    );
  }

  if (project.description) {
    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [
          new TextRun({
            text: project.description,
            size: 20, // 10pt
            color: "6b7280"
          })
        ]
      })
    );
  }

  // Divider Line
  docElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      border: {
        bottom: {
          color: "e5e7eb",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 15
        }
      }
    })
  );

  // 2. Chapters Loop
  for (const ch of chapters) {
    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 250 },
        heading: HeadingLevel.HEADING_1,
        keepNext: true,
        children: [
          new TextRun({
            text: ch.title,
            bold: true,
            size: 28, // 14pt
            color: "1e3a8a", // navy blue
            font: "Amiri"
          })
        ]
      })
    );

    // Sections
    for (const sec of ch.sections) {
      docElements.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 300, after: 150 },
          heading: HeadingLevel.HEADING_2,
          keepNext: true,
          children: [
            new TextRun({
              text: sec.title,
              bold: true,
              size: 24, // 12pt
              color: "111827"
            })
          ]
        })
      );

      // Lines
      for (const line of sec.lines) {
        const hasWords = line.words && line.words.length > 0;

        if (hasWords && options.showMakna) {
          // Build Word-by-word columns inside an RTL Ribbon Table
          // Each word is a column cell in a single row
          // MS Word renders these right-to-left beautifully if bidiVisual is enabled on table
          const cells: TableCell[] = line.words.map(w => {
            const cellChildren: Paragraph[] = [];

            // Row 1: Arabic word (RTL)
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 30 },
                bidirectional: true,
                children: [
                  new TextRun({
                    text: w.arabic,
                    bold: true,
                    size: 26, // 13pt
                    font: "Amiri",
                    color: "000000"
                  })
                ]
              })
            );

            // Row 2: Symbol (Small Nahwu grammar tag)
            if (options.showSymbols && w.symbol) {
              cellChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 30 },
                  children: [
                    new TextRun({
                      text: `[${w.symbol}]`,
                      bold: true,
                      size: 16, // 8pt
                      color: "047857",
                      font: "Amiri"
                    })
                  ]
                })
              );
            }

            // Row 3: Makna Jenggot (Sublinear)
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: w.makna || "-",
                    italics: true,
                    size: 18, // 9pt
                    color: "4b5563"
                  })
                ]
              })
            );

            return new TableCell({
              children: cellChildren,
              width: {
                size: 2000,
                type: WidthType.DXA
              },
              shading: {
                fill: "f9fafb"
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" }
              }
            });
          });

          // Create the single-row layout table
          const bidiTable = new Table({
            alignment: AlignmentType.RIGHT,
            rows: [
              new TableRow({
                children: cells
              })
            ]
          });

          docElements.push(bidiTable);
          // Spacing below the table
          docElements.push(
            new Paragraph({
              spacing: { before: 100, after: 100 },
              children: []
            })
          );
        } else {
          // If no words array or showMakna is disabled, export raw full Arabic phrase
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 150, after: 150 },
              bidirectional: true,
              children: [
                new TextRun({
                  text: line.arabicFull,
                  bold: true,
                  size: 28, // 14pt
                  font: "Amiri",
                  color: "000000"
                })
              ]
            })
          );
        }

        // Full Translation Block (Under Arabic Word block)
        if (options.showTranslation && line.translationFull) {
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 80 },
              indent: { left: 400 },
              children: [
                new TextRun({
                  text: "Terjemah: ",
                  bold: true,
                  size: 20,
                  color: "10b981"
                }),
                new TextRun({
                  text: line.translationFull,
                  size: 20, // 10pt
                  color: "1f2937"
                })
              ]
            })
          );
        }

        // Traditional scholastic commentary layers (Matan, Syarah, Hasyiyah, Ta'liq) in Word Format
        const showMatan = options.showMatan !== false;
        const showSyarah = options.showSyarah !== false;
        const showHasyiyah = options.showHasyiyah !== false;
        const showTaliq = options.showTaliq !== false;

        // 1. Matan Block
        if (showMatan && line.matan) {
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 100, after: 100 },
              bidirectional: true,
              indent: { right: 400 },
              children: [
                new TextRun({
                  text: "[MATAN] ",
                  bold: true,
                  size: 18,
                  color: "9f1239"
                }),
                new TextRun({
                  text: line.matan,
                  bold: true,
                  size: 22,
                  font: "Amiri",
                  color: "9f1239"
                })
              ]
            })
          );
        }

        // 2. Syarah Block
        if (showSyarah && (line.syarah || line.notes)) {
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 60, after: 100 },
              indent: { left: 400 },
              children: [
                new TextRun({
                  text: "Syarah: ",
                  bold: true,
                  size: 18,
                  color: "166534"
                }),
                new TextRun({
                  text: line.syarah || line.notes || "",
                  size: 18,
                  color: "1f2937"
                })
              ]
            })
          );
        }

        // 3. Hasyiyah Block
        if (showHasyiyah && line.hasyiyah) {
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 60, after: 100 },
              indent: { left: 600 },
              children: [
                new TextRun({
                  text: "Hasyiyah: ",
                  bold: true,
                  size: 18,
                  color: "5b21b6"
                }),
                new TextRun({
                  text: line.hasyiyah,
                  size: 18,
                  italics: true,
                  color: "4b5563"
                })
              ]
            })
          );
        }

        // 4. Ta'liq Block
        if (showTaliq && line.taliq) {
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 60, after: 100 },
              indent: { left: 800 },
              children: [
                new TextRun({
                  text: "Ta'liq: ",
                  bold: true,
                  size: 16,
                  color: "92400e"
                }),
                new TextRun({
                  text: line.taliq,
                  size: 16,
                  italics: true,
                  color: "4b5563"
                })
              ]
            })
          );
        }

        // Line-break separator spacing
        docElements.push(
          new Paragraph({
            spacing: { after: 200 },
            children: []
          })
        );
      }
    }
  }

  // 3. Assemble and Download DOCX Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docElements
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title.replace(/\s+/g, '_')}_buku_makna.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
