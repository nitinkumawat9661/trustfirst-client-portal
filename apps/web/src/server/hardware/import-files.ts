export const hardwareProductImportColumns = [
  "Product name",
  "SKU",
  "Barcode",
  "Category",
  "Brand",
  "Unit",
  "HSN",
  "GST rate",
  "Purchase rate",
  "Sale rate",
  "MRP",
  "Opening stock",
  "Minimum stock",
  "Stock location",
  "Active status",
] as const;

export function hardwareProductImportTemplateCsv() {
  return toCsv([
    [...hardwareProductImportColumns],
    [
      "CPVC Pipe 1 inch",
      "PIPE-CPVC-001",
      "890000000001",
      "Pipes",
      "Generic",
      "PCS",
      "3917",
      "18%",
      "120.00",
      "150.00",
      "180.00",
      "25",
      "5",
      "Main Godown",
      "Active",
    ],
  ]);
}

export async function parseHardwareImportRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return request.json() as Promise<Record<string, unknown>>;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw validation("Import file is required.");
  }
  if (file.size > 1024 * 1024) {
    throw validation("Import file must be 1 MB or smaller.");
  }
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".xlsx")) {
    throw validation("XLSX import requires a spreadsheet parser dependency. Download the CSV template for this release.");
  }
  if (!fileName.endsWith(".csv") && !file.type.includes("csv")) {
    throw validation("Only CSV files are supported by this release.");
  }
  return {
    duplicateMode: readFormValue(formData, "duplicateMode") ?? "reject",
    dryRun: readFormValue(formData, "dryRun") === "true",
    idempotencyKey: readFormValue(formData, "idempotencyKey"),
    mode: readFormValue(formData, "mode") ?? "create",
    rows: parseCsv(await file.text()),
  };
}

export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function parseCsv(input: string): Array<Record<string, unknown>> {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...dataRows] = rows.filter((candidate) => candidate.some((value) => value.trim()));
  if (!headers) return [];
  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), dataRow[index]?.trim() ?? ""])),
  );
}

function escapeCsvCell(value: string) {
  const safe = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return /[",\r\n]/u.test(safe) ? `"${safe.replaceAll("\"", "\"\"")}"` : safe;
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}
import { AppError } from "../domain/errors";
