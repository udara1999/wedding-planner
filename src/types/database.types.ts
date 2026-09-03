/**
 * Supabase schema types.
 *
 * Regenerate after every migration:
 *   npm run types:gen
 *
 * This file is committed so a fresh clone type-checks without a database.
 * CI regenerates it and fails if it differs from what is checked in.
 */

export type MemberRole = 'owner' | 'partner' | 'family' | 'coordinator' | 'viewer';
export type WeddingSide = 'bride' | 'groom' | 'both';

export type WeddingRow = {
  id: string;
  slug: string | null;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string | null;
  currency: string;
  timezone: string;
  ceremony_time: string | null;
  registration_time: string | null;
  reception_time: string | null;
  expected_finish: string | null;
  venue_name: string | null;
  venue_town: string | null;
  venue_district: string | null;
  ceremony_area: string | null;
  reception_area: string | null;
  venue_contact_name: string | null;
  venue_contact_phone: string | null;
  theme: string | null;
  colour_palette: string | null;
  coordinator_name: string | null;
  coordinator_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  total_budget_minor: number;
  contingency_pct: number;
  guest_buffer_pct: number;
  template_locale: string | null;
  template_version: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WeddingMemberRow = {
  wedding_id: string;
  user_id: string;
  role: MemberRole;
  side: WeddingSide | null;
  invited_email: string | null;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
};

export type WeddingInvitationRow = {
  id: string;
  wedding_id: string;
  email: string;
  role: MemberRole;
  side: WeddingSide | null;
  token: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

/** Return shape of the my_weddings() RPC. */
export type MyWedding = {
  id: string;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string | null;
  currency: string;
  role: MemberRole;
  side: WeddingSide | null;
  days_to_go: number | null;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      weddings: {
        Row: WeddingRow;
        Insert: Partial<WeddingRow>;
        Update: Partial<WeddingRow>;
        Relationships: [];
      };
      wedding_members: {
        Row: WeddingMemberRow;
        Insert: Partial<WeddingMemberRow> & { wedding_id: string; user_id: string };
        Update: Partial<WeddingMemberRow>;
        Relationships: [];
      };
      wedding_invitations: {
        Row: WeddingInvitationRow;
        Insert: Partial<WeddingInvitationRow> & {
          wedding_id: string;
          email: string;
          role: MemberRole;
        };
        Update: Partial<WeddingInvitationRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_wedding: {
        Args: {
          p_bride_name?: string | null;
          p_groom_name?: string | null;
          p_wedding_date?: string | null;
          p_currency?: string;
          p_timezone?: string;
        };
        Returns: string;
      };
      invite_member: {
        Args: {
          p_wedding_id: string;
          p_email: string;
          p_role: MemberRole;
          p_side?: WeddingSide | null;
        };
        Returns: string;
      };
      accept_invitation: { Args: { p_token: string }; Returns: string };
      my_weddings: { Args: Record<string, never>; Returns: MyWedding[] };
    };
    Enums: {
      member_role: MemberRole;
      wedding_side: WeddingSide;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
