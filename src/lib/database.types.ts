// supabase gen types typescript と同じ形で手書きしている。
// マイグレーションを変えたらここも合わせること。

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  area: string;
  level_min: string | null;
  level_max: string | null;
  capacity: number;
  fee: number;
  description: string | null;
  requires_approval: boolean;
  status: string;
  created_at: string;
};

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
      events: {
        Row: EventRow;
        Insert: {
          id?: string;
          host_id?: string;
          title: string;
          starts_at: string;
          ends_at: string;
          venue: string;
          area: string;
          level_min?: string | null;
          level_max?: string | null;
          capacity: number;
          fee?: number;
          description?: string | null;
          requires_approval?: boolean;
          status?: string;
          created_at?: string;
        };
        Update: Partial<EventRow>;
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      participations: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          message: string | null;
          waitlisted_at: string | null;
          has_update: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "participations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id?: string;
          body: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "messages_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      event_summaries: {
        Row: EventRow & { approved_count: number; waitlist_count: number };
        Relationships: [];
      };
    };
    Functions: {
      event_members: {
        Args: { p_event_id: string };
        Returns: { user_id: string; display_name: string; level: string; is_host: boolean }[];
      };
      latest_message_times: {
        Args: { p_event_ids: string[] };
        Returns: { event_id: string; last_message_at: string }[];
      };
      is_event_member: { Args: { p_event_id: string }; Returns: boolean };
      apply_to_event: {
        Args: { p_event_id: string; p_message?: string | null };
        Returns: string;
      };
      decide_participation: {
        Args: { p_participation_id: string; p_decision: string };
        Returns: string;
      };
      cancel_participation: { Args: { p_event_id: string }; Returns: undefined };
      mark_participation_updates_seen: { Args: never; Returns: undefined };
      my_waitlist_position: { Args: { p_event_id: string }; Returns: number | null };
      is_event_host: { Args: { p_event_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
