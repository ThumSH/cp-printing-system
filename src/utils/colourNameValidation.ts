// src/utils/colourNameValidation.ts
// Single source of truth for colour name format validation.
// Used by both DevelopmentPage (inline add) and ColourMasterPage (admin CRUD).

// Valid: "W-1 — White", "GR-2 — Grey Melange", "BL-10 — Baby Blue"
// Invalid: "red", "w-1 — white" (lowercase code), "W1 — White" (no hyphen), "red1w"
export const COLOUR_NAME_REGEX = /^[A-Z]{1,5}-\d{1,2} — [A-Za-z][A-Za-z0-9\s\-]{1,49}$/;

export const COLOUR_FORMAT_HINT = 'Format: CODE-# — Name  e.g. "W-1 — White" or "GR-2 — Grey Melange"';

export const COLOUR_FORMAT_RULES = [
  'Code: 1–5 uppercase letters (e.g. W, GR, BLK)',
  'Hyphen then 1–2 digits (e.g. -1, -12)',
  'Space, em-dash, space:  — ',
  'Descriptive name starting with a letter',
];

export function validateColourName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';

  // Check for common mistakes and give targeted feedback
  if (!/^[A-Z]/.test(trimmed))
    return 'Code must start with uppercase letters (e.g. W, GR, BLK)';

  if (!/^[A-Z]{1,5}-/.test(trimmed))
    return 'Code must be uppercase letters followed by a hyphen (e.g. W-, GR-)';

  if (!/^[A-Z]{1,5}-\d/.test(trimmed))
    return 'After the hyphen, add 1–2 digits (e.g. W-1, GR-12)';

  if (!/^[A-Z]{1,5}-\d{1,2} — /.test(trimmed))
    return 'After the number, type:  — (space, em-dash, space) then the colour name';

  if (!COLOUR_NAME_REGEX.test(trimmed))
    return 'Name after " — " must start with a letter and be 2–50 characters';

  return null; // valid
}