const DEFAULT_ALLOWED_CALLBACK_PREFIXES = [
  "/",
  "/collections",
  "/anime",
  "/meme",
  "/custom",
  "/cart",
  "/checkout",
  "/orders",
  "/admin",
  "/about",
  "/contact",
  "/faq",
  "/shipping",
  "/tshirt-brands-india",
  "/custom-tshirt-printing-india",
];

const CALLBACK_URL_MAX_LENGTH = 500;

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{2,5})?(?:\/.*)?$/;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeUrlPath(path: string): string {
  if (!path) return "/";
  const trimmed = path.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function sanitizeEmail(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function sanitizeName(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export function sanitizeCallbackUrl(
  callbackUrl: unknown,
  allowedPrefixes: string[] = DEFAULT_ALLOWED_CALLBACK_PREFIXES
): string {
  if (typeof callbackUrl !== "string") {
    return "/";
  }

  const decoded = decodeURIComponent(callbackUrl);
  const trimmed = decoded.trim();

  if (!trimmed || trimmed.length > CALLBACK_URL_MAX_LENGTH) {
    return "/";
  }

  if (!trimmed.startsWith("/")) {
    return "/";
  }

  if (trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/";
  }

  if (allowedPrefixes.some((prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`) || trimmed.startsWith(`${prefix}?`))) {
    return trimmed;
  }

  return "/";
}

export function sanitizeLinkUrl(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "/collections";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (!raw.startsWith("/")) {
    return `/${raw}`;
  }

  return raw;
}

export function validateImageUrls(images: unknown): images is string[] {
  if (!Array.isArray(images) || images.length === 0) {
    return false;
  }

  return images.every((entry) => {
    if (typeof entry !== "string") {
      return false;
    }

    const value = entry.trim();
    if (!value) {
      return false;
    }

    return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://");
  });
}

export function parsePositiveInt(
  value: unknown,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const min = options.min ?? 1;
  const max = options.max;

  if (parsed < min) {
    return fallback;
  }

  if (typeof max === "number" && parsed > max) {
    return fallback;
  }

  return parsed;
}

export function parsePrice(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function normalizeStringList(value: unknown): string[] {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseHostFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    if (DOMAIN_REGEX.test(url)) {
      return url;
    }
    return null;
  }
}
