import { getSupabaseAdminClient, SupabaseConfigError } from "@/lib/supabase/server";
import type { AuthEmailOtpRecord } from "@/lib/data/types";

const AUTH_EMAIL_OTPS_TABLE = "auth_email_otps";

type UpsertAuthEmailOtpInput = {
  email: string;
  name: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: string;
};

export async function upsertAuthEmailOtp(
  input: UpsertAuthEmailOtpInput
): Promise<AuthEmailOtpRecord> {
  if (!process.env.SUPABASE_URL) {
    throw new SupabaseConfigError();
  }

  const supabase = getSupabaseAdminClient();
  const payload = {
    email: input.email,
    name: input.name,
    password_hash: input.passwordHash,
    otp_hash: input.otpHash,
    expires_at: input.expiresAt,
    attempt_count: 0,
    last_sent_at: new Date().toISOString(),
  };

  const existing = await findAuthEmailOtpByEmail(input.email);

  if (existing) {
    const { data, error } = await supabase
      .from(AUTH_EMAIL_OTPS_TABLE)
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single<AuthEmailOtpRecord>();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from(AUTH_EMAIL_OTPS_TABLE)
    .insert(payload)
    .select("*")
    .single<AuthEmailOtpRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function findAuthEmailOtpByEmail(
  email: string
): Promise<AuthEmailOtpRecord | null> {
  if (!process.env.SUPABASE_URL) {
    throw new SupabaseConfigError();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(AUTH_EMAIL_OTPS_TABLE)
    .select("*")
    .eq("email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<AuthEmailOtpRecord[]>();

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

export async function incrementAuthEmailOtpAttemptById(
  id: string,
  nextAttemptCount: number
): Promise<void> {
  if (!process.env.SUPABASE_URL) {
    throw new SupabaseConfigError();
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from(AUTH_EMAIL_OTPS_TABLE)
    .update({ attempt_count: nextAttemptCount })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateAuthEmailOtpForResendById(
  id: string,
  input: { otpHash: string; expiresAt: string; nextResendCount: number }
): Promise<void> {
  if (!process.env.SUPABASE_URL) {
    throw new SupabaseConfigError();
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from(AUTH_EMAIL_OTPS_TABLE)
    .update({
      otp_hash: input.otpHash,
      expires_at: input.expiresAt,
      resend_count: input.nextResendCount,
      attempt_count: 0,
      last_sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteAuthEmailOtpById(id: string): Promise<void> {
  if (!process.env.SUPABASE_URL) {
    throw new SupabaseConfigError();
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from(AUTH_EMAIL_OTPS_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
