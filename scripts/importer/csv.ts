export interface ParsedCsv {
  headers: string[];
  rows: CsvDataRow[];
  warnings: string[];
}

export interface CsvDataRow {
  csvLineNumber: number;
  values: string[];
}

export interface CsvParseOptions {
  expectedColumnCount?: number;
}

export function parseCsv(content: string, options: CsvParseOptions = {}): ParsedCsv {
  const rows = parseCsvRows(content);
  if (rows.length === 0) {
    throw new Error("CSV is empty");
  }

  const headers = rows[0] ?? [];
  const expectedColumnCount = options.expectedColumnCount ?? headers.length;
  const warnings: string[] = [];

  if (headers.length !== expectedColumnCount) {
    throw new Error(
      `CSV header column count ${headers.length} does not match expected ${expectedColumnCount}`,
    );
  }

  const nonBlankHeaders = new Set<string>();
  const duplicateHeaders = new Set<string>();
  let blankHeaderCount = 0;
  for (const header of headers) {
    if (header.trim() === "") {
      blankHeaderCount += 1;
      continue;
    }

    if (nonBlankHeaders.has(header)) {
      duplicateHeaders.add(header);
    }
    nonBlankHeaders.add(header);
  }

  if (blankHeaderCount > 0) {
    warnings.push(`CSV contains ${blankHeaderCount} blank header cell(s)`);
  }
  if (duplicateHeaders.size > 0) {
    throw new Error(
      `CSV contains duplicate non-blank header(s): ${[...duplicateHeaders].join(", ")}`,
    );
  }

  const dataRows: CsvDataRow[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const values = rows[index] ?? [];
    const csvLineNumber = index + 1;
    if (values.length !== expectedColumnCount) {
      throw new Error(
        `CSV row ${csvLineNumber} has ${values.length} columns; expected ${expectedColumnCount}`,
      );
    }
    dataRows.push({ csvLineNumber, values });
  }

  return { headers, rows: dataRows, warnings };
}

export function rawValuesJson(
  phase: string,
  datasetName: string,
  headers: readonly string[],
  values: readonly string[],
): Record<string, unknown> {
  return {
    phase,
    dataset_name: datasetName,
    columns: headers.map((header, index) => ({
      index: index + 1,
      header,
      value: values[index] ?? "",
    })),
  };
}

export function valueByHeader(
  headers: readonly string[],
  values: readonly string[],
  header: string,
): string {
  const index = headers.indexOf(header);
  if (index === -1) {
    return "";
  }
  return values[index] ?? "";
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (inQuotes) {
      if (char === "\"") {
        if (next === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      if (field.length > 0) {
        throw new Error("Malformed CSV: quote appears inside an unquoted field");
      }
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      if (next === "\n") {
        continue;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
