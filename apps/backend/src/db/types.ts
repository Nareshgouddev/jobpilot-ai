export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          skills: string[];
          experience_summary: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          skills?: string[];
          experience_summary: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string;
          skills?: string[];
          experience_summary?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          company: string;
          location: string;
          description: string;
          employment_type: string;
          source_url: string | null;
          contact_email: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          company: string;
          location: string;
          description: string;
          employment_type: string;
          source_url?: string | null;
          contact_email?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          company?: string;
          location?: string;
          description?: string;
          employment_type?: string;
          source_url?: string | null;
          contact_email?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
      };
      generations: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          tone: "formal" | "concise" | "friendly";
          prompt: string;
          output_text: string;
          provider: string;
          model: string;
          tokens_input: number | null;
          tokens_output: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          tone: "formal" | "concise" | "friendly";
          prompt: string;
          output_text: string;
          provider: string;
          model: string;
          tokens_input?: number | null;
          tokens_output?: number | null;
          created_at?: string;
        };
        Update: {
          output_text?: string;
          tokens_input?: number | null;
          tokens_output?: number | null;
        };
      };
    };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
export type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];
export type GenerationInsert = Database["public"]["Tables"]["generations"]["Insert"];
