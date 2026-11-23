import { z } from "zod";
import { IMPORT_TEMPLATE_COLUMNS } from "@/types/question-import";

export const IMPORT_FILE_LIMITS = {
  MAX_EXCEL_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_ZIP_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  ASYNC_ROW_THRESHOLD: 100,
  MAX_ROWS_LIMIT: 1000,
  ALLOWED_EXTENSIONS: [".xlsx", ".xls", ".zip"] as const,
} as const;

export interface PreviewRowItem {
  rowNumber: number;
  partNumber: number | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  difficulty: string;
  groupId: string;
  mediaRef: string;
  isValid: boolean;
  errors: string[];
}

export interface ClientImportPreviewResult {
  fileName: string;
  fileType: "excel" | "zip";
  totalRows: number;
  isUnderPreviewThreshold: boolean;
  validCount: number;
  invalidCount: number;
  groupedCount: number;
  rows: PreviewRowItem[];
  headerError?: string;
}

export function validateImportFileStrict(file: File | null | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!file || !(file instanceof File)) {
    return {
      isValid: false,
      error:
        "Vui lòng chọn tệp Excel (.xlsx, .xls) hoặc gói nén (.zip) để tải lên.",
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: "Tệp tải lên đang trống (0 bytes). Vui lòng chọn tệp hợp lệ.",
    };
  }

  const lowerName = file.name.toLowerCase();
  const isAllowedExt = IMPORT_FILE_LIMITS.ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );

  if (!isAllowedExt) {
    return {
      isValid: false,
      error:
        "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận tệp .xlsx, .xls hoặc .zip.",
    };
  }

  const isZip = lowerName.endsWith(".zip");
  if (isZip && file.size > IMPORT_FILE_LIMITS.MAX_ZIP_SIZE_BYTES) {
    return {
      isValid: false,
      error: "Kích thước gói ZIP vượt quá giới hạn tối đa 50MB.",
    };
  }

  if (!isZip && file.size > IMPORT_FILE_LIMITS.MAX_EXCEL_SIZE_BYTES) {
    return {
      isValid: false,
      error: "Kích thước tệp Excel vượt quá giới hạn tối đa 10MB.",
    };
  }

  return { isValid: true };
}

export const questionImportFormSchema = z.object({
  targetStatus: z.enum(["draft", "pending_review"], {
    error:
      "Trạng thái sau khi import phải là 'Lưu bản nháp' hoặc 'Gửi duyệt ngay'.",
  }),
  file: z
    .custom<File>((val) => val instanceof File, {
      message:
        "Vui lòng chọn tệp Excel (.xlsx, .xls) hoặc gói nén (.zip) để tải lên.",
    })
    .superRefine((file, ctx) => {
      const validation = validateImportFileStrict(file);
      if (!validation.isValid) {
        ctx.addIssue({
          code: "custom",
          message: validation.error || "Tệp không hợp lệ.",
        });
      }
    }),
});

export type QuestionImportFormValues = z.infer<typeof questionImportFormSchema>;

/**
 * Validates parsed raw rows according to TOEIC Part 1-7 rules (Rule #1002 & PMR 004 #2).
 */
