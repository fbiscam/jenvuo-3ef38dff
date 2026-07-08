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
      alert_preferences: {
        Row: {
          browser_enabled: boolean
          email_enabled: boolean
          min_grade: string
          quiet_end: string | null
          quiet_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_enabled?: boolean
          email_enabled?: boolean
          min_grade?: string
          quiet_end?: string | null
          quiet_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_enabled?: boolean
          email_enabled?: boolean
          min_grade?: string
          quiet_end?: string | null
          quiet_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_balances: {
        Row: {
          balance: number
          monthly_allowance: number
          period_resets_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          monthly_allowance?: number
          period_resets_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          monthly_allowance?: number
          period_resets_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_lots: {
        Row: {
          amount_granted: number
          amount_remaining: number
          expires_at: string
          granted_at: string
          id: string
          metadata: Json
          reason: string
          user_id: string
        }
        Insert: {
          amount_granted: number
          amount_remaining: number
          expires_at: string
          granted_at?: string
          id?: string
          metadata?: Json
          reason: string
          user_id: string
        }
        Update: {
          amount_granted?: number
          amount_remaining?: number
          expires_at?: string
          granted_at?: string
          id?: string
          metadata?: Json
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_auth_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          purpose: string
          recovery_link: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          purpose: string
          recovery_link?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          purpose?: string
          recovery_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_change_audit: {
        Row: {
          created_at: string
          error_reason: string | null
          event: string
          id: string
          ip: string | null
          new_email: string | null
          old_email: string | null
          request_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_reason?: string | null
          event: string
          id?: string
          ip?: string | null
          new_email?: string | null
          old_email?: string | null
          request_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_reason?: string | null
          event?: string
          id?: string
          ip?: string | null
          new_email?: string | null
          old_email?: string | null
          request_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_change_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "email_change_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_change_requests: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          new_email: string
          old_email: string
          token_hash: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          new_email: string
          old_email: string
          token_hash: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          new_email?: string
          old_email?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      insight_topics: {
        Row: {
          angle: string | null
          category: string
          created_at: string
          id: string
          keyword: string
          last_used_at: string | null
          priority: number
        }
        Insert: {
          angle?: string | null
          category?: string
          created_at?: string
          id?: string
          keyword: string
          last_used_at?: string | null
          priority?: number
        }
        Update: {
          angle?: string | null
          category?: string
          created_at?: string
          id?: string
          keyword?: string
          last_used_at?: string | null
          priority?: number
        }
        Relationships: []
      }
      insights: {
        Row: {
          category: string
          content: string
          created_at: string
          excerpt: string
          id: string
          image_url: string | null
          is_breaking: boolean | null
          notified_at: string | null
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          excerpt: string
          id?: string
          image_url?: string | null
          is_breaking?: boolean | null
          notified_at?: string | null
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          is_breaking?: boolean | null
          notified_at?: string | null
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          feature_full_ict: boolean
          feature_journal: boolean
          feature_realtime_alerts: boolean
          feature_scanner: boolean
          id: string
          monthly_credits: number
          name: string
          price_usd: number
          rollover_months: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          feature_full_ict?: boolean
          feature_journal?: boolean
          feature_realtime_alerts?: boolean
          feature_scanner?: boolean
          id: string
          monthly_credits?: number
          name: string
          price_usd?: number
          rollover_months?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          feature_full_ict?: boolean
          feature_journal?: boolean
          feature_realtime_alerts?: boolean
          feature_scanner?: boolean
          id?: string
          monthly_credits?: number
          name?: string
          price_usd?: number
          rollover_months?: number
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          killzone_notice_dismissed: boolean
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          killzone_notice_dismissed?: boolean
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          killzone_notice_dismissed?: boolean
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_signals: {
        Row: {
          alert_id: string | null
          created_at: string
          id: string
          notes: string | null
          snapshot: Json | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          snapshot?: Json | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          snapshot?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_signals_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "signal_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_alert_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      signal_alerts: {
        Row: {
          confidence: number | null
          created_at: string
          direction: string
          entry: number
          fired_at: string
          grade: string
          htf_bias: string | null
          id: string
          killzone: string | null
          pair: string
          rationale: string | null
          rr: number | null
          session: string | null
          setup_score: number | null
          sl: number
          tp: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          direction: string
          entry: number
          fired_at?: string
          grade: string
          htf_bias?: string | null
          id?: string
          killzone?: string | null
          pair?: string
          rationale?: string | null
          rr?: number | null
          session?: string | null
          setup_score?: number | null
          sl: number
          tp: number
        }
        Update: {
          confidence?: number | null
          created_at?: string
          direction?: string
          entry?: number
          fired_at?: string
          grade?: string
          htf_bias?: string | null
          id?: string
          killzone?: string | null
          pair?: string
          rationale?: string | null
          rr?: number | null
          session?: string | null
          setup_score?: number | null
          sl?: number
          tp?: number
        }
        Relationships: []
      }
      signup_attempts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      topup_packs: {
        Row: {
          credits: number
          id: string
          label: string
          price_usd: number
          sort_order: number
        }
        Insert: {
          credits: number
          id: string
          label: string
          price_usd: number
          sort_order?: number
        }
        Update: {
          credits?: number
          id?: string
          label?: string
          price_usd?: number
          sort_order?: number
        }
        Relationships: []
      }
      trade_journal: {
        Row: {
          closed_at: string | null
          created_at: string
          direction: string
          entry: number | null
          id: string
          notes: string | null
          opened_at: string
          outcome: string
          pair: string
          pnl: number | null
          source: string
          stop_loss: number | null
          take_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          direction: string
          entry?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          outcome?: string
          pair?: string
          pnl?: number | null
          source?: string
          stop_loss?: number | null
          take_profit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          direction?: string
          entry?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          outcome?: string
          pair?: string
          pnl?: number | null
          source?: string
          stop_loss?: number | null
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_history: {
        Row: {
          created_at: string
          id: string
          query: string
          reply: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          reply: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          reply?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_credits: { Args: never; Returns: number }
      grant_credits: {
        Args: {
          _amount: number
          _metadata?: Json
          _reason: string
          _user_id: string
        }
        Returns: number
      }
      grant_monthly_credits: { Args: never; Returns: number }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      set_user_plan: {
        Args: { _plan_id: string; _user_id: string }
        Returns: undefined
      }
      spend_credits: {
        Args: {
          _amount: number
          _metadata?: Json
          _reason: string
          _user_id: string
        }
        Returns: number
      }
      user_has_plan_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
