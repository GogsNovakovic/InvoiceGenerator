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
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          vat_id: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          vat_id?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          vat_id?: string | null
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          last_seq: number
          month: number
          user_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          month: number
          user_id: string
          year: number
        }
        Update: {
          last_seq?: number
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_subtotal_cents: number | null
          line_tax_cents: number | null
          position: number
          quantity: number
          unit_price_cents: number
          unit_type: Database["public"]["Enums"]["line_unit_type"]
          user_id: string
          vat_rate_bps: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_subtotal_cents?: number | null
          line_tax_cents?: number | null
          position: number
          quantity?: number
          unit_price_cents?: number
          unit_type?: Database["public"]["Enums"]["line_unit_type"]
          user_id: string
          vat_rate_bps?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_subtotal_cents?: number | null
          line_tax_cents?: number | null
          position?: number
          quantity?: number
          unit_price_cents?: number
          unit_type?: Database["public"]["Enums"]["line_unit_type"]
          user_id?: string
          vat_rate_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "line_items_invoice_fk"
            columns: ["invoice_id", "user_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      invoice_sends: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          pdf_path: string | null
          resend_message_id: string | null
          status: Database["public"]["Enums"]["send_status"]
          to_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id: string
          pdf_path?: string | null
          resend_message_id?: string | null
          status: Database["public"]["Enums"]["send_status"]
          to_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string
          pdf_path?: string | null
          resend_message_id?: string | null
          status?: Database["public"]["Enums"]["send_status"]
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sends_invoice_fk"
            columns: ["invoice_id", "user_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_received_cents: number | null
          client_address: string | null
          client_company_name: string | null
          client_email: string | null
          client_full_name: string | null
          client_id: string | null
          client_vat_id: string | null
          comments: string | null
          created_at: string
          currency: string
          due_date: string
          edited_after_send: boolean
          id: string
          invoice_date: string
          invoice_number: string
          number_month: number
          number_seq: number
          number_year: number
          paid_at: string | null
          paid_source: Database["public"]["Enums"]["paid_source"] | null
          payment_mismatch: boolean
          pdf_generated_at: string | null
          pdf_path: string | null
          search_text: string | null
          sender_address: string | null
          sender_company_name: string | null
          sender_email: string | null
          sender_full_name: string | null
          sender_vat_id: string | null
          sender_website: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_confirmed_paid: boolean
          stripe_payment_link_active: boolean
          stripe_payment_link_id: string | null
          stripe_payment_link_url: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_received_cents?: number | null
          client_address?: string | null
          client_company_name?: string | null
          client_email?: string | null
          client_full_name?: string | null
          client_id?: string | null
          client_vat_id?: string | null
          comments?: string | null
          created_at?: string
          currency: string
          due_date: string
          edited_after_send?: boolean
          id?: string
          invoice_date?: string
          invoice_number: string
          number_month: number
          number_seq: number
          number_year: number
          paid_at?: string | null
          paid_source?: Database["public"]["Enums"]["paid_source"] | null
          payment_mismatch?: boolean
          pdf_generated_at?: string | null
          pdf_path?: string | null
          search_text?: string | null
          sender_address?: string | null
          sender_company_name?: string | null
          sender_email?: string | null
          sender_full_name?: string | null
          sender_vat_id?: string | null
          sender_website?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_confirmed_paid?: boolean
          stripe_payment_link_active?: boolean
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_received_cents?: number | null
          client_address?: string | null
          client_company_name?: string | null
          client_email?: string | null
          client_full_name?: string | null
          client_id?: string | null
          client_vat_id?: string | null
          comments?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          edited_after_send?: boolean
          id?: string
          invoice_date?: string
          invoice_number?: string
          number_month?: number
          number_seq?: number
          number_year?: number
          paid_at?: string | null
          paid_source?: Database["public"]["Enums"]["paid_source"] | null
          payment_mismatch?: boolean
          pdf_generated_at?: string | null
          pdf_path?: string | null
          search_text?: string | null
          sender_address?: string | null
          sender_company_name?: string | null
          sender_email?: string | null
          sender_full_name?: string | null
          sender_vat_id?: string | null
          sender_website?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_confirmed_paid?: boolean
          stripe_payment_link_active?: boolean
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          default_currency: string
          email: string | null
          full_name: string | null
          id: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          updated_at: string
          vat_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          full_name?: string | null
          id: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          updated_at?: string
          vat_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          full_name?: string | null
          id?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          updated_at?: string
          vat_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          invoice_id: string | null
          payload: Json | null
          received_at: string
          stripe_account_id: string | null
          type: string
        }
        Insert: {
          id: string
          invoice_id?: string | null
          payload?: Json | null
          received_at?: string
          stripe_account_id?: string | null
          type: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          payload?: Json | null
          received_at?: string
          stripe_account_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      invoice_vat_breakdown: {
        Row: {
          invoice_id: string | null
          net_cents: number | null
          tax_cents: number | null
          user_id: string | null
          vat_rate_bps: number | null
        }
        Relationships: [
          {
            foreignKeyName: "line_items_invoice_fk"
            columns: ["invoice_id", "user_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Functions: {
      next_invoice_number: {
        Args: { p_invoice_date?: string }
        Returns: {
          invoice_number: string
          number_month: number
          number_seq: number
          number_year: number
        }[]
      }
    }
    Enums: {
      invoice_status: "not_paid" | "paid"
      line_unit_type: "hours" | "flat"
      paid_source: "stripe" | "manual"
      send_status: "sent" | "failed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      invoice_status: ["not_paid", "paid"],
      line_unit_type: ["hours", "flat"],
      paid_source: ["stripe", "manual"],
      send_status: ["sent", "failed"],
    },
  },
} as const
