import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface NormalizedPhone {
  e164: string | null;
  raw: string;
  country: string | null;
  valid: boolean;
}

/**
 * PRD §9: parse input, strip formatting, validate country code, convert to E.164.
 * Assumes India (+91) when no country code is supplied, since that is the
 * documented primary deployment.
 */
export function normalizePhone(input: string): NormalizedPhone {
  const raw = input.trim();
  if (!raw) return { e164: null, raw, country: null, valid: false };

  const parsed = parsePhoneNumberFromString(raw, "IN");
  if (!parsed) return { e164: null, raw, country: null, valid: false };

  return {
    e164: parsed.number,
    raw,
    country: parsed.country ?? null,
    valid: parsed.isValid(),
  };
}
