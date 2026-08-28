/**
 * Branding shown on the recipient consent page. Override any of these with
 * environment variables so the page carries your real unit's letterhead.
 */
export interface AgencyConfig {
  name: string; // e.g. "Karnataka State Police"
  unit: string; // e.g. "Cyber Crime Investigation Cell"
  emblem: string; // single emoji / glyph used as the crest
  verifyPhone: string; // number the recipient can call to confirm the request
  verifyNote: string; // short line explaining how to verify
  privacyNote: string; // what happens to the data
}

export function getAgency(): AgencyConfig {
  return {
    name: process.env.NEXT_PUBLIC_AGENCY_NAME || "State Police",
    unit: process.env.NEXT_PUBLIC_AGENCY_UNIT || "Cyber Crime Investigation Cell",
    emblem: process.env.NEXT_PUBLIC_AGENCY_EMBLEM || "\u{1F6E1}\u{FE0F}", // 🛡️
    verifyPhone: process.env.NEXT_PUBLIC_AGENCY_VERIFY_PHONE || "",
    verifyNote:
      process.env.NEXT_PUBLIC_AGENCY_VERIFY_NOTE ||
      "If you are unsure this request is genuine, contact the investigating officer using the case number below before sharing anything.",
    privacyNote:
      process.env.NEXT_PUBLIC_AGENCY_PRIVACY_NOTE ||
      "Your coordinates are sent only to the investigating officer for this case and are stored as evidence. Nothing is collected unless you tap Allow.",
  };
}
