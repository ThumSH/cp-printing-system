// src/utils/colourNameValidation.ts
// Single source of truth for colour name format validation.
// Format: CODE-#-Name  e.g. "R-1-Bright Red", "N-4-Navy Blue", "GR-2-Grey Melange"

// Valid:   "R-1-Bright Red", "N-4-Navy Blue", "GR-10-Grey Melange"
// Invalid: "red", "r-1-red" (lowercase code), "R1-Red" (no digit hyphen)
export const COLOUR_NAME_REGEX = /^[A-Z]{1,5}-\d{1,2}-[A-Za-z][A-Za-z0-9\s]{1,49}$/;

export const COLOUR_FORMAT_HINT = 'Format: CODE-#-Name  e.g. "R-1-Bright Red" or "N-4-Navy Blue"';

export const COLOUR_FORMAT_RULES = [
  'Code: 1–5 uppercase letters (e.g. R, GR, BLK)',
  'Hyphen then 1–2 digits (e.g. -1, -12)',
  'Hyphen then descriptive name starting with a letter (e.g. -Bright Red)',
];

export function validateColourName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';

  if (!/^[A-Z]/.test(trimmed))
    return 'Code must start with uppercase letters (e.g. R, GR, BLK)';

  if (!/^[A-Z]{1,5}-/.test(trimmed))
    return 'Code must be uppercase letters followed by a hyphen (e.g. R-, GR-)';

  if (!/^[A-Z]{1,5}-\d/.test(trimmed))
    return 'After the hyphen, add 1–2 digits (e.g. R-1, GR-12)';

  if (!/^[A-Z]{1,5}-\d{1,2}-/.test(trimmed))
    return 'After the number, add a hyphen then the colour name (e.g. R-1-Bright Red)';

  if (!COLOUR_NAME_REGEX.test(trimmed))
    return 'Name after the second hyphen must start with a letter (e.g. R-1-Bright Red)';

  return null;
}