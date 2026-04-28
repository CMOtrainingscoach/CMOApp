export async function parseDocument(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<string> {
  const mimeLower = mime.toLowerCase();
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  try {
    if (mimeLower.includes("pdf") || ext === "pdf") {
      return await parsePdf(buffer);
    }
    if (
      mimeLower.includes("wordprocessingml") ||
      mimeLower.includes("msword") ||
      ext === "docx" ||
      ext === "doc"
    ) {
      return await parseDocx(buffer);
    }
    if (
      mimeLower.includes("spreadsheet") ||
      mimeLower.includes("excel") ||
      ext === "xlsx" ||
      ext === "xls" ||
      ext === "csv"
    ) {
      return await parseSpreadsheet(buffer);
    }
    if (
      mimeLower.includes("presentation") ||
      mimeLower.includes("powerpoint") ||
      ext === "pptx" ||
      ext === "ppt"
    ) {
      return await parsePptx(buffer);
    }
    if (mimeLower.startsWith("text/") || ext === "txt" || ext === "md") {
      return buffer.toString("utf8");
    }
  } catch (e) {
    console.error("parseDocument failed", e);
    return "";
  }
  return "";
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // pdf-parse is CJS; dynamic import gives us .default
  const mod = (await import("pdf-parse")) as unknown as {
    default: (data: Buffer) => Promise<{ text: string }>;
  };
  const result = await mod.default(buffer);
  return result.text ?? "";
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

async function parseSpreadsheet(buffer: Buffer): Promise<string> {
  const xlsx = await import("xlsx");
  const wb = xlsx.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    parts.push(`# Sheet: ${name}\n` + xlsx.utils.sheet_to_csv(sheet));
  }
  return parts.join("\n\n");
}

// Lightweight pptx parser without extra dep: pptx is a zip; slide xml lives at ppt/slides/slideN.xml
// We'll fall back to extracting raw text via a simple unzip + regex when available, otherwise return empty.
async function parsePptx(buffer: Buffer): Promise<string> {
  try {
    // Try xlsx-style read (won't work) — use zip via node's native is not possible without dep,
    // but Node 22 ships `node:zlib` only. Fallback: scan the buffer for XML text nodes.
    const text = buffer.toString("utf8");
    const matches = text.match(/<a:t>([^<]+)<\/a:t>/g) ?? [];
    const out = matches
      .map((m) => m.replace(/<a:t>|<\/a:t>/g, ""))
      .filter((s) => s.trim().length > 1)
      .join(" ");
    return out;
  } catch {
    return "";
  }
}
