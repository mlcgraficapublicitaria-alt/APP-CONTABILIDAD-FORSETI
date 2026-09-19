const FORBIDDEN_KEYS = new Set([
  "nif",
  "cif",
  "vatid",
  "iban",
  "email",
  "phone",
  "address",
  "invoicenumber",
  "driveurl",
  "documentbase64",
  "fullname",
  "legalname",
  "taxpayername",
  "postaladdress",
]);

const FORBIDDEN_VALUE_PATTERNS = [
  /\b[A-Z]\d{7}[A-Z0-9]\b/i,
  /\bES\d{22}\b/i,
  /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i,
  /https?:\/\/(?:drive|docs)\.google\.com/i,
  /data:application\/(?:pdf|octet-stream);base64,/i,
  /data:[^;,]+;base64,/i,
  /\b(?:\+34[ .-]?)?(?:6|7|8|9)\d{8}\b/,
  /\b(?:calle|avenida|avda\.?|plaza|paseo|carretera)\s+[\p{L}\d]/iu,
  /\b(?:factura|invoice)[\s:#-]*[A-Z0-9][A-Z0-9/-]{3,}\b/i,
  /https?:\/\/[^\s]+/i,
];

const SYNTHETIC_ID_KEYS = new Set(["anonymousentryid", "anonymouscounterpartyid"]);
const SYNTHETIC_ID_PATTERN = /^(?:ANON-|EU-SUPPLIER-|ENTRY-)[A-Z0-9-]+$/;

export function scanFixtureForPersonalData(value: unknown): string[] {
  const findings: string[] = [];

  function visit(node: unknown, path: string): void {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (node && typeof node === "object") {
      Object.entries(node).forEach(([key, child]) => {
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) findings.push(`${path}.${key}: forbidden key`);
        if (SYNTHETIC_ID_KEYS.has(key.toLowerCase()) && typeof child === "string" && !SYNTHETIC_ID_PATTERN.test(child)) {
          findings.push(`${path}.${key}: non-synthetic identifier`);
        }
        visit(child, `${path}.${key}`);
      });
      return;
    }
    if (typeof node === "string") {
      FORBIDDEN_VALUE_PATTERNS.forEach((pattern) => {
        if (pattern.test(node)) findings.push(`${path}: forbidden value pattern`);
      });
    }
  }

  visit(value, "$fixture");
  return findings;
}
