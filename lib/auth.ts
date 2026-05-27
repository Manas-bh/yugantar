import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { IUser } from "@/lib/domain/types";
import { sanitizeEmail } from "@/lib/security/validation";
import {
  createUserRecord,
  ensureDefaultAdminUser,
  findUserByEmail,
  findUserById,
  updateUserLastLoginAt,
} from "@/lib/data/users";
import { SupabaseConfigError } from "@/lib/supabase/server";

const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue || jwtSecretValue.length < 32) {
  throw new Error(
    "JWT_SECRET must be set and at least 32 characters long"
  );
}

const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);

/** Track whether the default admin has already been seeded this process. */
let adminInitialized = false;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Create JWT token
export async function createJWT(user: IUser): Promise<string> {
  return await new SignJWT({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 12);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<IUser | null> {
  try {
    return await findUserById(id);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return null;
    }
    console.error("Error getting user by ID:", error);
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<IUser | null> {
  try {
    const normalizedEmail = sanitizeEmail(email);
    return await findUserByEmail(normalizedEmail);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return null;
    }
    console.error("Error getting user by email:", error);
    return null;
  }
}

// Create user
export async function createUser(userData: {
  email: string
  name: string
  password?: string
  picture?: string
  role?: "user" | "admin"
  provider: "email" | "google"
  googleId?: string
  isEmailVerified?: boolean
}): Promise<IUser> {
  try {
    const user = await createUserRecord({
      email: sanitizeEmail(userData.email),
      name: userData.name,
      password: userData.password,
      picture: userData.picture,
      role: userData.role,
      provider: userData.provider,
      googleId: userData.googleId,
      isEmailVerified:
        userData.isEmailVerified ?? userData.provider === "google",
    });

    return user;
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      throw new Error("Authentication service is temporarily unavailable");
    }
    console.error("Error creating user:", error);
    throw new Error("Failed to create user");
  }
}

// Update user last login
export async function updateUserLastLogin(userId: string): Promise<void> {
  try {
    await updateUserLastLoginAt(userId);
  } catch (error) {
    console.error("Error updating last login:", error);
  }
}

// Authenticate user with email/password
export async function authenticateUser(email: string, password: string): Promise<IUser | null> {
  try {
    const normalizedEmail = sanitizeEmail(email);
    const defaultAdminEmail = sanitizeEmail(
      process.env.DEFAULT_ADMIN_EMAIL || "admin@yugantar.studio"
    );

    // Seed the default admin once per process, not on every login attempt.
    if (!adminInitialized && defaultAdminEmail && normalizedEmail === defaultAdminEmail) {
      await initializeDefaultAdmin();
      // adminInitialized is set inside initializeDefaultAdmin on success
    }

    const user = await findUserByEmail(normalizedEmail);

    if (!user || user.provider !== "email" || !user.password) {
      // Constant-time delay to mitigate user enumeration via timing attack
      await bcrypt.compare(password, "$2a$12$invalidhashfortimingatk.padding000000000000000000000");
      return null;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    await updateUserLastLoginAt(user._id.toString());

    return user;
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return null;
    }
    console.error("Error authenticating user:", error);
    return null;
  }
}

// Get user from token
export async function getUserFromToken(token: string): Promise<IUser | null> {
  try {
    const payload = await verifyJWT(token);
    const user = await getUserById(payload.userId);
    return user;
  } catch (error) {
    return null;
  }
}

// Initialize default admin user
export async function initializeDefaultAdmin(): Promise<void> {
  try {
    const adminEmail = sanitizeEmail(
      process.env.DEFAULT_ADMIN_EMAIL || "admin@yugantar.studio"
    );
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "";

    if (!adminEmail || !adminPassword) {
      console.warn(
        "Skipping default admin initialization: DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD missing"
      );
      return;
    }

    if (adminPassword.length < 12) {
      console.warn(
        "Skipping default admin initialization: DEFAULT_ADMIN_PASSWORD must be at least 12 characters"
      );
      return;
    }

    const hashedPassword = await hashPassword(adminPassword);
    await ensureDefaultAdminUser({
      email: adminEmail,
      name: "Admin User",
      passwordHash: hashedPassword,
    });

    adminInitialized = true;
    console.log("✅ Default admin user checked/created");
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      console.warn("Skipping default admin init: Supabase not configured");
      return;
    }
    console.error("Error initializing admin:", error);
    throw error;
  }
}
