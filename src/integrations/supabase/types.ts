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
      announcements: {
        Row: {
          audiences: string[]
          bg_color: string
          button_text: string | null
          button_url: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audiences?: string[]
          bg_color?: string
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audiences?: string[]
          bg_color?: string
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          max_regenerations: number
          output_style: string
          prompt: string
          quality_score: Json | null
          question_statuses: Json | null
          regeneration_count: number
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
          max_regenerations?: number
          output_style: string
          prompt: string
          quality_score?: Json | null
          question_statuses?: Json | null
          regeneration_count?: number
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
          max_regenerations?: number
          output_style?: string
          prompt?: string
          quality_score?: Json | null
          question_statuses?: Json | null
          regeneration_count?: number
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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          metadata: Json
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          billing_interval: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          plan_id: string | null
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_signature: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          billing_interval?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          plan_id?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          billing_interval?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          plan_id?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          credits: number
          currency: string
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
      platform_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      promo_events: {
        Row: {
          content_hash: string
          created_at: string
          event: string
          id: string
          placement: string
          user_id: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          event: string
          id?: string
          placement: string
          user_id?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          event?: string
          id?: string
          placement?: string
          user_id?: string | null
        }
        Relationships: []
      }
      razorpay_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          payment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          status?: string
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
          cycle_started_at: string | null
          month_key: string
          month_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          credits_used?: number
          cycle_started_at?: string | null
          month_key?: string
          month_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          credits_used?: number
          cycle_started_at?: string | null
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
      activate_paid_subscription: {
        Args: {
          _amount_cents: number
          _billing_interval?: string
          _currency: string
          _order_id: string
          _payment_id: string
          _plan_id: string
          _provider: string
          _signature: string
          _user_id: string
        }
        Returns: Json
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
