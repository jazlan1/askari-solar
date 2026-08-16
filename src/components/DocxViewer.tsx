"use client";

import React, { useEffect, useState, useRef } from "react";
// @ts-ignore
import mammoth from "mammoth/mammoth.browser.min.js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import {
  X,
  Download,
  FileText,
  Loader2,
  Save,
  Printer,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  CheckCircle,
  AlertCircle,
  Undo,
  Redo,
} from "lucide-react";
import { getSafeFileUrl } from "@/lib/file-helper";

interface DocxViewerProps {
  fileId?: number | null;
  fileUrl: string;
  fileName: string;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function DocxViewer({
  fileId,
  fileUrl,
  fileName,
  onClose,
  onSaveSuccess,
}: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<string>("16px");
  const [fontFamily, setFontFamily] = useState<string>("Calibri");

  const editorRef = useRef<HTMLDivElement>(null);

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

        // Convert to HTML via mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const initialHtml = result.value || "<p>Start typing here...</p>";
        setHtmlContent(initialHtml);

        if (editorRef.current) {
          editorRef.current.innerHTML = initialHtml;
        }
      } catch (err: any) {
        console.error("Docx load error:", err);
        setError(err.message || "Could not read Word document.");
        const fallbackHtml = "<p>Document ready for editing...</p>";
        setHtmlContent(fallbackHtml);
        if (editorRef.current) {
          editorRef.current.innerHTML = fallbackHtml;
        }
      } finally {
        setLoading(false);
      }
    }

    loadDocx();
  }, [fileUrl]);

  // Execute rich text formatting commands
  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const handleHeading = (tag: string) => {
    execCmd("formatBlock", `<${tag}>`);
  };

  const handleInsertTable = () => {
    const rows = prompt("Number of rows:", "3");
    const cols = prompt("Number of columns:", "3");
    const numRows = parseInt(rows || "0");
    const numCols = parseInt(cols || "0");

    if (numRows > 0 && numCols > 0 && numRows <= 50 && numCols <= 20) {
      let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;"><tbody>`;
      for (let r = 0; r < numRows; r++) {
        tableHtml += `<tr>`;
        for (let c = 0; c < numCols; c++) {
          tableHtml += `<td style="border: 1px solid #d1d5db; padding: 8px 12px; min-width: 60px;">${r === 0 ? "Header " + (c + 1) : "Cell"}</td>`;
        }
        tableHtml += `</tr>`;
      }
      tableHtml += `</tbody></table><p><br></p>`;
      execCmd("insertHTML", tableHtml);
    }
  };

  /**
   * Convert editor DOM tree into docx elements and pack into binary .docx Blob
   */
  const generateDocxBlob = async (): Promise<Blob> => {
    const rootEl = editorRef.current;
    const paragraphsAndTables: (Paragraph | Table)[] = [];

    if (rootEl) {
      const childNodes = Array.from(rootEl.children);

      if (childNodes.length === 0 && rootEl.innerText) {
        paragraphsAndTables.push(
          new Paragraph({
            children: [new TextRun({ text: rootEl.innerText, font: fontFamily })],
          })
        );
      } else {
        for (const node of childNodes) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          if (tagName === "table") {
            const tableRows: TableRow[] = [];
            const rows = Array.from(el.querySelectorAll("tr"));
            for (const row of rows) {
              const cells = Array.from(row.querySelectorAll("td, th"));
              const tableCells: TableCell[] = cells.map((cell) => {
                return new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell.textContent || "",
                          bold: cell.tagName.toLowerCase() === "th",
                          font: fontFamily,
                        }),
                      ],
                    }),
                  ],
                  width: {
                    size: 100 / (cells.length || 1),
                    type: WidthType.PERCENTAGE,
                  },
                });
              });
              if (tableCells.length > 0) {
                tableRows.push(new TableRow({ children: tableCells }));
              }
            }
            if (tableRows.length > 0) {
              paragraphsAndTables.push(
                new Table({
                  rows: tableRows,
                  width: { size: 100, type: WidthType.PERCENTAGE },
                })
              );
            }
          } else {
            let heading: any = undefined;
            if (tagName === "h1") heading = HeadingLevel.HEADING_1;
            else if (tagName === "h2") heading = HeadingLevel.HEADING_2;
            else if (tagName === "h3") heading = HeadingLevel.HEADING_3;

            let align: any = AlignmentType.LEFT;
            const textAlign = el.style.textAlign || el.getAttribute("align") || "";
            if (textAlign === "center") align = AlignmentType.CENTER;
            else if (textAlign === "right") align = AlignmentType.RIGHT;
            else if (textAlign === "justify") align = AlignmentType.JUSTIFIED;

            const runs: TextRun[] = [];
            const textContent = el.innerText || el.textContent || "";

            runs.push(
              new TextRun({
                text: textContent,
                font: fontFamily,
                bold: tagName.startsWith("h") || el.querySelector("b, strong") !== null,
                italics: el.querySelector("i, em") !== null,
              })
            );

            paragraphsAndTables.push(
              new Paragraph({
                heading,
                alignment: align,
                children: runs.length > 0 ? runs : [new TextRun("")],
                spacing: { after: 120 },
              })
            );
          }
        }
      }
    }

    if (paragraphsAndTables.length === 0) {
      paragraphsAndTables.push(
        new Paragraph({
          children: [new TextRun({ text: "Empty document", font: fontFamily })],
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          children: paragraphsAndTables,
        },
      ],
    });

    const buffer = await Packer.toBlob(doc);
    return buffer;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const docxBlob = await generateDocxBlob();
      const fd = new FormData();
      if (fileId != null && fileId !== -1) fd.append("fileId", fileId.toString());
      fd.append("fileUrl", fileUrl);
      fd.append("file", docxBlob, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);

      const res = await fetch("/api/files/save-docx", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save document.");
      }

      setSaveSuccess(true);
      onSaveSuccess?.();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save docx error:", err);
      setError(err.message || "Failed to save document.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      const docxBlob = await generateDocxBlob();
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      // Fallback: download direct file
      window.open(getSafeFileUrl(fileUrl), "_blank");
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
    const docxContent = editorRef.current;
    if (!docxContent) return;

    const opt = {
      margin: [15, 15, 15, 15],
      filename: fileName.replace(/\.[^/.]+$/, "") + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    (window as any).html2pdf().set(opt).from(docxContent).save();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-slate-100 flex items-center gap-2">
              {fileName}
              {saveSuccess && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <CheckCircle className="w-3 h-3" /> Saved to server
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Microsoft Word Document Editor & Viewer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 mr-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
            title="Save changes back to server"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
            title="Download latest .docx file"
          >
            <Download className="w-4 h-4" />
            <span>Download .docx</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-all"
            title="Export as PDF"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Word Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-slate-800 border-b border-slate-700 text-slate-300 text-xs shrink-0 select-none">
        {/* Undo / Redo */}
        <button
          onClick={() => execCmd("undo")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("redo")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Font Family & Size */}
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            execCmd("fontName", e.target.value);
          }}
          className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Calibri">Calibri</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Segoe UI">Segoe UI</option>
          <option value="Roboto">Roboto</option>
          <option value="Courier New">Courier New</option>
        </select>

        <select
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value);
            execCmd("fontSize", "3");
          }}
          className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="12px">12 pt</option>
          <option value="14px">14 pt</option>
          <option value="16px">16 pt</option>
          <option value="18px">18 pt</option>
          <option value="24px">24 pt</option>
          <option value="32px">32 pt</option>
        </select>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Text Styles */}
        <button
          onClick={() => execCmd("bold")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded font-bold"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("italic")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded italic"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("underline")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded underline"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("strikeThrough")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded line-through"
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1 cursor-pointer p-1 hover:bg-slate-700 rounded" title="Text Color">
            <span className="font-bold underline text-rose-400">A</span>
            <input
              type="color"
              defaultValue="#000000"
              onChange={(e) => execCmd("foreColor", e.target.value)}
              className="w-4 h-4 opacity-0 absolute cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-1 cursor-pointer p-1 hover:bg-slate-700 rounded" title="Highlight Color">
            <span className="bg-amber-400 text-slate-900 px-1 font-bold rounded text-[10px]">H</span>
            <input
              type="color"
              defaultValue="#ffff00"
              onChange={(e) => execCmd("hiliteColor", e.target.value)}
              className="w-4 h-4 opacity-0 absolute cursor-pointer"
            />
          </label>
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Headings */}
        <button
          onClick={() => handleHeading("h1")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleHeading("h2")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleHeading("h3")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Alignments */}
        <button
          onClick={() => execCmd("justifyLeft")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("justifyCenter")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("justifyRight")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("justifyFull")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Lists & Tables */}
        <button
          onClick={() => execCmd("insertUnorderedList")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd("insertOrderedList")}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={handleInsertTable}
          className="p-1.5 hover:bg-slate-700 hover:text-white rounded"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-950 p-4 md:p-8 flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Loading Word document...</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-lg shadow-2xl min-h-[850px] p-8 md:p-14 border border-slate-200">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                if (editorRef.current) {
                  setHtmlContent(editorRef.current.innerHTML);
                }
              }}
              style={{
                fontFamily: fontFamily,
                fontSize: fontSize,
                minHeight: "750px",
                outline: "none",
                lineHeight: "1.7",
              }}
              className="docx-editor-content focus:outline-none"
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        .docx-editor-content p {
          margin-bottom: 0.85em;
        }
        .docx-editor-content h1 {
          font-size: 1.85em;
          font-weight: 700;
          margin-top: 1em;
          margin-bottom: 0.5em;
          color: #1e293b;
        }
        .docx-editor-content h2 {
          font-size: 1.45em;
          font-weight: 600;
          margin-top: 0.9em;
          margin-bottom: 0.4em;
          color: #334155;
        }
        .docx-editor-content h3 {
          font-size: 1.2em;
          font-weight: 600;
          margin-top: 0.8em;
          margin-bottom: 0.3em;
          color: #475569;
        }
        .docx-editor-content ul {
          list-style-type: disc;
          margin-left: 1.5em;
          margin-bottom: 0.85em;
        }
        .docx-editor-content ol {
          list-style-type: decimal;
          margin-left: 1.5em;
          margin-bottom: 0.85em;
        }
        .docx-editor-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .docx-editor-content td,
        .docx-editor-content th {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
        }
        .docx-editor-content th {
          background-color: #f8fafc;
          font-weight: 600;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .docx-editor-content,
          .docx-editor-content * {
            visibility: visible;
          }
          .docx-editor-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
