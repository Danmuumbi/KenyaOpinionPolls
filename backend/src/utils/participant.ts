import crypto from "crypto";

export function generateParticipantToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashParticipantToken(
  token: string
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function hashValue(
  value: string
): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}