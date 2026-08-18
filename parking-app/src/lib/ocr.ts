import TextRecognition from "@react-native-ml-kit/text-recognition";

/**
 * Standard Philippine vehicle and motorcycle plate formats:
 * - 3 Letters + 4 Digits (e.g. ABC 1234, ABC-1234, ABC1234)
 * - 3 Letters + 3 Digits (e.g. ABC 123, ABC-123, ABC123)
 * - 2 Letters + 5 Digits / 2 Letters + 4 Digits (e.g. AB 12345, AB 1234)
 * - Motorcycle 1 Letter + 3 Digits + 2 Letters or 1 Letter + 4 Digits (e.g. 123 ABC, 1234 AB)
 */
const PLATE_PATTERNS = [
  /\b[A-Z]{3}[- ]?\d{4}\b/,     // e.g. ABC 1234 / ABC-1234
  /\b[A-Z]{3}[- ]?\d{3}\b/,     // e.g. ABC 123 / ABC-123
  /\b[A-Z]{2}[- ]?\d{4,5}\b/,   // e.g. AB 12345
  /\b\d{3}[- ]?[A-Z]{3}\b/,     // e.g. 123 ABC
  /\b\d{4}[- ]?[A-Z]{2}\b/,     // e.g. 1234 AB
];

export interface OcrResult {
  rawText: string;
  candidatePlate: string | null;
  confidence: "high" | "low";
}

/**
 * Runs on-device OCR against a captured photo and extracts the license plate.
 * Only valid structured license plate matches will return high confidence.
 */
export async function recognizePlate(photoPath: string): Promise<OcrResult> {
  const result = await TextRecognition.recognize(photoPath);
  const rawText = result.text.replace(/\n/g, " ").toUpperCase();

  for (const pattern of PLATE_PATTERNS) {
    const match = rawText.match(pattern);
    if (match) {
      const candidate = match[0].replace(/[- ]/g, "").trim();
      return { rawText, candidatePlate: candidate, confidence: "high" };
    }
  }

  return { rawText, candidatePlate: null, confidence: "low" };
}

