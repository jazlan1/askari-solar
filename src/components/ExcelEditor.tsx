"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import JSZip from "jszip";
import {
  X,
  Save,
  Download,
  Plus,
  Trash2,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
// @ts-ignore
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";

interface ExcelEditorProps {
  fileId?: number | null;
  fileUrl: string;
  fileName: string;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

// ─── Style types ────────────────────────────────────────────────────────────

interface CellStyle {
  bgColor?: string;         // e.g. "#FF0000"
  fontColor?: string;       // e.g. "#FFFFFF"
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;        // in pt
  fontName?: string;
  align?: "left" | "center" | "right" | "general" | string;
  valign?: "top" | "middle" | "bottom" | string;
  wrapText?: boolean;
  borderTop?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRight?: string;
}

interface CellData {
  value: string | number | boolean | null;
  rawType: string;          // 'n','s','b','d', etc.
  style: CellStyle;
  // merge tracking
  hidden?: boolean;         // true = this cell is covered by a merge
  rowSpan?: number;
  colSpan?: number;
}

// ─── Image overlay types ─────────────────────────────────────────────────────

interface SheetImage {
  dataUrl: string;       // base64 data URL
  col: number;           // anchor column (0-based)
  row: number;           // anchor row (0-based)
  colOffEmu: number;     // column offset in EMU
  rowOffEmu: number;     // row offset in EMU
  widthEmu: number;      // width in EMU
  heightEmu: number;     // height in EMU
}

const EMU_PER_PX = 914400 / 96;
const MIN_ROWS = 50;
const MIN_COLS = 26;

const INDEXED_COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", // 0-7
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", // 8-15
  "#800000", "#008000", "#000080", "#808000", "#800080", "#008080", "#C0C0C0", "#808080", // 16-23
  "#9999FF", "#993366", "#FFFFCC", "#CCFFFF", "#660066", "#FF8080", "#0066CC", "#CCCCFF", // 24-31
  "#000080", "#FF00FF", "#FFFF00", "#00FFFF", "#800080", "#800000", "#008080", "#0000FF", // 32-39
  "#00CCFF", "#CCFFFF", "#CCFFCC", "#FFFF99", "#99CCFF", "#FF99CC", "#CC99FF", "#FFCC99", // 40-47
  "#3366FF", "#33CCCC", "#99CC00", "#FFCC00", "#FF9900", "#FF6600", "#666699", "#969696", // 48-55
  "#003366", "#339966", "#003300", "#333300", "#993300", "#993366", "#333399", "#333333"  // 56-63
];

const OFFICE_THEME_COLORS = [
  "#FFFFFF", // 0: White
  "#000000", // 1: Black
  "#E7E6E6", // 2: Light Gray
  "#44546A", // 3: Dark Blue
  "#5B9BD5", // 4: Accent 1 (Blue)
  "#ED7D31", // 5: Accent 2 (Orange)
  "#A5A5A5", // 6: Accent 3 (Gray)
  "#FFC000", // 7: Accent 4 (Gold)
  "#4472C4", // 8: Accent 5 (Blue)
  "#70AD47"  // 9: Accent 6 (Green)
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveExcelJSColor(colorObj: any): string | undefined {
  if (!colorObj) return undefined;
  
  let hex = "";
  
  // Extract base hex color
  if (typeof colorObj === "string") {
    hex = colorObj;
  } else if (colorObj.argb && typeof colorObj.argb === "string") {
    hex = colorObj.argb;
  } else if (colorObj.theme !== undefined && typeof colorObj.theme === "number") {
    hex = OFFICE_THEME_COLORS[colorObj.theme] || "#FFFFFF";
  } else if (colorObj.indexed !== undefined && typeof colorObj.indexed === "number") {
    hex = INDEXED_COLORS[colorObj.indexed] || "";
  }
  
  if (!hex) return undefined;
  
  // Clean hex prefix
  hex = hex.replace(/^#/, "");
  
  let r = 0, g = 0, b = 0;
  if (hex.length === 8) {
    // AARRGGBB
    r = parseInt(hex.slice(2, 4), 16);
    g = parseInt(hex.slice(4, 6), 16);
    b = parseInt(hex.slice(6, 8), 16);
  } else if (hex.length === 6) {
    // RRGGBB
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 3) {
    // RGB shorthand
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    // Fallback if it's already a CSS color name or other unrecognized format
    return `#${hex}`;
  }
  
  // Apply tint if present
  if (colorObj.tint !== undefined && typeof colorObj.tint === "number") {
    const tint = colorObj.tint;
    if (tint < 0) {
      r = Math.round(r * (1 + tint));
      g = Math.round(g * (1 + tint));
      b = Math.round(b * (1 + tint));
    } else if (tint > 0) {
      r = Math.round(r + (255 - r) * tint);
      g = Math.round(g + (255 - g) * tint);
      b = Math.round(b + (255 - b) * tint);
    }
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
  }
  
  const rs = r.toString(16).padStart(2, "0");
  const gs = g.toString(16).padStart(2, "0");
  const bs = b.toString(16).padStart(2, "0");
  return `#${rs}${gs}${bs}`;
}

function extractExcelJSStyle(cell: any): CellStyle {
  const style: CellStyle = {};
  if (!cell) return style;

  // Font
  if (cell.font) {
    const font = cell.font;
    if (font.bold) style.bold = true;
    if (font.italic) style.italic = true;
    if (font.underline) style.underline = true;
    if (font.size) style.fontSize = font.size;
    if (font.name) style.fontName = font.name;
    const color = resolveExcelJSColor(font.color);
    if (color) style.fontColor = color;
  }

  // Background / Fill
  if (cell.fill) {
    const fill = cell.fill;
    if (fill.type === "pattern" && fill.fgColor) {
      const color = resolveExcelJSColor(fill.fgColor);
      if (color) style.bgColor = color;
    }
  }

  // Alignment
  if (cell.alignment) {
    const al = cell.alignment;
    if (al.horizontal) style.align = al.horizontal;
    if (al.vertical) {
      style.valign = al.vertical === "center" ? "middle" : al.vertical;
    }
    if (al.wrapText) style.wrapText = true;
  }

  // Borders
  if (cell.border) {
    const b = cell.border;
    const borderCss = (side: any) => {
      if (!side || !side.style) return undefined;
      const s = side.style;
      const color = resolveExcelJSColor(side.color) ?? "#bdc1c6";
      return `1px ${s === "thin" ? "solid" : "solid"} ${color}`;
    };
    style.borderTop = borderCss(b.top);
    style.borderBottom = borderCss(b.bottom);
    style.borderLeft = borderCss(b.left);
    style.borderRight = borderCss(b.right);
  }

  return style;
}

function styleToInline(s: CellStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (s.bgColor) css.backgroundColor = s.bgColor;
  if (s.fontColor) css.color = s.fontColor;
  if (s.bold) css.fontWeight = "bold";
  if (s.italic) css.fontStyle = "italic";
  if (s.underline) css.textDecoration = "underline";
  if (s.fontSize) css.fontSize = `${s.fontSize}pt`;
  if (s.fontName) css.fontFamily = s.fontName;
  if (s.align && s.align !== "general") css.textAlign = s.align as any;
  if (s.wrapText) css.whiteSpace = "pre-wrap";
  if (s.borderTop) css.borderTop = s.borderTop;
  if (s.borderBottom) css.borderBottom = s.borderBottom;
  if (s.borderLeft) css.borderLeft = s.borderLeft;
  if (s.borderRight) css.borderRight = s.borderRight;
  return css;
}

function colLetterToNumber(letter: string): number {
  let num = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    num = num * 26 + (upper.charCodeAt(i) - 64);
  }
  return num;
}

function parseCellRef(ref: string) {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { r: 1, c: 1 };
  return {
    r: parseInt(match[2], 10),
    c: colLetterToNumber(match[1])
  };
}

// ─── Image extraction via JSZip ──────────────────────────────────────────────

async function extractImages(
  buf: ArrayBuffer
): Promise<{ [sheetIndex: number]: SheetImage[] }> {
  const result: { [sheetIndex: number]: SheetImage[] } = {};
  try {
    const zip = await JSZip.loadAsync(buf);

    const mediaMap: { [rTarget: string]: string } = {};
    for (const [name, file] of Object.entries(zip.files)) {
      if (name.startsWith("xl/media/")) {
        const b64 = await file.async("base64");
        const ext = name.split(".").pop()?.toLowerCase() ?? "png";
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
          : ext === "gif" ? "image/gif"
          : ext === "svg" ? "image/svg+xml"
          : "image/png";
        mediaMap[name] = `data:${mime};base64,${b64}`;
      }
    }

    const wbText = await zip.file("xl/workbook.xml")?.async("text");
    const sheetRefMap: { [rId: string]: number } = {};
    if (wbText) {
      const sheetMatches = [...wbText.matchAll(/r:id="(rId\d+)"[^>]*sheetId="(\d+)"/g)];
      sheetMatches.forEach((m) => {
        sheetRefMap[m[1]] = parseInt(m[2]) - 1;
      });
      const sheetMatches2 = [...wbText.matchAll(/<sheet [^>]*sheetId="(\d+)"[^>]*r:id="(rId\d+)"/g)];
      sheetMatches2.forEach((m) => {
        sheetRefMap[m[2]] = parseInt(m[1]) - 1;
      });
    }

    for (let si = 0; si < 20; si++) {
      const sheetRelsPath = `xl/worksheets/_rels/sheet${si + 1}.xml.rels`;
      const relsText = await zip.file(sheetRelsPath)?.async("text");
      if (!relsText) continue;

      const drawMatch = relsText.match(/Target="[^"]*drawing(\d+)\.xml"/);
      if (!drawMatch) continue;
      const drawingNum = drawMatch[1];
      const drawingPath = `xl/drawings/drawing${drawingNum}.xml`;
      const drawingRelsPath = `xl/drawings/_rels/drawing${drawingNum}.xml.rels`;

      const drawingText = await zip.file(drawingPath)?.async("text");
      const drawingRelsText = await zip.file(drawingRelsPath)?.async("text");
      if (!drawingText || !drawingRelsText) continue;

      const drRels: { [rId: string]: string } = {};
      const relMatches = [...drawingRelsText.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)];
      relMatches.forEach((m) => {
        const target = m[2].replace(/^\.\.\//, "xl/");
        drRels[m[1]] = target;
      });

      const anchors = [...drawingText.matchAll(
        /<xdr:(?:oneCellAnchor|twoCellAnchor)[\s\S]*?<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g
      )];

      const images: SheetImage[] = [];
      for (const anchor of anchors) {
        const xml = anchor[0];
        const col = parseInt(xml.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)?.[1] ?? "0");
        const row = parseInt(xml.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1] ?? "0");
        const colOff = parseInt(xml.match(/<xdr:from>[\s\S]*?<xdr:colOff>(\d+)<\/xdr:colOff>/)?.[1] ?? "0");
        const rowOff = parseInt(xml.match(/<xdr:from>[\s\S]*?<xdr:rowOff>(\d+)<\/xdr:rowOff>/)?.[1] ?? "0");
        const cx = parseInt(xml.match(/cx="(\d+)"/)?.[1] ?? "0");
        const cy = parseInt(xml.match(/cy="(\d+)"/)?.[1] ?? "0");
        const rId = xml.match(/r:embed="(rId\d+)"/)?.[1];
        if (!rId) continue;
        const mediaPath = drRels[rId];
        if (!mediaPath || !mediaMap[mediaPath]) continue;

        images.push({
          dataUrl: mediaMap[mediaPath],
          col, row, colOffEmu: colOff, rowOffEmu: rowOff,
          widthEmu: cx, heightEmu: cy,
        });
      }

      if (images.length) result[si] = images;
    }
  } catch (e) {
    console.warn("Image extraction failed:", e);
  }
  return result;
}

