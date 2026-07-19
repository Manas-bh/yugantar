import { getSupabaseAdminClient, ensureSupabaseConfigured } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function findById<TRecord, TDomain>(
  table: string,
  id: string,
  mapper: (record: TRecord) => TDomain
): Promise<TDomain | null> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle<TRecord>();

  if (error) {
    logger.error({ table, id, error }, "findById failed");
    throw error;
  }

  return data ? mapper(data) : null;
}

export async function findOneBy<TRecord, TDomain>(
  table: string,
  column: string,
  value: string,
  mapper: (record: TRecord) => TDomain
): Promise<TDomain | null> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(column, value)
    .maybeSingle<TRecord>();

  if (error) {
    logger.error({ table, column, value, error }, "findOneBy failed");
    throw error;
  }

  return data ? mapper(data) : null;
}

export type ListOptions = {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  offset?: number;
};

export async function findMany<TRecord, TDomain>(
  table: string,
  filters: Record<string, unknown>,
  mapper: (record: TRecord) => TDomain,
  options: ListOptions = {}
): Promise<TDomain[]> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseAdminClient();

  let query = supabase.from(table).select("*");

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }

  const orderBy = options.orderBy ?? "created_at";
  const ascending = options.ascending ?? false;
  query = query.order(orderBy, { ascending });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query.returns<TRecord[]>();

  if (error) {
    logger.error({ table, filters, error }, "findMany failed");
    throw error;
  }

  return (data ?? []).map(mapper);
}

export async function createRecord<TRecord, TDomain>(
  table: string,
  data: unknown,
  mapper: (record: TRecord) => TDomain
): Promise<TDomain> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseAdminClient();
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select("*")
    .single<TRecord>();

  if (error) {
    logger.error({ table, error }, "createRecord failed");
    throw error;
  }

  if (!result) {
    throw new Error(`createRecord returned no data for table ${table}`);
  }

  return mapper(result);
}

export async function updateRecord<TRecord, TDomain>(
  table: string,
  id: string,
  data: unknown,
  mapper: (record: TRecord) => TDomain
): Promise<TDomain> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseAdminClient();
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq("id", id)
    .select("*")
    .single<TRecord>();

  if (error) {
    logger.error({ table, id, error }, "updateRecord failed");
    throw error;
  }

  if (!result) {
    throw new Error(`updateRecord returned no data for table ${table} id ${id}`);
  }

  return mapper(result);
}

export async function deleteRecord(
  table: string,
  id: string
): Promise<void> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    logger.error({ table, id, error }, "deleteRecord failed");
    throw error;
  }
}