export function validatePreviewRows(
  rawRows: Array<Record<string, string>>
): Omit<ClientImportPreviewResult, "fileName" | "fileType"> {
  const totalRows = rawRows.length;

  if (totalRows === 0) {
    return {
      totalRows: 0,
      isUnderPreviewThreshold: true,
      validCount: 0,
      invalidCount: 0,
      groupedCount: 0,
      rows: [],
      headerError: "Tệp không có dữ liệu câu hỏi nào để nhập.",
    };
  }

  if (totalRows > IMPORT_FILE_LIMITS.MAX_ROWS_LIMIT) {
    return {
      totalRows,
      isUnderPreviewThreshold: false,
      validCount: 0,
      invalidCount: totalRows,
      groupedCount: 0,
      rows: [],
      headerError:
        "Số dòng dữ liệu vượt quá giới hạn tối đa 1.000 dòng mỗi lần nhập.",
    };
  }

  const groupSet = new Set<string>();
  let validCount = 0;
  let invalidCount = 0;

  const rows: PreviewRowItem[] = rawRows.map((raw, idx) => {
    const rowNumber = idx + 2; // Excel row 1 is header
    const errors: string[] = [];

    const partStr = (raw.Part || "").trim();
    const partNum = Number(partStr);
    const isValidPart =
      partStr !== "" &&
      Number.isInteger(partNum) &&
      partNum >= 1 &&
      partNum <= 7;

    if (!isValidPart) {
      errors.push("Part phải là số nguyên từ 1 đến 7.");
    }

    const questionText = (raw.Question_Text || "").trim();
    const optionA = (raw.Option_A || "").trim();
    const optionB = (raw.Option_B || "").trim();
    const optionC = (raw.Option_C || "").trim();
    const optionD = (raw.Option_D || "").trim();
    const correctAnswer = (raw.Correct_Answer || "").trim().toUpperCase();
    const difficulty = (raw.Difficulty || "medium").trim().toLowerCase();
    const groupId = (raw.Group_ID || raw.Passage_Code || "").trim();
    const mediaRef = (raw.Media_Ref || "").trim();

    if (groupId) {
      groupSet.add(groupId);
    }

    // Rule #1002: Question_Text required for Parts 3, 4, 5, 7 (optional for 1, 2, 6)
    if (isValidPart && [3, 4, 5, 7].includes(partNum) && !questionText) {
      errors.push(`Nội dung câu hỏi (Question_Text) là bắt buộc đối với Part ${partNum}.`);
    }

    // Rule #1002: Options A, B, C required for Parts 3, 4, 5, 6, 7 (optional for 1, 2)
    if (isValidPart && [3, 4, 5, 6, 7].includes(partNum)) {
      if (!optionA || !optionB || !optionC) {
        errors.push(
          `Các phương án A, B, C là bắt buộc đối với Part ${partNum}.`
        );
      }
      if (!optionD) {
        errors.push(
          "Phương án D là bắt buộc đối với Part 3, 4, 5, 6, 7."
        );
      }
    }

    // Part 2 cannot have Option D
    if (isValidPart && partNum === 2 && optionD !== "") {
      errors.push(
        "Part 2 không được có phương án D (chỉ tối đa 3 lựa chọn A, B, C)."
      );
    }

    // Correct_Answer validation
    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      errors.push("Đáp án đúng phải là A, B, C hoặc D.");
    } else if (isValidPart && partNum === 2 && correctAnswer === "D") {
      errors.push("Đáp án đúng của Part 2 chỉ được là A, B hoặc C.");
    }

    // Difficulty validation
    if (difficulty && !["easy", "medium", "hard"].includes(difficulty)) {
      errors.push("Độ khó (Difficulty) phải là easy, medium hoặc hard.");
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    return {
      rowNumber,
      partNumber: isValidPart ? partNum : null,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      difficulty: difficulty || "medium",
      groupId,
      mediaRef,
      isValid,
      errors,
    };
  });

  return {
    totalRows,
    isUnderPreviewThreshold:
      totalRows > 0 && totalRows < IMPORT_FILE_LIMITS.ASYNC_ROW_THRESHOLD,
    validCount,
    invalidCount,
    groupedCount: groupSet.size,
    rows,
  };
}

/**
 * Converts Excel column reference (e.g. "A", "G", "AA") to 0-based column index.
 */
function excelColToIndex(cellRef: string): number {
  const letters = cellRef.replace(/[0-9]/g, "").toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, col - 1);
}

/**
 * Reads ZIP entries using Central Directory Headers so files generated by ExcelJS
 * with streaming Data Descriptors (bit 3 flag where local header size = 0) parse accurately (PMR 004 #1).
 */
async function extractXlsxXmlEntries(
  buffer: ArrayBuffer
): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const result = new Map<string, string>();

  // Locate End of Central Directory (EOCD) signature 0x06054b50 from the end
  let eocdOffset = -1;
  const minEocdSearch = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocdSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid XLSX ZIP Central Directory");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");

  for (let entryIdx = 0; entryIdx < totalEntries; entryIdx++) {
    if (
      cdOffset + 46 > bytes.length ||
      view.getUint32(cdOffset, true) !== 0x02014b50
    ) {
      break;
    }

    const compressionMethod = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const fileNameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const entryName = decoder.decode(
      bytes.subarray(cdOffset + 46, cdOffset + 46 + fileNameLen)
    );

    cdOffset += 46 + fileNameLen + extraLen + commentLen;

    if (
      entryName === "xl/sharedStrings.xml" ||
      entryName === "xl/worksheets/sheet1.xml"
    ) {
      if (
        localHeaderOffset + 30 > bytes.length ||
        view.getUint32(localHeaderOffset, true) !== 0x04034b50
      ) {
        continue;
      }
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedBytes = bytes.subarray(
        dataStart,
        dataStart + compressedSize
      );

      if (compressionMethod === 0) {
        result.set(entryName, decoder.decode(compressedBytes));
      } else if (
        compressionMethod === 8 &&
        typeof DecompressionStream !== "undefined"
      ) {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(compressedBytes);
        writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        result.set(entryName, decoder.decode(new Uint8Array(decompressedBuf)));
      }
    }
  }

  return result;
}

/**
 * Parses an .xlsx file in browser for < 100 rows preview, with graceful fallback
 * for .xls, .zip, or non-standard workbook streams (PMR 004 #1).
 */
