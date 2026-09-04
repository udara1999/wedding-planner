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
      budget_categories: {
        Row: {
          id: string
          key: string
          label: string
          sort_order: number
          wedding_id: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          sort_order?: number
          wedding_id: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          sort_order?: number
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_categories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          actual_minor: number
          applicability: Database["public"]["Enums"]["applicability"]
          budgeted_minor: number
          category_id: string | null
          code: string | null
          created_at: string
          forecast_minor: number | null
          id: string
          name: string
          negotiated_minor: number
          notes: string | null
          payer: string | null
          quoted_minor: number
          refundable_deposit_minor: number
          sort_order: number
          source_template_id: number | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          actual_minor?: number
          applicability?: Database["public"]["Enums"]["applicability"]
          budgeted_minor?: number
          category_id?: string | null
          code?: string | null
          created_at?: string
          forecast_minor?: number | null
          id?: string
          name: string
          negotiated_minor?: number
          notes?: string | null
          payer?: string | null
          quoted_minor?: number
          refundable_deposit_minor?: number
          sort_order?: number
          source_template_id?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          actual_minor?: number
          applicability?: Database["public"]["Enums"]["applicability"]
          budgeted_minor?: number
          category_id?: string | null
          code?: string | null
          created_at?: string
          forecast_minor?: number | null
          id?: string
          name?: string
          negotiated_minor?: number
          notes?: string | null
          payer?: string | null
          quoted_minor?: number
          refundable_deposit_minor?: number
          sort_order?: number
          source_template_id?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v_budget_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "budget_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          agreed_minor: number
          agreed_on: string | null
          code: string | null
          contributor_name: string
          contributor_user_id: string | null
          created_at: string
          id: string
          last_received_on: string | null
          notes: string | null
          purpose: string | null
          received_minor: number
          relationship: string | null
          still_to_come_minor: number | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          agreed_minor?: number
          agreed_on?: string | null
          code?: string | null
          contributor_name: string
          contributor_user_id?: string | null
          created_at?: string
          id?: string
          last_received_on?: string | null
          notes?: string | null
          purpose?: string | null
          received_minor?: number
          relationship?: string | null
          still_to_come_minor?: number | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          agreed_minor?: number
          agreed_on?: string | null
          code?: string | null
          contributor_name?: string
          contributor_user_id?: string | null
          created_at?: string
          id?: string
          last_received_on?: string | null
          notes?: string | null
          purpose?: string | null
          received_minor?: number
          relationship?: string | null
          still_to_come_minor?: number | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "contributions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_due_minor: number
          amount_paid_minor: number
          budget_line_id: string | null
          code: string | null
          created_at: string
          due_date: string | null
          id: string
          method: string | null
          notes: string | null
          paid_by: string | null
          paid_on: string | null
          raised_on: string
          receipt_location: string | null
          receipt_path: string | null
          reference: string | null
          refundable: boolean
          stage: Database["public"]["Enums"]["payment_stage"] | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          amount_due_minor?: number
          amount_paid_minor?: number
          budget_line_id?: string | null
          code?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_by?: string | null
          paid_on?: string | null
          raised_on?: string
          receipt_location?: string | null
          receipt_path?: string | null
          reference?: string | null
          refundable?: boolean
          stage?: Database["public"]["Enums"]["payment_stage"] | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          amount_due_minor?: number
          amount_paid_minor?: number
          budget_line_id?: string | null
          code?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_by?: string | null
          paid_on?: string | null
          raised_on?: string
          receipt_location?: string | null
          receipt_path?: string | null
          reference?: string | null
          refundable?: boolean
          stage?: Database["public"]["Enums"]["payment_stage"] | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
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
      vendor_answers: {
        Row: {
          answer: string | null
          notes: string | null
          option_id: string
          question_id: number
          updated_at: string
          wedding_id: string
        }
        Insert: {
          answer?: string | null
          notes?: string | null
          option_id: string
          question_id: number
          updated_at?: string
          wedding_id: string
        }
        Update: {
          answer?: string | null
          notes?: string | null
          option_id?: string
          question_id?: number
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "vendor_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_answers_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_decisions: {
        Row: {
          category_key: string
          chosen_option_id: string | null
          decided_on: string | null
          recorded_vendor_id: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          category_key: string
          chosen_option_id?: string | null
          decided_on?: string | null
          recorded_vendor_id?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          category_key?: string
          chosen_option_id?: string | null
          decided_on?: string | null
          recorded_vendor_id?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_decisions_chosen_option_id_fkey"
            columns: ["chosen_option_id"]
            isOneToOne: false
            referencedRelation: "vendor_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_decisions_recorded_vendor_id_fkey"
            columns: ["recorded_vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_decisions_recorded_vendor_id_fkey"
            columns: ["recorded_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_decisions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_decisions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_options: {
        Row: {
          category_key: string
          contact_name: string | null
          created_at: string
          deposit_minor: number
          id: string
          label: string
          met_or_visited: boolean
          negotiated_minor: number
          package: string | null
          phone: string | null
          quoted_minor: number
          rating: number | null
          sort_order: number
          updated_at: string
          vendor_name: string | null
          wedding_id: string
        }
        Insert: {
          category_key: string
          contact_name?: string | null
          created_at?: string
          deposit_minor?: number
          id?: string
          label: string
          met_or_visited?: boolean
          negotiated_minor?: number
          package?: string | null
          phone?: string | null
          quoted_minor?: number
          rating?: number | null
          sort_order?: number
          updated_at?: string
          vendor_name?: string | null
          wedding_id: string
        }
        Update: {
          category_key?: string
          contact_name?: string | null
          created_at?: string
          deposit_minor?: number
          id?: string
          label?: string
          met_or_visited?: boolean
          negotiated_minor?: number
          package?: string | null
          phone?: string | null
          quoted_minor?: number
          rating?: number | null
          sort_order?: number
          updated_at?: string
          vendor_name?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_options_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_options_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          arrival_time: string | null
          category: string
          code: string | null
          contact_name: string | null
          contract_location: string | null
          contract_path: string | null
          contract_signed: boolean
          created_at: string
          deposit_paid_minor: number
          email: string | null
          final_confirmation_date: string | null
          finish_time: string | null
          id: string
          key_deliverables: string | null
          name: string
          negotiated_minor: number
          notes: string | null
          overtime_rate: string | null
          package: string | null
          phone: string | null
          quoted_minor: number
          rating: number | null
          setup_done_by: string | null
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
          wedding_id: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          arrival_time?: string | null
          category: string
          code?: string | null
          contact_name?: string | null
          contract_location?: string | null
          contract_path?: string | null
          contract_signed?: boolean
          created_at?: string
          deposit_paid_minor?: number
          email?: string | null
          final_confirmation_date?: string | null
          finish_time?: string | null
          id?: string
          key_deliverables?: string | null
          name: string
          negotiated_minor?: number
          notes?: string | null
          overtime_rate?: string | null
          package?: string | null
          phone?: string | null
          quoted_minor?: number
          rating?: number | null
          setup_done_by?: string | null
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          wedding_id: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          arrival_time?: string | null
          category?: string
          code?: string | null
          contact_name?: string | null
          contract_location?: string | null
          contract_path?: string | null
          contract_signed?: boolean
          created_at?: string
          deposit_paid_minor?: number
          email?: string | null
          final_confirmation_date?: string | null
          finish_time?: string | null
          id?: string
          key_deliverables?: string | null
          name?: string
          negotiated_minor?: number
          notes?: string | null
          overtime_rate?: string | null
          package?: string | null
          phone?: string | null
          quoted_minor?: number
          rating?: number | null
          setup_done_by?: string | null
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          wedding_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_countdown_checks: {
        Row: {
          check_text: string
          created_at: string
          done: boolean
          due_date: string | null
          due_date_overridden: boolean
          id: number
          notes: string | null
          offset_days: number | null
          owner: string | null
          seq: number | null
          source_template_id: number | null
          updated_at: string
          wedding_id: string
          window_label: string | null
        }
        Insert: {
          check_text: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          due_date_overridden?: boolean
          id?: never
          notes?: string | null
          offset_days?: number | null
          owner?: string | null
          seq?: number | null
          source_template_id?: number | null
          updated_at?: string
          wedding_id: string
          window_label?: string | null
        }
        Update: {
          check_text?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          due_date_overridden?: boolean
          id?: never
          notes?: string | null
          offset_days?: number | null
          owner?: string | null
          seq?: number | null
          source_template_id?: number | null
          updated_at?: string
          wedding_id?: string
          window_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wedding_countdown_checks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_countdown_checks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_lookups: {
        Row: {
          id: number
          kind: string
          sort_order: number
          value: string
          wedding_id: string
        }
        Insert: {
          id?: never
          kind: string
          sort_order?: number
          value: string
          wedding_id: string
        }
        Update: {
          id?: never
          kind?: string
          sort_order?: number
          value?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_lookups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_lookups_wedding_id_fkey"
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
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          due_date_overridden: boolean
          id: number
          notes: string | null
          offset_days: number | null
          owner: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          seq: number | null
          source_template_id: number | null
          status: Database["public"]["Enums"]["task_status"]
          task: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          due_date_overridden?: boolean
          id?: never
          notes?: string | null
          offset_days?: number | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          seq?: number | null
          source_template_id?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          task: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          due_date_overridden?: boolean
          id?: never
          notes?: string | null
          offset_days?: number | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          seq?: number | null
          source_template_id?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          task?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_tasks_wedding_id_fkey"
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
      v_budget_by_category: {
        Row: {
          budgeted_minor: number | null
          category_id: string | null
          category_key: string | null
          category_label: string | null
          forecast_minor: number | null
          line_count: number | null
          not_applicable_count: number | null
          outstanding_minor: number | null
          overpaid_count: number | null
          overpaid_minor: number | null
          paid_minor: number | null
          sort_order: number | null
          variance_minor: number | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_lines: {
        Row: {
          actual_minor: number | null
          applicability: Database["public"]["Enums"]["applicability"] | null
          budgeted_minor: number | null
          category_id: string | null
          code: string | null
          created_at: string | null
          forecast_minor: number | null
          id: string | null
          name: string | null
          negotiated_minor: number | null
          notes: string | null
          outstanding_minor: number | null
          overpaid_minor: number | null
          paid_minor: number | null
          payer: string | null
          quoted_minor: number | null
          refundable_deposit_minor: number | null
          sort_order: number | null
          source_template_id: number | null
          status: Database["public"]["Enums"]["task_status"] | null
          updated_at: string | null
          variance_minor: number | null
          vendor_id: string | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v_budget_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "budget_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_payments: {
        Row: {
          amount_due_minor: number | null
          amount_paid_minor: number | null
          balance_minor: number | null
          budget_line_id: string | null
          code: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          method: string | null
          notes: string | null
          paid_by: string | null
          paid_on: string | null
          raised_on: string | null
          receipt_location: string | null
          receipt_path: string | null
          reference: string | null
          refundable: boolean | null
          stage: Database["public"]["Enums"]["payment_stage"] | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          vendor_id: string | null
          wedding_id: string | null
        }
        Insert: {
          amount_due_minor?: number | null
          amount_paid_minor?: number | null
          balance_minor?: never
          budget_line_id?: string | null
          code?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          method?: string | null
          notes?: string | null
          paid_by?: string | null
          paid_on?: string | null
          raised_on?: string | null
          receipt_location?: string | null
          receipt_path?: string | null
          reference?: string | null
          refundable?: boolean | null
          stage?: Database["public"]["Enums"]["payment_stage"] | null
          status?: never
          updated_at?: string | null
          vendor_id?: string | null
          wedding_id?: string | null
        }
        Update: {
          amount_due_minor?: number | null
          amount_paid_minor?: number | null
          balance_minor?: never
          budget_line_id?: string | null
          code?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          method?: string | null
          notes?: string | null
          paid_by?: string | null
          paid_on?: string | null
          raised_on?: string | null
          receipt_location?: string | null
          receipt_path?: string | null
          reference?: string | null
          refundable?: boolean | null
          stage?: Database["public"]["Enums"]["payment_stage"] | null
          status?: never
          updated_at?: string | null
          vendor_id?: string | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vendor_categories: {
        Row: {
          category_key: string | null
          category_label: string | null
          locale: string | null
          question_count: number | null
        }
        Relationships: []
      }
      v_vendor_decisions: {
        Row: {
          agreed_price_minor: number | null
          category_key: string | null
          chosen_label: string | null
          chosen_option_id: string | null
          chosen_vendor_name: string | null
          decided_on: string | null
          options_entered: number | null
          recorded_in_vendors: boolean | null
          recorded_vendor_id: string | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_decisions_chosen_option_id_fkey"
            columns: ["chosen_option_id"]
            isOneToOne: false
            referencedRelation: "vendor_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_decisions_recorded_vendor_id_fkey"
            columns: ["recorded_vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_decisions_recorded_vendor_id_fkey"
            columns: ["recorded_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_options_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_options_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vendor_questions: {
        Row: {
          category_key: string | null
          category_label: string | null
          group: Database["public"]["Enums"]["vendor_question_group"] | null
          id: number | null
          locale: string | null
          question: string | null
          seq: number | null
          why_it_matters: string | null
        }
        Insert: {
          category_key?: string | null
          category_label?: string | null
          group?: Database["public"]["Enums"]["vendor_question_group"] | null
          id?: number | null
          locale?: string | null
          question?: string | null
          seq?: number | null
          why_it_matters?: string | null
        }
        Update: {
          category_key?: string | null
          category_label?: string | null
          group?: Database["public"]["Enums"]["vendor_question_group"] | null
          id?: number | null
          locale?: string | null
          question?: string | null
          seq?: number | null
          why_it_matters?: string | null
        }
        Relationships: []
      }
      v_vendors_ops: {
        Row: {
          arrival_time: string | null
          category: string | null
          contact_name: string | null
          final_confirmation_date: string | null
          finish_time: string | null
          id: string | null
          key_deliverables: string | null
          name: string | null
          phone: string | null
          setup_done_by: string | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          wedding_id: string | null
          whatsapp: string | null
        }
        Insert: {
          arrival_time?: string | null
          category?: string | null
          contact_name?: string | null
          final_confirmation_date?: string | null
          finish_time?: string | null
          id?: string | null
          key_deliverables?: string | null
          name?: string | null
          phone?: string | null
          setup_done_by?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          wedding_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          arrival_time?: string | null
          category?: string | null
          contact_name?: string | null
          final_confirmation_date?: string | null
          finish_time?: string | null
          id?: string | null
          key_deliverables?: string | null
          name?: string | null
          phone?: string | null
          setup_done_by?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          wedding_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wedding_financials: {
        Row: {
          actual_minor: number | null
          budget_utilisation: number | null
          budgeted_minor: number | null
          contingency_pct: number | null
          contributions_agreed_minor: number | null
          contributions_received_minor: number | null
          currency: string | null
          expected_gifts_minor: number | null
          forecast_minor: number | null
          gifts_received_minor: number | null
          guest_buffer_pct: number | null
          negotiated_minor: number | null
          net_cost_after_gifts_minor: number | null
          outstanding_minor: number | null
          overpaid_minor: number | null
          paid_minor: number | null
          quoted_minor: number | null
          refundable_deposits_minor: number | null
          remaining_against_budget_minor: number | null
          shortfall_minor: number | null
          total_budget_minor: number | null
          wedding_id: string | null
        }
        Relationships: []
      }
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
      seed_wedding: {
        Args: { p_locale?: string; p_wedding_id: string }
        Returns: number
      }
    }
    Enums: {
      applicability: "required" | "optional" | "not_applicable"
      member_role: "owner" | "partner" | "family" | "coordinator" | "viewer"
      payment_stage:
        | "booking_deposit"
        | "advance"
        | "progress_payment"
        | "final_payment"
        | "extra_overtime"
        | "refundable_deposit"
        | "refund_received"
      payment_status:
        | "draft"
        | "paid"
        | "overdue"
        | "due"
        | "due_soon"
        | "not_due"
      task_priority: "critical" | "high" | "medium" | "low"
      task_status:
        | "not_started"
        | "in_progress"
        | "waiting"
        | "completed"
        | "cancelled"
      vendor_question_group: "money" | "included" | "logistics" | "risk"
      vendor_status:
        | "researching"
        | "shortlisted"
        | "negotiating"
        | "tentatively_booked"
        | "confirmed"
        | "completed"
        | "cancelled"
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
      applicability: ["required", "optional", "not_applicable"],
      member_role: ["owner", "partner", "family", "coordinator", "viewer"],
      payment_stage: [
        "booking_deposit",
        "advance",
        "progress_payment",
        "final_payment",
        "extra_overtime",
        "refundable_deposit",
        "refund_received",
      ],
      payment_status: [
        "draft",
        "paid",
        "overdue",
        "due",
        "due_soon",
        "not_due",
      ],
      task_priority: ["critical", "high", "medium", "low"],
      task_status: [
        "not_started",
        "in_progress",
        "waiting",
        "completed",
        "cancelled",
      ],
      vendor_question_group: ["money", "included", "logistics", "risk"],
      vendor_status: [
        "researching",
        "shortlisted",
        "negotiating",
        "tentatively_booked",
        "confirmed",
        "completed",
        "cancelled",
      ],
      wedding_side: ["bride", "groom", "both"],
    },
  },
} as const
