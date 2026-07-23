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
      assignment_messages: {
        Row: {
          assignment_id: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_messages_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          citation_style: string
          created_at: string
          education_level: string
          exports_count: number
          grammar_report: Json | null
          id: string
          output_style: string
          prompt: string
          quality_score: Json | null
          question_statuses: Json | null
          result: string | null
          sources: Json
          status: string
          template: string
          title: string
          tokens_used: number | null
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          citation_style?: string
          created_at?: string
          education_level: string
          exports_count?: number
          grammar_report?: Json | null
          id?: string
          output_style: string
          prompt: string
          quality_score?: Json | null
          question_statuses?: Json | null
          result?: string | null
          sources?: Json
          status?: string
          template?: string
          title: string
          tokens_used?: number | null
          updated_at?: string
          user_id: string
          word_count: number
        }
        Update: {
          citation_style?: string
          created_at?: string
          education_level?: string
          exports_count?: number
          grammar_report?: Json | null
          id?: string
          output_style?: string
          prompt?: string
          quality_score?: Json | null
          question_statuses?: Json | null
          result?: string | null
          sources?: Json
          status?: string
          template?: string
          title?: string
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          id: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          credits: number
          currency: string
          daily_limit: number
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_archived: boolean
          is_recommended: boolean
          max_upload_mb: number
          max_upload_pages: number
          max_words: number
          monthly_limit: number
          monthly_price_cents: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
          yearly_price_cents: number
        }
        Insert: {
          created_at?: string
          credits?: number
          currency?: string
          daily_limit?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_recommended?: boolean
          max_upload_mb?: number
          max_upload_pages?: number
          max_words?: number
          monthly_limit?: number
          monthly_price_cents?: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          yearly_price_cents?: number
        }
        Update: {
          created_at?: string
          credits?: number
          currency?: string
          daily_limit?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_recommended?: boolean
          max_upload_mb?: number
          max_upload_pages?: number
          max_words?: number
          monthly_limit?: number
          monthly_price_cents?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          yearly_price_cents?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          created_at: string
          display_name: string | null
          education_level: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          lifetime_spending_cents: number
          payment_method: string | null
          plan: string
          plan_id: string | null
          renewal_at: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          lifetime_spending_cents?: number
          payment_method?: string | null
          plan?: string
          plan_id?: string | null
          renewal_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          lifetime_spending_cents?: number
          payment_method?: string | null
          plan?: string
          plan_id?: string | null
          renewal_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          balance: number
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          credits_used: number
          day_key: string
          day_used: number
          month_key: string
          month_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          credits_used?: number
          day_key?: string
          day_used?: number
          month_key?: string
          month_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          credits_used?: number
          day_key?: string
          day_used?: number
          month_key?: string
          month_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _resolve_user_plan: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          credits: number
          currency: string
          daily_limit: number
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_archived: boolean
          is_recommended: boolean
          max_upload_mb: number
          max_upload_pages: number
          max_words: number
          monthly_limit: number
          monthly_price_cents: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
          yearly_price_cents: number
        }
        SetofOptions: {
          from: "*"
          to: "plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_entitlements: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_assignment_slot: {
        Args: { _credits?: number; _user_id: string }
        Returns: undefined
      }
      reserve_assignment_slot: {
        Args: { _credits?: number; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
