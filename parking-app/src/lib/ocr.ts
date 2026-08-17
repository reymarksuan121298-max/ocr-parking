import TextRecognition from "@react-native-ml-kit/text-recognition";

/**
 * Philippine private-vehicle plate formats are typically 3 letters + 4
 * digits (newer) or 3 letters + 3 digits (older), sometimes with a
 * hyphen/space. Motorcycles use a different pattern. Adjust this regex
 * to whatever formats your school's registered vehicles actually use.
 */
const PLATE_PATTERNS = [
  /\b[A-Z]{3}[- ]?\d{3,4}\b/, // e.g. ABC 1234 / ABC-1234
  /\b[A-Z]{2}[- ]?\d{4,5}\b/, // older format
];

export interface OcrResult {
  rawText: string;
  candidatePlate: string | null;
  confidence: "high" | "low";
}

/**
 * Runs on-device OCR against a captured photo and extracts the most
 * plate-like substring. This never auto-commits a result — the caller
 * (ConfirmPlateScreen) always shows it to the guard for confirmation
 * or manual correction before it is saved.
 */
export async function recognizePlate(photoPath: string): Promise<OcrResult> {
  const result = await TextRecognition.recognize(photoPath);
  const rawText = result.text.replace(/\n/g, " ").toUpperCase();

  for (const pattern of PLATE_PATTERNS) {
    const match = rawText.match(pattern);
    if (match) {
      const candidate = match[0].replace(/[- ]/g, "");
      return { rawText, candidatePlate: candidate, confidence: "high" };
    }
  }

  // Fall back to the longest alphanumeric token found, flagged low-confidence
  // so the UI can prompt the guard to double-check or retake the photo.
  const tokens = rawText.match(/[A-Z0-9]{4,8}/g) ?? [];
  const longest = tokens.sort((a, b) => b.length - a.length)[0] ?? null;

  return { rawText, candidatePlate: longest, confidence: longest ? "low" : "low" };
}
