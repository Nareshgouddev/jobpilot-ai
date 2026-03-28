import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError, unwrapResult } from "../errors.js";
import type { ProfileInsert, ProfileRow } from "../types.js";

export class ProfileRepository {
  constructor(private readonly db: SupabaseClient) {}

  async upsert(input: ProfileInsert): Promise<ProfileRow> {
    const result = await this.db
      .from("profiles")
      .upsert(input, { onConflict: "email" })
      .select("*")
      .single();

    return unwrapResult(result, "profiles.upsert");
  }

  async findByEmail(email: string): Promise<ProfileRow | null> {
    const result = await this.db.from("profiles").select("*").eq("email", email).maybeSingle();

    throwIfError(result.error, "profiles.findByEmail");

    return result.data;
  }
}