export async function parseExcelFileForPreview(
  file: File
): Promise<ClientImportPreviewResult> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".zip")) {
    return {
      fileName: file.name,
      fileType: "zip",
      totalRows: 0,
      isUnderPreviewThreshold: false,
      validCount: 0,
      invalidCount: 0,
      groupedCount: 0,
      rows: [],
    };
  }

  if (lowerName.endsWith(".xls")) {
    return {
      fileName: file.name,
      fileType: "excel",
      totalRows: 0,
      isUnderPreviewThreshold: false,
      validCount: 0,
      invalidCount: 0,
      groupedCount: 0,
      rows: [],
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const xmlMap = await extractXlsxXmlEntries(buffer);
    const sheetXml = xmlMap.get("xl/worksheets/sheet1.xml");
    if (!sheetXml || typeof DOMParser === "undefined") {
      return {
        fileName: file.name,
        fileType: "excel",
        totalRows: 0,
        isUnderPreviewThreshold: false,
        validCount: 0,
        invalidCount: 0,
        groupedCount: 0,
        rows: [],
      };
    }

    const parser = new DOMParser();
    const sharedStrings: string[] = [];
    const sharedXml = xmlMap.get("xl/sharedStrings.xml");
    if (sharedXml) {
      const ssDoc = parser.parseFromString(sharedXml, "application/xml");
      const siNodes = Array.from(ssDoc.getElementsByTagName("si"));
      siNodes.forEach((si) => {
        const tNodes = Array.from(si.getElementsByTagName("t"));
        sharedStrings.push(tNodes.map((t) => t.textContent || "").join(""));
      });
    }

    const sheetDoc = parser.parseFromString(sheetXml, "application/xml");
    const rowNodes = Array.from(sheetDoc.getElementsByTagName("row"));

    if (rowNodes.length === 0) {
      return {
        fileName: file.name,
        fileType: "excel",
        ...validatePreviewRows([]),
      };
    }

    const extractRowValues = (rowEl: Element): string[] => {
      const cellNodes = Array.from(rowEl.getElementsByTagName("c"));
      const values: string[] = [];
      cellNodes.forEach((cell, fallbackIdx) => {
        const ref = cell.getAttribute("r");
        const colIdx = ref ? excelColToIndex(ref) : fallbackIdx;
        const type = cell.getAttribute("t");
        let cellVal = "";

        if (type === "s") {
          const vNode = cell.getElementsByTagName("v")[0];
          const ssIdx = Number(vNode?.textContent || "-1");
          cellVal =
            ssIdx >= 0 && ssIdx < sharedStrings.length
              ? sharedStrings[ssIdx]
              : "";
        } else if (type === "inlineStr") {
          const tNodes = Array.from(cell.getElementsByTagName("t"));
          cellVal = tNodes.map((t) => t.textContent || "").join("");
        } else {
          const vNode = cell.getElementsByTagName("v")[0];
          cellVal = vNode?.textContent || "";
        }

        values[colIdx] = cellVal.trim();
      });
      return values;
    };

    const headerCells = extractRowValues(rowNodes[0]);
    const headerMap = new Map<number, string>();
    headerCells.forEach((h, idx) => {
      if (h) {
        headerMap.set(idx, h);
      }
    });

    // Check required template columns
    const presentHeaders = new Set(headerCells.filter(Boolean));
    const missingColumns = IMPORT_TEMPLATE_COLUMNS.filter(
      (col) => !presentHeaders.has(col)
    );

    if (missingColumns.length > 0) {
      return {
        fileName: file.name,
        fileType: "excel",
        totalRows: Math.max(0, rowNodes.length - 1),
        isUnderPreviewThreshold: true,
        validCount: 0,
        invalidCount: Math.max(0, rowNodes.length - 1),
        groupedCount: 0,
        rows: [],
        headerError: `Cấu trúc tệp không khớp mẫu. Thiếu các cột bắt buộc: ${missingColumns.join(", ")}`,
      };
    }

    const rawRows: Array<Record<string, string>> = [];
    for (let i = 1; i < rowNodes.length; i++) {
      const vals = extractRowValues(rowNodes[i]);
      const hasAnyContent = vals.some((v) => v && v.trim() !== "");
      if (!hasAnyContent) continue;

      const record: Record<string, string> = {};
      headerMap.forEach((colName, colIdx) => {
        record[colName] = vals[colIdx] || "";
      });
      rawRows.push(record);
    }

    return {
      fileName: file.name,
      fileType: "excel",
      ...validatePreviewRows(rawRows),
    };
  } catch {
    // Graceful fallback if browser decompression fails on unusual workbook structure
    return {
      fileName: file.name,
      fileType: "excel",
      totalRows: 0,
      isUnderPreviewThreshold: false,
      validCount: 0,
      invalidCount: 0,
      groupedCount: 0,
      rows: [],
    };
  }
}
