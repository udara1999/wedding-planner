export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wedding_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["member_role"]
          side: Database["public"]["Enums"]["wedding_side"] | null
          token: string
          wedding_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["member_role"]
          side?: Database["public"]["Enums"]["wedding_side"] | null
          token?: string
          wedding_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          side?: Database["public"]["Enums"]["wedding_side"] | null
          token?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_members: {
        Row: {
          accepted_at: string | null
          invited_at: string
          invited_by: string | null
          invited_email: string | null
          role: Database["public"]["Enums"]["member_role"]
          side: Database["public"]["Enums"]["wedding_side"] | null
          user_id: string
          wedding_id: string
        }
        Insert: {
          accepted_at?: string | null
          invited_at?: string
          invited_by?: string | null
          invited_email?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          side?: Database["public"]["Enums"]["wedding_side"] | null
          user_id: string
          wedding_id: string
        }
        Update: {
          accepted_at?: string | null
          invited_at?: string
          invited_by?: string | null
          invited_email?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          side?: Database["public"]["Enums"]["wedding_side"] | null
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          bride_name: string | null
          ceremony_area: string | null
          ceremony_time: string | null
          colour_palette: string | null
          contingency_pct: number
          coordinator_name: string | null
          coordinator_phone: string | null
          created_at: string
          created_by: string | null
          currency: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          expected_finish: string | null
          groom_name: string | null
          guest_buffer_pct: number
          id: string
          reception_area: string | null
          reception_time: string | null
          registration_time: string | null
          slug: string | null
          template_locale: string | null
          template_version: number | null
          theme: string | null
          timezone: string
          total_budget_minor: number
          tradition: string
          updated_at: string
          venue_contact_name: string | null
          venue_contact_phone: string | null
          venue_district: string | null
          venue_name: string | null
          venue_town: string | null
          wedding_date: string | null
        }
        Insert: {
          bride_name?: string | null
          ceremony_area?: string | null
          ceremony_time?: string | null
          colour_palette?: string | null
          contingency_pct?: number
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expected_finish?: string | null
          groom_name?: string | null
          guest_buffer_pct?: number
          id?: string
          reception_area?: string | null
          reception_time?: string | null
          registration_time?: string | null
          slug?: string | null
          template_locale?: string | null
          template_version?: number | null
          theme?: string | null
          timezone?: string
          total_budget_minor?: number
          tradition?: string
          updated_at?: string
          venue_contact_name?: string | null
          venue_contact_phone?: string | null
          venue_district?: string | null
          venue_name?: string | null
          venue_town?: string | null
          wedding_date?: string | null
        }
        Update: {
          bride_name?: string | null
          ceremony_area?: string | null
          ceremony_time?: string | null
          colour_palette?: string | null
          contingency_pct?: number
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expected_finish?: string | null
          groom_name?: string | null
          guest_buffer_pct?: number
          id?: string
          reception_area?: string | null
          reception_time?: string | null
          registration_time?: string | null
          slug?: string | null
          template_locale?: string | null
          template_version?: number | null
          theme?: string | null
          timezone?: string
          total_budget_minor?: number
          tradition?: string
          updated_at?: string
          venue_contact_name?: string | null
          venue_contact_phone?: string | null
          venue_district?: string | null
          venue_name?: string | null
          venue_town?: string | null
          wedding_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      create_wedding: {
        Args: {
          p_bride_name?: string
          p_currency?: string
          p_groom_name?: string
          p_timezone?: string
          p_tradition?: string
          p_wedding_date?: string
        }
        Returns: string
      }
      invite_member: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_side?: Database["public"]["Enums"]["wedding_side"]
          p_wedding_id: string
        }
        Returns: string
      }
      my_weddings: {
        Args: never
        Returns: {
          bride_name: string
          currency: string
          days_to_go: number
          groom_name: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          side: Database["public"]["Enums"]["wedding_side"]
          wedding_date: string
        }[]
      }
    }
    Enums: {
      member_role: "owner" | "partner" | "family" | "coordinator" | "viewer"
      wedding_side: "bride" | "groom" | "both"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      member_role: ["owner", "partner", "family", "coordinator", "viewer"],
      wedding_side: ["bride", "groom", "both"],
    },
  },
} as const
