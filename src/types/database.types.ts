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
      accommodations: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          check_in: string | null
          check_out: string | null
          confirmation_ref: string | null
          cost_minor: number
          created_at: string
          guest_id: string | null
          hotel: string | null
          id: string
          name: string
          nights: number | null
          notes: string | null
          owner: string | null
          room_type: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          check_in?: string | null
          check_out?: string | null
          confirmation_ref?: string | null
          cost_minor?: number
          created_at?: string
          guest_id?: string | null
          hotel?: string | null
          id?: string
          name: string
          nights?: number | null
          notes?: string | null
          owner?: string | null
          room_type?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          check_in?: string | null
          check_out?: string | null
          confirmation_ref?: string | null
          cost_minor?: number
          created_at?: string
          guest_id?: string | null
          hotel?: string | null
          id?: string
          name?: string
          nights?: number | null
          notes?: string | null
          owner?: string | null
          room_type?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "accommodations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "accommodations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "accommodations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "accommodations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      attire_items: {
        Row: {
          alterations: string | null
          applicability: Database["public"]["Enums"]["applicability"]
          collect_by: string | null
          cost_minor: number
          created_at: string
          final_fitting_on: string | null
          fitting_1_on: string | null
          fitting_2_on: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          paid_minor: number
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          subject: string | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          alterations?: string | null
          applicability?: Database["public"]["Enums"]["applicability"]
          collect_by?: string | null
          cost_minor?: number
          created_at?: string
          final_fitting_on?: string | null
          fitting_1_on?: string | null
          fitting_2_on?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          paid_minor?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          alterations?: string | null
          applicability?: Database["public"]["Enums"]["applicability"]
          collect_by?: string | null
          cost_minor?: number
          created_at?: string
          final_fitting_on?: string | null
          fitting_1_on?: string | null
          fitting_2_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          paid_minor?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attire_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "attire_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attire_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attire_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "attire_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "attire_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "attire_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      beauty_appointments: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          at_time: string | null
          cost_minor: number
          created_at: string
          duration_minutes: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          on_date: string | null
          owner: string | null
          paid_minor: number
          provider: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          subject: string | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          at_time?: string | null
          cost_minor?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          on_date?: string | null
          owner?: string | null
          paid_minor?: number
          provider?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          at_time?: string | null
          cost_minor?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          on_date?: string | null
          owner?: string | null
          paid_minor?: number
          provider?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beauty_appointments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "beauty_appointments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beauty_appointments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beauty_appointments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "beauty_appointments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "beauty_appointments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "beauty_appointments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_categories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
      cake_items: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          cost_minor: number
          created_at: string
          delivery_at: string | null
          flavour: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          servings: number | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          tiers: number | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          cost_minor?: number
          created_at?: string
          delivery_at?: string | null
          flavour?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          servings?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          tiers?: number | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          cost_minor?: number
          created_at?: string
          delivery_at?: string | null
          flavour?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          servings?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          tiers?: number | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cake_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "cake_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cake_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cake_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "cake_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "cake_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "cake_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      ceremony_steps: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          at_time: string | null
          cost_minor: number
          created_at: string
          duration_minutes: number | null
          id: string
          items_needed: string | null
          leads: string | null
          location: string | null
          name: string
          notes: string | null
          owner: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          at_time?: string | null
          cost_minor?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          items_needed?: string | null
          leads?: string | null
          location?: string | null
          name: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          at_time?: string | null
          cost_minor?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          items_needed?: string | null
          leads?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceremony_steps_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "ceremony_steps_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceremony_steps_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      closure_tasks: {
        Row: {
          amount_minor: number
          applicability: Database["public"]["Enums"]["applicability"]
          cost_minor: number
          created_at: string
          done_on: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          target_date: string | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
          window_label: string | null
        }
        Insert: {
          amount_minor?: number
          applicability?: Database["public"]["Enums"]["applicability"]
          cost_minor?: number
          created_at?: string
          done_on?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          target_date?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
          window_label?: string | null
        }
        Update: {
          amount_minor?: number
          applicability?: Database["public"]["Enums"]["applicability"]
          cost_minor?: number
          created_at?: string
          done_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          target_date?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
          window_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closure_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "closure_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closure_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closure_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "closure_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "closure_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "closure_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          backup_phone: string | null
          cost_minor: number
          created_at: string
          group_label: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          phone: string | null
          role: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          wedding_id: string
          whatsapp: string | null
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          backup_phone?: string | null
          cost_minor?: number
          created_at?: string
          group_label?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          phone?: string | null
          role?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
          whatsapp?: string | null
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          backup_phone?: string | null
          cost_minor?: number
          created_at?: string
          group_label?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          phone?: string | null
          role?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "contacts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "contacts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "contacts_wedding_id_fkey"
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "contributions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
      decor_items: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          area: string | null
          checked_on_day: boolean
          cost_minor: number
          created_at: string
          id: string
          name: string
          notes: string | null
          owner: string | null
          qty: number | null
          remove_after: string | null
          setup_by: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          area?: string | null
          checked_on_day?: boolean
          cost_minor?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          qty?: number | null
          remove_after?: string | null
          setup_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          area?: string | null
          checked_on_day?: boolean
          cost_minor?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          qty?: number | null
          remove_after?: string | null
          setup_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decor_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "decor_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decor_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decor_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "decor_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "decor_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "decor_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_groups: {
        Row: {
          id: string
          name: string
          sort_order: number
          wedding_id: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          wedding_id: string
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          adults_attending: number
          adults_invited: number
          category: string | null
          children_attending: number
          children_invited: number
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          dietary: string | null
          district: string | null
          email: string | null
          expected_gift_minor: number
          gift_description: string | null
          gift_received_minor: number
          group_id: string | null
          heads_to_seat: number | null
          household_name: string
          id: string
          invitation_sent: boolean
          invitation_sent_on: string | null
          invitation_type: string | null
          needs_room: boolean
          needs_transport: boolean
          notes: string | null
          phone: string | null
          relationship: string | null
          rsvp_on: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          rsvp_token: string
          side: Database["public"]["Enums"]["wedding_side"] | null
          table_id: string | null
          thank_you_sent: boolean
          total_attending: number | null
          total_invited: number | null
          transport_type: string | null
          updated_at: string
          vip: boolean
          wedding_id: string
          whatsapp: string | null
        }
        Insert: {
          adults_attending?: number
          adults_invited?: number
          category?: string | null
          children_attending?: number
          children_invited?: number
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          dietary?: string | null
          district?: string | null
          email?: string | null
          expected_gift_minor?: number
          gift_description?: string | null
          gift_received_minor?: number
          group_id?: string | null
          heads_to_seat?: number | null
          household_name: string
          id?: string
          invitation_sent?: boolean
          invitation_sent_on?: string | null
          invitation_type?: string | null
          needs_room?: boolean
          needs_transport?: boolean
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          rsvp_on?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          rsvp_token?: string
          side?: Database["public"]["Enums"]["wedding_side"] | null
          table_id?: string | null
          thank_you_sent?: boolean
          total_attending?: number | null
          total_invited?: number | null
          transport_type?: string | null
          updated_at?: string
          vip?: boolean
          wedding_id: string
          whatsapp?: string | null
        }
        Update: {
          adults_attending?: number
          adults_invited?: number
          category?: string | null
          children_attending?: number
          children_invited?: number
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          dietary?: string | null
          district?: string | null
          email?: string | null
          expected_gift_minor?: number
          gift_description?: string | null
          gift_received_minor?: number
          group_id?: string | null
          heads_to_seat?: number | null
          household_name?: string
          id?: string
          invitation_sent?: boolean
          invitation_sent_on?: string | null
          invitation_type?: string | null
          needs_room?: boolean
          needs_transport?: boolean
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          rsvp_on?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          rsvp_token?: string
          side?: Database["public"]["Enums"]["wedding_side"] | null
          table_id?: string | null
          thank_you_sent?: boolean
          total_attending?: number | null
          total_invited?: number | null
          transport_type?: string | null
          updated_at?: string
          vip?: boolean
          wedding_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "seating_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "v_seating_tables"
            referencedColumns: ["table_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      jewellery_items: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          collect_on: string | null
          cost_minor: number
          created_at: string
          custodian: string | null
          deposit_minor: number
          id: string
          insured: boolean
          name: string
          notes: string | null
          owner: string | null
          ownership: Database["public"]["Enums"]["jewellery_ownership"]
          return_by: string | null
          returned_on: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          subject: string | null
          updated_at: string
          value_minor: number
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          collect_on?: string | null
          cost_minor?: number
          created_at?: string
          custodian?: string | null
          deposit_minor?: number
          id?: string
          insured?: boolean
          name: string
          notes?: string | null
          owner?: string | null
          ownership?: Database["public"]["Enums"]["jewellery_ownership"]
          return_by?: string | null
          returned_on?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject?: string | null
          updated_at?: string
          value_minor?: number
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          collect_on?: string | null
          cost_minor?: number
          created_at?: string
          custodian?: string | null
          deposit_minor?: number
          id?: string
          insured?: boolean
          name?: string
          notes?: string | null
          owner?: string | null
          ownership?: Database["public"]["Enums"]["jewellery_ownership"]
          return_by?: string | null
          returned_on?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject?: string | null
          updated_at?: string
          value_minor?: number
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jewellery_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "jewellery_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jewellery_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_requirements: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          authority: string | null
          cost_minor: number
          created_at: string
          document_held: boolean
          due_date: string | null
          id: string
          jurisdiction: string | null
          name: string
          notes: string | null
          owner: string | null
          reference_url: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          verified_on: string | null
          verify_status: Database["public"]["Enums"]["verify_status"]
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          authority?: string | null
          cost_minor?: number
          created_at?: string
          document_held?: boolean
          due_date?: string | null
          id?: string
          jurisdiction?: string | null
          name: string
          notes?: string | null
          owner?: string | null
          reference_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          verified_on?: string | null
          verify_status?: Database["public"]["Enums"]["verify_status"]
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          authority?: string | null
          cost_minor?: number
          created_at?: string
          document_held?: boolean
          due_date?: string | null
          id?: string
          jurisdiction?: string | null
          name?: string
          notes?: string | null
          owner?: string | null
          reference_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          verified_on?: string | null
          verify_status?: Database["public"]["Enums"]["verify_status"]
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_requirements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "legal_requirements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_requirements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_requirements_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "legal_requirements_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "legal_requirements_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "legal_requirements_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          category: string | null
          cost_minor: number
          created_at: string
          id: string
          name: string
          notes: string | null
          owner: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          verdict: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          category?: string | null
          cost_minor?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          verdict?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          category?: string | null
          cost_minor?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          verdict?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "lessons_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "lessons_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "lessons_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "lessons_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          cost_minor: number
          course: string | null
          created_at: string
          dietary: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          per_head: boolean
          qty: number | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          cost_minor?: number
          course?: string | null
          created_at?: string
          dietary?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          per_head?: boolean
          qty?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          cost_minor?: number
          course?: string | null
          created_at?: string
          dietary?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          per_head?: boolean
          qty?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "menu_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "menu_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "menu_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      music_cues: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          artist: string | null
          cost_minor: number
          created_at: string
          cue_at: string | null
          id: string
          moment: string | null
          name: string
          notes: string | null
          owner: string | null
          sort_order: number
          source: string | null
          status: Database["public"]["Enums"]["task_status"]
          track: string | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          artist?: string | null
          cost_minor?: number
          created_at?: string
          cue_at?: string | null
          id?: string
          moment?: string | null
          name: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          source?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          track?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          artist?: string | null
          cost_minor?: number
          created_at?: string
          cue_at?: string | null
          id?: string
          moment?: string | null
          name?: string
          notes?: string | null
          owner?: string | null
          sort_order?: number
          source?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          track?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_cues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "music_cues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_cues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_cues_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "music_cues_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "music_cues_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "music_cues_wedding_id_fkey"
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
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
      procurement_items: {
        Row: {
          actual_minor: number
          applicability: Database["public"]["Enums"]["applicability"]
          bought: boolean
          bought_on: string | null
          category: string | null
          container: string | null
          cost_minor: number
          created_at: string
          id: string
          loaded: boolean
          name: string
          needed_on_day: boolean
          notes: string | null
          owner: string | null
          packed: boolean
          qty: number | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          stored_where: string | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
          where_to_buy: string | null
        }
        Insert: {
          actual_minor?: number
          applicability?: Database["public"]["Enums"]["applicability"]
          bought?: boolean
          bought_on?: string | null
          category?: string | null
          container?: string | null
          cost_minor?: number
          created_at?: string
          id?: string
          loaded?: boolean
          name: string
          needed_on_day?: boolean
          notes?: string | null
          owner?: string | null
          packed?: boolean
          qty?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          stored_where?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
          where_to_buy?: string | null
        }
        Update: {
          actual_minor?: number
          applicability?: Database["public"]["Enums"]["applicability"]
          bought?: boolean
          bought_on?: string | null
          category?: string | null
          container?: string | null
          cost_minor?: number
          created_at?: string
          id?: string
          loaded?: boolean
          name?: string
          needed_on_day?: boolean
          notes?: string | null
          owner?: string | null
          packed?: boolean
          qty?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          stored_where?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
          where_to_buy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "procurement_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "procurement_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "procurement_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "procurement_items_wedding_id_fkey"
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
      responsibilities: {
        Row: {
          accountable: string | null
          activity: string
          area: string | null
          consulted: string | null
          created_at: string
          deadline: string | null
          id: string
          informed: string | null
          notes: string | null
          person_name: string | null
          phone: string | null
          responsible: string | null
          seq: number | null
          sort_order: number
          source_template_id: number | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          wedding_id: string
        }
        Insert: {
          accountable?: string | null
          activity: string
          area?: string | null
          consulted?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          informed?: string | null
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          responsible?: string | null
          seq?: number | null
          sort_order?: number
          source_template_id?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          wedding_id: string
        }
        Update: {
          accountable?: string | null
          activity?: string
          area?: string | null
          consulted?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          informed?: string | null
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          responsible?: string | null
          seq?: number | null
          sort_order?: number
          source_template_id?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibilities_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "responsibilities_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "responsibilities_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "responsibilities_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_rate_events: {
        Row: {
          bucket: string
          id: number
          occurred_at: string
        }
        Insert: {
          bucket: string
          id?: never
          occurred_at?: string
        }
        Update: {
          bucket?: string
          id?: never
          occurred_at?: string
        }
        Relationships: []
      }
      rsvp_submissions: {
        Row: {
          adults_attending: number
          children_attending: number
          client_hint: string | null
          dietary: string | null
          guest_id: string
          id: string
          message: string | null
          needs_room: boolean
          needs_transport: boolean
          submitted_at: string
          wedding_id: string
        }
        Insert: {
          adults_attending: number
          children_attending: number
          client_hint?: string | null
          dietary?: string | null
          guest_id: string
          id?: string
          message?: string | null
          needs_room?: boolean
          needs_transport?: boolean
          submitted_at?: string
          wedding_id: string
        }
        Update: {
          adults_attending?: number
          children_attending?: number
          client_hint?: string | null
          dietary?: string | null
          guest_id?: string
          id?: string
          message?: string | null
          needs_room?: boolean
          needs_transport?: boolean
          submitted_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_submissions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_submissions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "rsvp_submissions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "rsvp_submissions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "rsvp_submissions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          shape: string | null
          sort_order: number
          updated_at: string
          wedding_id: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          shape?: string | null
          sort_order?: number
          updated_at?: string
          wedding_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          shape?: string | null
          sort_order?: number
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_list_items: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          captured: boolean
          cost_minor: number
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          owner: string | null
          people_needed: string | null
          planned_at: string | null
          priority: string | null
          section: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          captured?: boolean
          cost_minor?: number
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          owner?: string | null
          people_needed?: string | null
          planned_at?: string | null
          priority?: string | null
          section?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          captured?: boolean
          cost_minor?: number
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          owner?: string | null
          people_needed?: string | null
          planned_at?: string | null
          priority?: string | null
          section?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_list_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "shot_list_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_list_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_list_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "shot_list_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "shot_list_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "shot_list_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_legs: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"]
          arrive_by: string | null
          cost_minor: number
          created_at: string
          destination: string | null
          driver: string | null
          driver_phone: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          passengers: string | null
          pickup_at: string | null
          pickup_from: string | null
          return_trip: boolean
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          vehicle: string | null
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"]
          arrive_by?: string | null
          cost_minor?: number
          created_at?: string
          destination?: string | null
          driver?: string | null
          driver_phone?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          passengers?: string | null
          pickup_at?: string | null
          pickup_from?: string | null
          return_trip?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vehicle?: string | null
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"]
          arrive_by?: string | null
          cost_minor?: number
          created_at?: string
          destination?: string | null
          driver?: string | null
          driver_phone?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          passengers?: string | null
          pickup_at?: string | null
          pickup_from?: string | null
          return_trip?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          vehicle?: string | null
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_legs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "transport_legs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_legs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_legs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "transport_legs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "transport_legs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "transport_legs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_answers_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
      vendor_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          path: string
          size_bytes: number | null
          uploaded_by: string | null
          vendor_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          path: string
          size_bytes?: number | null
          uploaded_by?: string | null
          vendor_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          path?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          vendor_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_attachments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_attachments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_attachments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_attachments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_attachments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_attachments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_attachments_wedding_id_fkey"
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
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_decisions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_options_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_countdown_checks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_lookups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
      wedding_party: {
        Row: {
          accessories: string | null
          applicability: Database["public"]["Enums"]["applicability"]
          arrive_by: string | null
          cost_minor: number
          created_at: string
          duties: string | null
          gift_given: boolean
          id: string
          name: string
          notes: string | null
          outfit: string | null
          outfit_ready: boolean
          owner: string | null
          phone: string | null
          role: string | null
          room_needed: boolean
          side: Database["public"]["Enums"]["wedding_side"] | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          transport: string | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
          whatsapp: string | null
        }
        Insert: {
          accessories?: string | null
          applicability?: Database["public"]["Enums"]["applicability"]
          arrive_by?: string | null
          cost_minor?: number
          created_at?: string
          duties?: string | null
          gift_given?: boolean
          id?: string
          name: string
          notes?: string | null
          outfit?: string | null
          outfit_ready?: boolean
          owner?: string | null
          phone?: string | null
          role?: string | null
          room_needed?: boolean
          side?: Database["public"]["Enums"]["wedding_side"] | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          transport?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
          whatsapp?: string | null
        }
        Update: {
          accessories?: string | null
          applicability?: Database["public"]["Enums"]["applicability"]
          arrive_by?: string | null
          cost_minor?: number
          created_at?: string
          duties?: string | null
          gift_given?: boolean
          id?: string
          name?: string
          notes?: string | null
          outfit?: string | null
          outfit_ready?: boolean
          owner?: string | null
          phone?: string | null
          role?: string | null
          room_needed?: boolean
          side?: Database["public"]["Enums"]["wedding_side"] | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          transport?: string | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wedding_party_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "wedding_party_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendors_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_party_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_party_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_party_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_party_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_party_wedding_id_fkey"
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
          crew_count: number
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
          crew_count?: number
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
          crew_count?: number
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "budget_lines_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
      v_catering_headcount: {
        Row: {
          awaiting_reply: number | null
          cater_for: number | null
          cater_for_if_all_accept: number | null
          confirmed: number | null
          crew_count: number | null
          declined_heads: number | null
          guest_buffer_pct: number | null
          invited: number | null
          wedding_id: string | null
        }
        Relationships: []
      }
      v_ceremony_length: {
        Row: {
          active_steps: number | null
          minutes: number | null
          starts_at: string | null
          step_count: number | null
          steps_without_duration: number | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "ceremony_steps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gift_summary: {
        Row: {
          expected_minor: number | null
          households_expected: number | null
          households_received: number | null
          received_minor: number | null
          still_expected_minor: number | null
          thank_yous_pending: number | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_jewellery_custody: {
        Row: {
          applicability: Database["public"]["Enums"]["applicability"] | null
          awaiting_return: boolean | null
          collect_on: string | null
          custodian: string | null
          deposit_minor: number | null
          insured: boolean | null
          item_id: string | null
          name: string | null
          no_custodian: boolean | null
          overdue_return: boolean | null
          ownership: Database["public"]["Enums"]["jewellery_ownership"] | null
          return_by: string | null
          returned_on: string | null
          subject: string | null
          value_minor: number | null
          wedding_id: string | null
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["applicability"] | null
          awaiting_return?: never
          collect_on?: string | null
          custodian?: string | null
          deposit_minor?: number | null
          insured?: boolean | null
          item_id?: string | null
          name?: string | null
          no_custodian?: never
          overdue_return?: never
          ownership?: Database["public"]["Enums"]["jewellery_ownership"] | null
          return_by?: string | null
          returned_on?: string | null
          subject?: string | null
          value_minor?: number | null
          wedding_id?: string | null
        }
        Update: {
          applicability?: Database["public"]["Enums"]["applicability"] | null
          awaiting_return?: never
          collect_on?: string | null
          custodian?: string | null
          deposit_minor?: number | null
          insured?: boolean | null
          item_id?: string | null
          name?: string | null
          no_custodian?: never
          overdue_return?: never
          ownership?: Database["public"]["Enums"]["jewellery_ownership"] | null
          return_by?: string | null
          returned_on?: string | null
          subject?: string | null
          value_minor?: number | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "jewellery_items_wedding_id_fkey"
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
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
      v_readiness: {
        Row: {
          area: string | null
          cancelled: number | null
          completed: number | null
          in_progress: number | null
          next_due: string | null
          overdue: number | null
          ratio: number | null
          remaining: number | null
          task_count: number | null
          waiting: number | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wedding_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
      v_seating_summary: {
        Row: {
          capacity_total: number | null
          over_capacity_tables: number | null
          seated_heads: number | null
          seated_households: number | null
          table_count: number | null
          unseated_heads: number | null
          unseated_households: number | null
          wedding_id: string | null
        }
        Relationships: []
      }
      v_seating_tables: {
        Row: {
          capacity: number | null
          household_count: number | null
          location: string | null
          name: string | null
          notes: string | null
          over_capacity: boolean | null
          seated_heads: number | null
          seats_free: number | null
          shape: string | null
          sort_order: number | null
          table_id: string | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_wedding_financials"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
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
            referencedRelation: "v_vendor_financials"
            referencedColumns: ["vendor_id"]
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendor_options_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
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
      v_vendor_financials: {
        Row: {
          allocation_gap_minor: number | null
          budget_line_count: number | null
          budgeted_minor: number | null
          due_minor: number | null
          forecast_minor: number | null
          last_paid_on: string | null
          next_due_date: string | null
          outstanding_minor: number | null
          overpaid_minor: number | null
          paid_minor: number | null
          payment_count: number | null
          unbudgeted_paid_minor: number | null
          vendor_id: string | null
          vendor_price_minor: number | null
          wedding_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
            referencedRelation: "v_catering_headcount"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "v_seating_summary"
            referencedColumns: ["wedding_id"]
          },
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
      record_vendor_from_option: {
        Args: { p_option_id: string }
        Returns: string
      }
      rsvp_lookup: {
        Args: { p_token: string }
        Returns: {
          adults_attending: number
          adults_invited: number
          children_attending: number
          children_invited: number
          dietary: string
          household_name: string
          needs_room: boolean
          needs_transport: boolean
          rsvp_status: string
          wedding_date: string
          wedding_display: string
        }[]
      }
      rsvp_rate_take: {
        Args: { p_bucket: string; p_limit: number; p_window: string }
        Returns: boolean
      }
      rsvp_submit: {
        Args: {
          p_adults: number
          p_children: number
          p_client_hint?: string
          p_dietary?: string
          p_message?: string
          p_needs_room?: boolean
          p_needs_transport?: boolean
          p_token: string
        }
        Returns: undefined
      }
      seed_wedding: {
        Args: { p_locale?: string; p_wedding_id: string }
        Returns: number
      }
    }
    Enums: {
      applicability: "required" | "optional" | "not_applicable"
      attachment_kind: "quote" | "contract" | "invoice" | "other"
      jewellery_ownership: "owned" | "gifted" | "rented" | "borrowed"
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
      rsvp_status: "pending" | "accepted" | "declined" | "maybe" | "no_response"
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
      verify_status: "to_verify" | "verified" | "not_applicable"
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
      attachment_kind: ["quote", "contract", "invoice", "other"],
      jewellery_ownership: ["owned", "gifted", "rented", "borrowed"],
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
      rsvp_status: ["pending", "accepted", "declined", "maybe", "no_response"],
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
      verify_status: ["to_verify", "verified", "not_applicable"],
      wedding_side: ["bride", "groom", "both"],
    },
  },
} as const
