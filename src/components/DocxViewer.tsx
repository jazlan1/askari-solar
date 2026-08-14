import React, { useEffect, useState } from "react";
// @ts-ignore
import mammoth from "mammoth/mammoth.browser.min.js";
import { X, Download, FileText, Loader2 } from "lucide-react";
import { getSafeFileUrl } from "@/lib/file-helper";

interface DocxViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export default function DocxViewer({ fileUrl, fileName, onClose }: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocx() {
      try {
        setLoading(true);
        setError(null);
        
        const safeUrl = getSafeFileUrl(fileUrl);
        const response = await fetch(safeUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert to HTML
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtmlContent(result.value);
        
        if (result.messages && result.messages.length > 0) {
          console.warn("Mammoth conversion warnings:", result.messages);
        }
      } catch (err: any) {
        console.error("Docx conversion error:", err);
        setError(err.message || "Could not read Word document.");
      } finally {
        setLoading(false);
      }
    }

    loadDocx();
  }, [fileUrl]);

  const handleDownloadPDF = () => {
    if (loading) return;

    if (!(window as any).html2pdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        executeDocxPDFGeneration();
      };
      document.head.appendChild(script);
    } else {
      executeDocxPDFGeneration();
    }
  };

  const executeDocxPDFGeneration = () => {
    const docxContent = document.querySelector(".docx-content-styles");
    if (!docxContent) return;

    const printArea = docxContent.cloneNode(true) as HTMLDivElement;

    const iframe = document.createElement("iframe");
    iframe.id = "docx-pdf-temp-iframe";
    iframe.style.position = "absolute";
    iframe.style.width = "800px";
    iframe.style.height = "1100px";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error("Failed to access iframe document");
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
              color: #333333;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #111111 !important;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              line-height: 1.2;
            }
            h1 { font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
            h2 { font-size: 20px; }
            h3 { font-size: 16px; }
            p {
              margin-top: 0;
              margin-bottom: 1em;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 1em;
              margin-bottom: 1em;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #ddd !important;
              padding: 8px 12px;
              font-size: 13px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
              display: block;
              margin: 1em auto;
            }
          </style>
        </head>
        <body>
          <div id="print-content"></div>
        </body>
      </html>
    `);
    iframeDoc.close();

    const target = iframeDoc.getElementById("print-content");
    if (target) {
      target.appendChild(printArea);
    }

    const opt = {
      margin: 0.5,
      filename: fileName.replace(/\.[^/.]+$/, "") + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    (window as any)
      .html2pdf()
      .from(iframeDoc.body)
      .set(opt)
      .save()
      .then(() => {
        const el = document.getElementById("docx-pdf-temp-iframe");
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      })
      .catch((err: any) => {
        console.error("PDF generation failed:", err);
        const el = document.getElementById("docx-pdf-temp-iframe");
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-md flex flex-col text-xs text-zinc-300">
      {/* Style overrides for converted HTML content */}
      <style>{`
        .docx-content-styles h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f4f4f5;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid #27272a;
          padding-bottom: 0.25rem;
        }
        .docx-content-styles h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f4f4f5;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .docx-content-styles h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #e4e4e7;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .docx-content-styles p {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        .docx-content-styles ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .docx-content-styles ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .docx-content-styles li {
          margin-bottom: 0.25rem;
        }
        .docx-content-styles strong {
          color: #ffffff;
          font-weight: 600;
        }
        .docx-content-styles table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        .docx-content-styles th, .docx-content-styles td {
          border: 1px solid #27272a;
          padding: 0.5rem;
        }
      `}</style>

      {/* Top Header Controls */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-zinc-100">{fileName}</h3>
            <p className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider">Word Document Reader</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${getSafeFileUrl(fileUrl)}${getSafeFileUrl(fileUrl).includes("?") ? "&" : "?"}download=true`}
            download={fileName}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold border border-zinc-700 transition"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Download Word</span>
          </a>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold border border-zinc-700 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-red-400" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:bg-zinc-700 transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Main Reader Content */}
      <div className="flex-1 overflow-auto bg-zinc-950 p-4 md:p-12 flex justify-center">
        <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-850 rounded-2xl shadow-2xl p-6 md:p-12 min-h-[85vh] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
              <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Converting document content...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-red-400 py-24">
              <p className="font-bold text-sm">Error Loading Document</p>
              <p className="text-xs text-zinc-550">{error}</p>
            </div>
          ) : (
            <div 
              className="prose prose-invert prose-zinc max-w-none text-zinc-300 text-sm leading-relaxed space-y-4 docx-content-styles"
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
