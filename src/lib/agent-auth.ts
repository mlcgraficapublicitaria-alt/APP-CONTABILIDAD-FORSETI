import crypto from "node:crypto";

export function isForsetiAgentAuthorized(request: Request) {
  const expected = process.env.FORSETI_AGENT_TOKEN?.trim() ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return Boolean(expected && provided && left.length === right.length && crypto.timingSafeEqual(left, right));
}
