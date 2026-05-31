import fetch from "node-fetch";
import crypto from "crypto";
import { sanitizeCallbackUrl } from "@/lib/security/validation";
import { logger } from "@/lib/logger";

// Google OAuth configuration
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  scope: "openid email profile",
  responseType: "code",
  accessType: "offline",
  prompt: "consent",
};

const OAUTH_STATE_SIGNING_SECRET =
  process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET || "";

function getOAuthStateSigningSecret(): string {
  if (
    !OAUTH_STATE_SIGNING_SECRET ||
    OAUTH_STATE_SIGNING_SECRET.length < 32
  ) {
    throw new Error(
      "GOOGLE_OAUTH_STATE_SECRET (or JWT_SECRET fallback) must be set and at least 32 characters"
    );
  }

  return OAUTH_STATE_SIGNING_SECRET;
}

type OAuthStatePayload = {
  csrf: string;
  callbackUrl: string;
  redirectUri: string;
  iat: number;
};

// Google OAuth URLs
export const GOOGLE_OAUTH_URLS = {
  authorize: "https://accounts.google.com/o/oauth2/v2/auth",
  token: "https://oauth2.googleapis.com/token",
  userInfo: "https://www.googleapis.com/oauth2/v2/userinfo",
};

// Generate Google OAuth URL
export function getGoogleOAuthURL(
  callbackUrl?: string,
  redirectUri?: string
): string {
  const resolvedRedirectUri =
    redirectUri ||
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`;

  const stateObj: OAuthStatePayload = {
    csrf: generateState(),
    callbackUrl: sanitizeCallbackUrl(callbackUrl || "/"),
    redirectUri: resolvedRedirectUri,
    iat: Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(stateObj)).toString("base64url");
  const signature = createStateSignature(encodedPayload);

  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: resolvedRedirectUri,
    scope: GOOGLE_OAUTH_CONFIG.scope,
    response_type: GOOGLE_OAUTH_CONFIG.responseType,
    access_type: GOOGLE_OAUTH_CONFIG.accessType,
    prompt: GOOGLE_OAUTH_CONFIG.prompt,
    state: `${encodedPayload}.${signature}`,
  });
  return `${GOOGLE_OAUTH_URLS.authorize}?${params.toString()}`;
}

// Generate random state for CSRF protection
function generateState(): string {
  return crypto.randomBytes(24).toString("hex");
}

function createStateSignature(payload: string) {
  const signingSecret = getOAuthStateSigningSecret();

  return crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");
}

export function parseAndValidateOAuthState(
  value: string | null,
  maxAgeMs: number = 10 * 60 * 1000
): OAuthStatePayload | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createStateSignature(payload);
  if (expectedSignature.length !== signature.length) {
    return null;
  }

  const validSignature = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
  if (!validSignature) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as OAuthStatePayload;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.csrf !== "string" || parsed.csrf.length < 16) {
      return null;
    }

    if (typeof parsed.iat !== "number") {
      return null;
    }

    if (typeof parsed.redirectUri !== "string" || !parsed.redirectUri) {
      return null;
    }

    if (Date.now() - parsed.iat > maxAgeMs) {
      return null;
    }

    return {
      csrf: parsed.csrf,
      callbackUrl: sanitizeCallbackUrl(parsed.callbackUrl || "/"),
      redirectUri: parsed.redirectUri,
      iat: parsed.iat,
    };
  } catch {
    return null;
  }
}

// Check if Google OAuth is configured
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );
}

// Exchange authorization code for access token (server-side only)
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}>;
export async function exchangeCodeForTokens(
  code: string,
  redirectUriOverride: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}>;
export async function exchangeCodeForTokens(
  code: string,
  redirectUriOverride?: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}> {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri =
    redirectUriOverride || process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  if (!clientSecret) {
    throw new Error("Google Client Secret not configured");
  }

  if (!clientId) {
    throw new Error("Google Client ID not configured");
  }

  if (!redirectUri) {
    throw new Error("Google Redirect URI not configured");
  }

  const response = await fetch(GOOGLE_OAUTH_URLS.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${errorData}`);
  }

  return response.json();
}

// Get user info from Google
export async function getGoogleUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}> {
  const response = await fetch(
    `${GOOGLE_OAUTH_URLS.userInfo}?access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to get user info from Google: ${errorData}`);
  }

  return response.json();
}

// Verify Google OAuth by exchanging code for tokens and fetching user info
export async function verifyGoogleOAuth(code: string): Promise<any> {
  try {
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(code);

    // Fetch user info using the access token
    const userInfoResponse = await fetch(GOOGLE_OAUTH_URLS.userInfo, {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userInfo = await userInfoResponse.json();
    return userInfo;
  } catch (error) {
    logger.error("Error verifying Google OAuth:", error);
    throw error;
  }
}
