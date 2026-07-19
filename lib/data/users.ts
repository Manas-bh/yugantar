import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  mapIUserCreateToUserInsert,
  mapUserRecordToIUser,
} from "@/lib/data/mappers";
import type { IUser } from "@/lib/domain/types";
import type { UserRecord, UserRole, AuthProvider } from "@/lib/data/types";
import { ensureSupabaseConfigured } from "@/lib/supabase/server";

const USERS_TABLE = "users";

export async function findUserById(id: string): Promise<IUser | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle<UserRecord>();

  if (error) {
    throw error;
  }

  return data ? mapUserRecordToIUser(data) : null;
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .eq("email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<UserRecord[]>();

  if (error) {
    throw error;
  }

  return data?.[0] ? mapUserRecordToIUser(data[0]) : null;
}

export async function createUserRecord(input: {
  email: string;
  name: string;
  password?: string;
  picture?: string;
  role?: UserRole;
  provider: AuthProvider;
  googleId?: string;
  isEmailVerified?: boolean;
}): Promise<IUser> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload = mapIUserCreateToUserInsert(input);

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert(payload)
    .select("*")
    .single<UserRecord>();

  if (error) {
    throw error;
  }

  return mapUserRecordToIUser(data);
}

export async function updateUserLastLoginAt(userId: string): Promise<void> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

export async function ensureDefaultAdminUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<void> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload = {
    email: input.email,
    name: input.name,
    password: input.passwordHash,
    role: "admin" as UserRole,
    provider: "email" as AuthProvider,
    is_email_verified: true,
    last_login_at: new Date().toISOString(),
  };

  const { data: existingUsers, error: lookupError } = await supabase
    .from(USERS_TABLE)
    .select("id")
    .eq("email", input.email)
    .limit(1)
    .returns<Array<{ id: string }>>();

  if (lookupError) {
    throw lookupError;
  }

  if (existingUsers && existingUsers.length > 0) {
    const { error: updateError } = await supabase
      .from(USERS_TABLE)
      .update(payload)
      .eq("email", input.email);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  await createUserRecord({
    email: input.email,
    name: input.name,
    password: input.passwordHash,
    role: "admin",
    provider: "email",
    isEmailVerified: true,
  });
}