// ─── Parse worksheet via ExcelJS ─────────────────────────────────────────────

function parseWorksheetExcelJS(ws: any): CellData[][] {
  const gridRows = Math.max(ws.rowCount, MIN_ROWS);
  let maxCol = MIN_COLS;
  ws.eachRow({ includeEmpty: true }, (row: any) => {
    if (row.cellCount > maxCol) maxCol = row.cellCount;
  });
  const gridCols = Math.max(maxCol, MIN_COLS);

  const grid: CellData[][] = Array.from({ length: gridRows }, () =>
    Array.from({ length: gridCols }, (): CellData => ({
      value: null,
      rawType: "s",
      style: {},
    }))
  );

  ws.eachRow({ includeEmpty: true }, (row: any, rIndex: any) => {
    const r = rIndex - 1;
    if (r >= gridRows) return;

    row.eachCell({ includeEmpty: true }, (cell: any, cIndex: any) => {
      const c = cIndex - 1;
      if (c >= gridCols) return;

      const style = extractExcelJSStyle(cell);
      let val = cell.value;
      
      if (val && typeof val === "object") {
        if ("formula" in val) {
          val = val.result !== undefined ? val.result : val.formula;
        } else if ("richText" in val) {
          val = val.richText.map((t: any) => t.text).join("");
        } else if (val instanceof Date) {
          val = val.toLocaleDateString();
        }
      }

      grid[r][c] = {
        value: val !== undefined && val !== null ? (val as any) : null,
        rawType: typeof val === "number" ? "n" : "s",
        style,
      };
    });
  });

  // Apply merge ranges
  const merges = ws.model.merges || [];
  merges.forEach((rangeStr: any) => {
    const [startRef, endRef] = rangeStr.split(":");
    if (!startRef || !endRef) return;
    const start = parseCellRef(startRef);
    const end = parseCellRef(endRef);

    const sRow = start.r - 1;
    const sCol = start.c - 1;
    const eRow = end.r - 1;
    const eCol = end.c - 1;

    if (sRow < gridRows && sCol < gridCols) {
      const rSpan = eRow - sRow + 1;
      const cSpan = eCol - sCol + 1;
      grid[sRow][sCol].rowSpan = rSpan > 1 ? rSpan : undefined;
      grid[sRow][sCol].colSpan = cSpan > 1 ? cSpan : undefined;

      for (let r = sRow; r <= eRow; r++) {
        for (let c = sCol; c <= eCol; c++) {
          if (r === sRow && c === sCol) continue;
          if (r < gridRows && c < gridCols) {
            grid[r][c].hidden = true;
          }
        }
      }
    }
  });

  return grid;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExcelEditor({
  fileId,
  fileUrl,
  fileName,
  onClose,
  onSaveSuccess,
}: ExcelEditorProps) {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>("");
  const [sheetGrids, setSheetGrids] = useState<{ [name: string]: CellData[][] }>({});
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [sheetImages, setSheetImages] = useState<{ [si: number]: SheetImage[] }>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selection / editing
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Dimensions
  const [sheetColWidths, setSheetColWidths] = useState<{ [sheet: string]: { [c: number]: number } }>({});
  const [sheetRowHeights, setSheetRowHeights] = useState<{ [sheet: string]: { [r: number]: number } }>({});

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const safeUrl = getSafeFileUrl(fileUrl);
        const resp = await fetch(safeUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const buf = await resp.arrayBuffer();

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);

        if (!wb.worksheets.length) throw new Error("No worksheets found.");

        const grids: { [name: string]: CellData[][] } = {};
        const widths: { [name: string]: { [c: number]: number } } = {};
        const heights: { [name: string]: { [r: number]: number } } = {};

        wb.worksheets.forEach((ws: any) => {
          grids[ws.name] = parseWorksheetExcelJS(ws);

          const wObj: { [c: number]: number } = {};
          for (let c = 1; c <= Math.max(ws.actualColumnCount, MIN_COLS); c++) {
            const col = ws.getColumn(c);
            if (col && col.width) {
              wObj[c - 1] = Math.min(350, Math.max(60, col.width * 8));
            } else {
              wObj[c - 1] = 120;
            }
          }
          widths[ws.name] = wObj;

          const hObj: { [r: number]: number } = {};
          for (let r = 1; r <= Math.max(ws.rowCount, MIN_ROWS); r++) {
            const row = ws.getRow(r);
            if (row && row.height) {
              hObj[r - 1] = Math.max(18, row.height * 1.33);
            } else {
              hObj[r - 1] = 24;
            }
          }
          heights[ws.name] = hObj;
        });

        const imgs = await extractImages(buf);

        setWorkbook(wb);
        setSheetNames(wb.worksheets.map((w: any) => w.name));
        setCurrentSheet(wb.worksheets[0].name);
        setSheetGrids(grids);
        setSheetColWidths(widths);
        setSheetRowHeights(heights);
        setSheetImages(imgs);
      } catch (e: any) {
        setError(e.message ?? "Failed to load file.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fileUrl]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const grid = currentSheet ? sheetGrids[currentSheet] ?? [] : [];
  const rowCount = grid.length;
  const currentSheetIdx = sheetNames.indexOf(currentSheet);
  const currentSheetImages: SheetImage[] = sheetImages[currentSheetIdx] ?? [];

  const colCount = (() => {
    let max = MIN_COLS;
    grid.forEach((row) => { if (row.length > max) max = row.length; });
    return max;
  })();

  const getColWidth = (c: number) => sheetColWidths[currentSheet]?.[c] ?? 120;
  const getRowHeight = (r: number) => sheetRowHeights[currentSheet]?.[r] ?? 24;

  const getColLetter = (idx: number): string => {
    let letter = "";
    let temp = idx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const cellValue = (r: number, c: number) => {
    const cd = grid[r]?.[c];
    if (!cd || cd.value === null || cd.value === undefined) return "";
    return String(cd.value);
  };

  // ── Cell interaction ────────────────────────────────────────────────────────

  const selectCell = (r: number, c: number) => {
    setSelectedCell({ r, c });
    setEditingCell(null);
    setEditValue(cellValue(r, c));
  };

  const startEdit = (r: number, c: number) => {
    setSelectedCell({ r, c });
    setEditingCell({ r, c });
    setEditValue(cellValue(r, c));
  };

  const commitEdit = useCallback(() => {
    if (!editingCell || !currentSheet) return;
    const { r, c } = editingCell;
    const numVal = Number(editValue);
    const val = editValue.trim() !== "" && !isNaN(numVal) ? numVal : editValue;

    setSheetGrids((prev) => {
      const copy = { ...prev };
      const g = copy[currentSheet].map((row) => [...row]);
      const existing = g[r]?.[c] ?? { value: null, rawType: "s", style: {} };
      g[r][c] = { ...existing, value: val, rawType: typeof val === "number" ? "n" : "s" };
      copy[currentSheet] = g;
      return copy;
    });

    if (workbook) {
      const ws = workbook.getWorksheet(currentSheet);
      if (ws) {
        const row = ws.getRow(r + 1);
        const cell = row.getCell(c + 1);
        cell.value = val;
      }
    }

    setEditingCell(null);
  }, [editingCell, currentSheet, editValue, workbook]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editingCell) commitEdit();
      else if (selectedCell) startEdit(selectedCell.r, selectedCell.c);
    } else if (e.key === "Escape") {
      setEditingCell(null);
      if (selectedCell) setEditValue(cellValue(selectedCell.r, selectedCell.c));
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (editingCell) commitEdit();
      if (selectedCell) {
        const nc = selectedCell.c + 1 < colCount ? selectedCell.c + 1 : selectedCell.c;
        selectCell(selectedCell.r, nc);
      }
    } else if (!editingCell && selectedCell) {
      const { r, c } = selectedCell;
      if (e.key === "ArrowUp" && r > 0) { e.preventDefault(); selectCell(r - 1, c); }
      else if (e.key === "ArrowDown" && r + 1 < rowCount) { e.preventDefault(); selectCell(r + 1, c); }
      else if (e.key === "ArrowLeft" && c > 0) { e.preventDefault(); selectCell(r, c - 1); }
      else if (e.key === "ArrowRight" && c + 1 < colCount) { e.preventDefault(); selectCell(r, c + 1); }
    }
  };

  // ── Column resize ────────────────────────────────────────────────────────────

  const handleResizeStart = (e: React.MouseEvent, c: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = getColWidth(c);
    const onMove = (me: MouseEvent) => {
      setSheetColWidths((prev) => ({
        ...prev,
        [currentSheet]: { ...(prev[currentSheet] ?? {}), [c]: Math.max(50, startW + me.clientX - startX) },
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Row / Col add/delete ─────────────────────────────────────────────────────

  const mutateGrid = (fn: (g: CellData[][]) => CellData[][]) => {
    if (!currentSheet) return;
    setSheetGrids((prev) => ({ ...prev, [currentSheet]: fn(prev[currentSheet].map((r) => [...r])) }));
  };

  const addRow = () => {
    if (!currentSheet) return;
    const pos = selectedCell ? selectedCell.r + 1 : rowCount;
    mutateGrid((g) => {
      const blank: CellData[] = Array.from({ length: colCount }, () => ({ value: "", rawType: "s", style: {} }));
      g.splice(pos, 0, blank);
      return g;
    });

    if (workbook) {
      const ws = workbook.getWorksheet(currentSheet);
      if (ws) {
        ws.insertRow(pos + 1, []);
      }
    }
  };

  const deleteRow = () => {
    if (!selectedCell || rowCount <= 1 || !currentSheet) return;
    const pos = selectedCell.r;
    mutateGrid((g) => { g.splice(pos, 1); return g; });

    if (workbook) {
      const ws = workbook.getWorksheet(currentSheet);
      if (ws) {
        ws.spliceRows(pos + 1, 1);
      }
    }
  };

  const addColumn = () => {
    if (!currentSheet) return;
    const pos = selectedCell ? selectedCell.c + 1 : colCount;
    mutateGrid((g) => {
      return g.map((row) => {
        const r = [...row];
        r.splice(pos, 0, { value: "", rawType: "s", style: {} });
        return r;
      });
    });
  };

  const deleteColumn = () => {
    if (!selectedCell || colCount <= 1 || !currentSheet) return;
    const col = selectedCell.c;
    mutateGrid((g) => g.map((row) => {
      const r = [...row];
      r.splice(col, 1);
      return r;
    }));

    if (workbook) {
      const ws = workbook.getWorksheet(currentSheet);
      if (ws) {
        ws.eachRow((row: any) => {
          row.splice(col + 1, 1);
        });
      }
    }
  };

  // ── Save to server ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (!workbook) throw new Error("No workbook loaded.");

      const bytes = await workbook.xlsx.writeBuffer();
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const fd = new FormData();
      if (fileId != null && fileId !== -1) fd.append("fileId", fileId.toString());
      fd.append("fileUrl", fileUrl);
      fd.append("file", blob, fileName);

      const res = await fetch("/api/files/save-excel", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Save failed"); }
      setSuccess(true);
      onSaveSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!workbook) return;
    const bytes = await workbook.xlsx.writeBuffer();
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (loading) return;

    if (!(window as any).html2pdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        executePDFGeneration();
      };
      document.head.appendChild(script);
    } else {
      executePDFGeneration();
    }
  };

  const executePDFGeneration = () => {
    const element = gridContainerRef.current;
    if (!element) return;

    const contentDiv = element.querySelector("div");
    if (!contentDiv) return;

    const printArea = contentDiv.cloneNode(true) as HTMLDivElement;

    // Reset styles for printing
    printArea.style.width = "100%";
    printArea.style.maxWidth = "100%";
    printArea.style.position = "relative";
    printArea.style.padding = "0";
    printArea.style.margin = "0";
    printArea.style.backgroundColor = "#ffffff";

    const table = printArea.querySelector("table");
    if (table) {
      table.style.width = "100%";
      table.style.tableLayout = "fixed";
      table.style.backgroundColor = "#ffffff";
      table.style.color = "#000000";

      // Hide the column letters row (thead)
      const thead = table.querySelector("thead");
      if (thead) {
        thead.style.display = "none";
      }

      // Hide the first col in colgroup (the 48px spacer)
      const colgroup = table.querySelector("colgroup");
      if (colgroup && colgroup.firstElementChild) {
        (colgroup.firstElementChild as HTMLElement).style.display = "none";
      }

      // Hide the first td (row number) in each row
      const rows = table.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        if (row.firstElementChild) {
          (row.firstElementChild as HTMLElement).style.display = "none";
        }
      });

      // Reset zIndex and sticky positioning for printable cells, and strip selected borders
      const cells = table.querySelectorAll("th, td");
      cells.forEach((cellNode) => {
        const cell = cellNode as HTMLElement;
        cell.style.position = "static";
        cell.style.zIndex = "auto";
        cell.style.transform = "none";

        if (cell.tagName.toLowerCase() === "td") {
          // Remove active selection outline
          if (cell.style.outline) {
            cell.style.outline = "";
            cell.style.outlineOffset = "";
          }

          // Restore original background if cell was selected
          const originalBg = cell.getAttribute("data-original-bg");
          const bg = cell.style.background || cell.style.backgroundColor || "";
          if (bg.includes("rgba(26, 115, 232") || bg.includes("rgba(26,115,232")) {
            cell.style.background = originalBg || "#ffffff";
            cell.style.backgroundColor = originalBg || "#ffffff";
          }
        }
      });
    }

    // Shift absolute image overlays back by 48px left and 32px top to match the hidden headings
    const images = printArea.querySelectorAll("img");
    images.forEach((imgNode) => {
      const img = imgNode as HTMLImageElement;
      img.style.position = "absolute";
      const leftVal = parseFloat(img.style.left);
      const topVal = parseFloat(img.style.top);
      if (!isNaN(leftVal)) {
        img.style.left = `${leftVal - 48}px`;
      }
      if (!isNaN(topVal)) {
        img.style.top = `${topVal - 32}px`;
      }
    });

    const iframe = document.createElement("iframe");
    iframe.id = "pdf-temp-iframe";
    iframe.style.position = "absolute";
    iframe.style.width = "1100px";
    iframe.style.height = "850px";
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
              padding: 24px;
              background-color: #ffffff;
              color: #000000;
              font-family: sans-serif;
            }
            .header {
              margin-bottom: 20px;
              border-bottom: 2px solid #eab308;
              padding-bottom: 10px;
            }
            .header h1 {
              font-size: 18px;
              margin: 0;
              color: #eab308;
            }
            .header p {
              font-size: 10px;
              margin: 5px 0 0 0;
              color: #666;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            td {
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${fileName}</h1>
            <p>Sheet: ${currentSheet} | Exported from Askari Portal</p>
          </div>
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
      margin: 0.25,
      filename: fileName.replace(/\.[^/.]+$/, "") + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      },
      jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
    };

    (window as any)
      .html2pdf()
      .from(iframeDoc.body)
      .set(opt)
      .save()
      .then(() => {
        const el = document.getElementById("pdf-temp-iframe");
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      })
      .catch((err: any) => {
        console.error("PDF export failed:", err);
        const el = document.getElementById("pdf-temp-iframe");
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
  };

  const { sidebarCollapsed } = useStore();

  return (
    <div
      className={`fixed top-0 bottom-0 right-0 z-50 bg-white dark:bg-zinc-950 flex flex-col animate-fade-in text-xs border-l border-zinc-200 dark:border-zinc-800 ${
        sidebarCollapsed ? "left-0 md:left-16" : "left-0 md:left-64"
      }`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ── Top Bar ── */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white truncate max-w-xs md:max-w-lg" title={fileName}>
              {fileName}
            </h2>
            <p className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider mt-0.5">
              Askari Portal · Cloud Sheets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {success && (
            <span className="px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold animate-pulse">
              ✓ Saved
            </span>
          )}
          {error && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Row controls */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl">
            <button onClick={addRow} className="flex items-center gap-1 px-2.5 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer font-medium">
              <Plus className="h-3.5 w-3.5 text-emerald-500" /><span>Row</span>
            </button>
            <button onClick={deleteRow} disabled={!selectedCell || rowCount <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg disabled:opacity-20 transition cursor-pointer font-medium">
              <Trash2 className="h-3.5 w-3.5" /><span>Row</span>
            </button>
          </div>

          {/* Col controls */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl">
            <button onClick={addColumn} className="flex items-center gap-1 px-2.5 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer font-medium">
              <Plus className="h-3.5 w-3.5 text-emerald-500" /><span>Col</span>
            </button>
            <button onClick={deleteColumn} disabled={!selectedCell || colCount <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg disabled:opacity-20 transition cursor-pointer font-medium">
              <Trash2 className="h-3.5 w-3.5" /><span>Col</span>
            </button>
          </div>

          <div className="h-5 w-px bg-zinc-800 mx-1" />

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition disabled:opacity-50 cursor-pointer text-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:text-white font-bold rounded-xl transition cursor-pointer text-xs text-zinc-300"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" /><span>Download Excel</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:text-white font-bold rounded-xl transition cursor-pointer text-xs text-zinc-300"
          >
            <Download className="h-3.5 w-3.5 text-red-400" /><span>Download PDF</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 bg-zinc-900 hover:bg-red-500 hover:text-white border border-zinc-800 rounded-xl transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Formula Bar ── */}
      <div className="bg-zinc-900 px-4 py-1.5 border-b border-zinc-800 flex items-center gap-3 flex-shrink-0">
        <div className="w-16 bg-zinc-950 border border-zinc-800 rounded py-0.5 text-center font-bold font-mono text-zinc-550 select-none text-[10px]">
          {selectedCell ? `${getColLetter(selectedCell.c)}${selectedCell.r + 1}` : "--"}
        </div>
        <div className="text-zinc-550 font-serif font-bold italic select-none text-[11px]">fx</div>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          disabled={!selectedCell || loading}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-1 text-white focus:outline-none focus:border-amber-500/50 font-mono text-xs"
          placeholder="Select a cell to edit…"
        />
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-auto relative" ref={gridContainerRef} style={{ background: "#f8f9fa" }}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Loading spreadsheet…</p>
          </div>
        ) : (
          <div style={{ position: "relative", width: "max-content", padding: "2px" }}>
            {/* Image overlays */}
            {currentSheetImages.map((img, i) => {
              let left = 48;
              for (let c = 0; c < img.col; c++) left += getColWidth(c);
              left += img.colOffEmu / EMU_PER_PX;
              
              let top = 0;
              for (let r = 0; r < img.row; r++) top += getRowHeight(r);
              top += img.rowOffEmu / EMU_PER_PX;
              
              const width = img.widthEmu / EMU_PER_PX;
              const height = img.heightEmu / EMU_PER_PX;
              return (
                <img
                  key={i}
                  src={img.dataUrl}
                  alt=""
                  style={{
                    position: "absolute",
                    left,
                    top: top + 32, // sticky headers gap offset
                    width,
                    height,
                    objectFit: "contain",
                    pointerEvents: "none",
                    zIndex: 15,
                  }}
                />
              );
            })}
            <table className="table-fixed border-collapse font-sans text-[12px] select-none" style={{ borderSpacing: 0 }}>
              <colgroup>
                <col style={{ width: 48 }} />
                {Array.from({ length: colCount }).map((_, c) => (
                  <col key={c} style={{ width: getColWidth(c) }} />
                ))}
              </colgroup>

              <thead className="sticky top-0 z-20">
                <tr style={{ background: "#e8eaed" }}>
                  <th
                    style={{ width: 48, minWidth: 48, maxWidth: 48, background: "#e8eaed", borderRight: "1px solid #bdc1c6", borderBottom: "1px solid #bdc1c6" }}
                    className="sticky left-0 z-30 text-[10px] font-bold text-zinc-500 select-none p-0 text-center"
                  />
                  {Array.from({ length: colCount }).map((_, c) => (
                    <th
                      key={c}
                      style={{
                        width: getColWidth(c),
                        minWidth: getColWidth(c),
                        maxWidth: getColWidth(c),
                        background: selectedCell?.c === c ? "#d2e3fc" : "#e8eaed",
                        borderRight: "1px solid #bdc1c6",
                        borderBottom: "1px solid #bdc1c6",
                        position: "relative",
                      }}
                      className="p-1 text-center text-[11px] font-bold select-none overflow-hidden"
                    >
                      <span style={{ color: selectedCell?.c === c ? "#1a73e8" : "#444" }}>
                        {getColLetter(c)}
                      </span>
                      <div
                        onMouseDown={(e) => handleResizeStart(e, c)}
                        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, cursor: "col-resize", zIndex: 10 }}
                        className="hover:bg-blue-500 transition"
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: rowCount }).map((_, r) => (
                  <tr key={r} style={{ height: getRowHeight(r) }}>
                    <td
                      style={{
                        width: 48,
                        minWidth: 48,
                        maxWidth: 48,
                        background: selectedCell?.r === r ? "#d2e3fc" : "#e8eaed",
                        borderRight: "1px solid #bdc1c6",
                        borderBottom: "1px solid #d0d0d0",
                        color: selectedCell?.r === r ? "#1a73e8" : "#444",
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: "bold",
                        userSelect: "none",
                      }}
                      className="sticky left-0 z-10"
                    >
                      {r + 1}
                    </td>

                    {Array.from({ length: colCount }).map((_, c) => {
                      const cd = grid[r]?.[c];
                      if (cd?.hidden) return null;

                      const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                      const isEditing = editingCell?.r === r && editingCell?.c === c;
                      const val = cd?.value !== null && cd?.value !== undefined ? String(cd.value) : "";
                      const cellInlineStyle = cd?.style ? styleToInline(cd.style) : {};

                      const tdStyle: React.CSSProperties = {
                        width: getColWidth(c),
                        minWidth: getColWidth(c),
                        maxWidth: getColWidth(c),
                        height: cd?.rowSpan ? undefined : getRowHeight(r),
                        borderRight: cellInlineStyle.borderRight ?? "1px solid #d0d0d0",
                        borderBottom: cellInlineStyle.borderBottom ?? "1px solid #d0d0d0",
                        borderLeft: cellInlineStyle.borderLeft,
                        borderTop: cellInlineStyle.borderTop,
                        padding: "0 4px",
                        overflow: "hidden",
                        position: "relative",
                        cursor: "cell",
                        verticalAlign: cd?.style?.valign ?? "middle",
                        whiteSpace: cd?.style?.wrapText ? "pre-wrap" : "nowrap",
                        background: isSelected
                          ? "rgba(26,115,232,0.12)"
                          : (cellInlineStyle.backgroundColor as string | undefined) ?? "#fff",
                        outline: isSelected ? "2px solid #1a73e8" : undefined,
                        outlineOffset: isSelected ? "-2px" : undefined,
                        zIndex: isSelected ? 5 : undefined,
                        boxSizing: "border-box",
                      };

                      const textStyle: React.CSSProperties = {
                        color: cellInlineStyle.color as string ?? (isSelected ? "#1a73e8" : "#202124"),
                        fontWeight: cellInlineStyle.fontWeight,
                        fontStyle: cellInlineStyle.fontStyle,
                        textDecoration: cellInlineStyle.textDecoration,
                        fontSize: cellInlineStyle.fontSize ?? 12,
                        fontFamily: cellInlineStyle.fontFamily ?? "inherit",
                        textAlign: (cellInlineStyle.textAlign as any) ?? (typeof cd?.value === "number" ? "right" : "left"),
                        lineHeight: `${getRowHeight(r)}px`,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: cd?.style?.wrapText ? "pre-wrap" : "nowrap",
                      };

                      return (
                        <td
                          key={c}
                          rowSpan={cd?.rowSpan}
                          colSpan={cd?.colSpan}
                          title={val}
                          style={tdStyle}
                          data-original-bg={cd?.style?.bgColor || ""}
                          onClick={() => selectCell(r, c)}
                          onDoubleClick={() => startEdit(r, c)}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                background: "#fff",
                                border: "2px solid #1a73e8",
                                padding: "0 4px",
                                fontSize: 12,
                                outline: "none",
                                zIndex: 20,
                                boxSizing: "border-box",
                              }}
                            />
                          ) : (
                            <span style={textStyle}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Sheet Tabs ── */}
      {sheetNames.length > 0 && (
        <div
          className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5 border-t border-zinc-200 dark:border-zinc-800 overflow-x-auto"
          style={{ background: "#f1f3f4" }}
        >
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => {
                setCurrentSheet(name);
                setSelectedCell(null);
                setEditingCell(null);
                setEditValue("");
              }}
              style={{
                padding: "3px 16px",
                borderRadius: 2,
                fontSize: 11,
                fontWeight: currentSheet === name ? 700 : 500,
                background: currentSheet === name ? "#fff" : "transparent",
                color: currentSheet === name ? "#1a73e8" : "#5f6368",
                borderTop: currentSheet === name ? "2px solid #1a73e8" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                outline: "none",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
