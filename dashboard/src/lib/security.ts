const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

export function sanitizeText(input: string, maxLength = 280): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}…`;
}

export function sanitizeExternalUrl(input: string): string | undefined {
  const trimmed = input.trim();
  if (trimmed.startsWith("ipfs://")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function toBigIntSafe(input: string, fallback = 0n): bigint {
  const normalized = input.trim();
  if (!/^\d+$/.test(normalized)) {
    return fallback;
  }
  try {
    return BigInt(normalized);
  } catch {
    return fallback;
  }
}
