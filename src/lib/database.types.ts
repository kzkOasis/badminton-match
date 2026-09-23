// supabase gen types typescript と同じ形で手書きしている。
// マイグレーションを変えたらここも合わせること。

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          level: string;
          area: string | null;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          level: string;
          area?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          level?: string;
          area?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
