export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      digest_runs: {
        Row: {
          created_at: string
          emails_sent: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          logs: string | null
          metadata: Json | null
          run_date: string
          started_at: string
          status: Database["public"]["Enums"]["digest_status"]
          tenders_found: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          emails_sent?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          logs?: string | null
          metadata?: Json | null
          run_date: string
          started_at?: string
          status?: Database["public"]["Enums"]["digest_status"]
          tenders_found?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          emails_sent?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          logs?: string | null
          metadata?: Json | null
          run_date?: string
          started_at?: string
          status?: Database["public"]["Enums"]["digest_status"]
          tenders_found?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          token: string
          used: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          token: string
          used?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          token?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          api_access: boolean
          custom_branding: boolean
          max_sources: number
          max_subscribers: number
          max_tenders_per_day: number
          pdf_extraction: boolean
          plan: Database["public"]["Enums"]["plan_type"]
          priority_support: boolean
          webhook_notifications: boolean
        }
        Insert: {
          api_access?: boolean
          custom_branding?: boolean
          max_sources: number
          max_subscribers: number
          max_tenders_per_day: number
          pdf_extraction?: boolean
          plan: Database["public"]["Enums"]["plan_type"]
          priority_support?: boolean
          webhook_notifications?: boolean
        }
        Update: {
          api_access?: boolean
          custom_branding?: boolean
          max_sources?: number
          max_subscribers?: number
          max_tenders_per_day?: number
          pdf_extraction?: boolean
          plan?: Database["public"]["Enums"]["plan_type"]
          priority_support?: boolean
          webhook_notifications?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_stats"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          identifier_hash: string
          updated_at: string
          window_seconds: number
          window_started_at: string
        }
        Insert: {
          bucket: string
          count?: number
          identifier_hash: string
          updated_at?: string
          window_seconds: number
          window_started_at: string
        }
        Update: {
          bucket?: string
          count?: number
          identifier_hash?: string
          updated_at?: string
          window_seconds?: number
          window_started_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          categories: string[] | null
          crawl_frequency: Database["public"]["Enums"]["crawl_frequency"]
          crawl_success_rate: number | null
          created_at: string
          enabled: boolean
          id: string
          last_crawled_at: string | null
          last_crawl_status: string | null
          metadata: Json | null
          name: string
          requires_js: boolean
          tags: string[] | null
          tenders_found: number | null
          tenant_id: string
          type: Database["public"]["Enums"]["source_type"]
          updated_at: string
          url: string
        }
        Insert: {
          categories?: string[] | null
          crawl_frequency?: Database["public"]["Enums"]["crawl_frequency"]
          crawl_success_rate?: number | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_crawled_at?: string | null
          last_crawl_status?: string | null
          metadata?: Json | null
          name: string
          requires_js?: boolean
          tags?: string[] | null
          tenders_found?: number | null
          tenant_id: string
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url: string
        }
        Update: {
          categories?: string[] | null
          crawl_frequency?: Database["public"]["Enums"]["crawl_frequency"]
          crawl_success_rate?: number | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_crawled_at?: string | null
          last_crawl_status?: string | null
          metadata?: Json | null
          name?: string
          requires_js?: boolean
          tags?: string[] | null
          tenders_found?: number | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_stats"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_digest_sent_at: string | null
          preferences: Json
          tenant_id: string
          unsubscribe_token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_digest_sent_at?: string | null
          preferences?: Json
          tenant_id: string
          unsubscribe_token?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_digest_sent_at?: string | null
          preferences?: Json
          tenant_id?: string
          unsubscribe_token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          extracted_text: string | null
          file_size: number | null
          filename: string | null
          id: string
          metadata: Json | null
          storage_path: string | null
          tender_id: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          extracted_text?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          storage_path?: string | null
          tender_id: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          extracted_text?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          storage_path?: string | null
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "active_tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_read_model"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          category: Database["public"]["Enums"]["tender_category"]
          closing_at: string | null
          contact_email: string | null
          contact_phone: string | null
          content_hash: string
          created_at: string
          days_remaining: number | null
          description: string | null
          estimated_value: number | null
          expired: boolean
          first_seen: string
          id: string
          issuer: string | null
          last_seen: string
          location: string | null
          metadata: Json | null
          notified: boolean
          priority: Database["public"]["Enums"]["tender_priority"]
          published_date: string | null
          raw_content: string | null
          reference_number: string | null
          source_id: string | null
          source_url: string | null
          summary: string | null
          tenant_id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["tender_category"]
          closing_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          content_hash: string
          created_at?: string
          days_remaining?: number | null
          description?: string | null
          estimated_value?: number | null
          expired?: boolean
          first_seen?: string
          id?: string
          issuer?: string | null
          last_seen?: string
          location?: string | null
          metadata?: Json | null
          notified?: boolean
          priority?: Database["public"]["Enums"]["tender_priority"]
          published_date?: string | null
          raw_content?: string | null
          reference_number?: string | null
          source_id?: string | null
          source_url?: string | null
          summary?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: Database["public"]["Enums"]["tender_category"]
          closing_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          content_hash?: string
          created_at?: string
          days_remaining?: number | null
          description?: string | null
          estimated_value?: number | null
          expired?: boolean
          first_seen?: string
          id?: string
          issuer?: string | null
          last_seen?: string
          location?: string | null
          metadata?: Json | null
          notified?: boolean
          priority?: Database["public"]["Enums"]["tender_priority"]
          published_date?: string | null
          raw_content?: string | null
          reference_number?: string | null
          source_id?: string | null
          source_url?: string | null
          summary?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenders_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_stats"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          digest_time: string
          id: string
          is_active: boolean
          name: string
          plan: Database["public"]["Enums"]["plan_type"]
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          digest_time?: string
          id?: string
          is_active?: boolean
          name: string
          plan?: Database["public"]["Enums"]["plan_type"]
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          digest_time?: string
          id?: string
          is_active?: boolean
          name?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_tenders: {
        Row: {
          category: Database["public"]["Enums"]["tender_category"] | null
          closing_at: string | null
          contact_email: string | null
          contact_phone: string | null
          content_hash: string | null
          created_at: string | null
          days_remaining: number | null
          description: string | null
          estimated_value: number | null
          expired: boolean | null
          first_seen: string | null
          id: string | null
          issuer: string | null
          last_seen: string | null
          location: string | null
          metadata: Json | null
          notified: boolean | null
          priority: Database["public"]["Enums"]["tender_priority"] | null
          published_date: string | null
          raw_content: string | null
          reference_number: string | null
          source_id: string | null
          source_name: string | null
          source_url: string | null
          source_website_url: string | null
          summary: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Relationships: []
      }
      tender_read_model: {
        Row: {
          category: Database["public"]["Enums"]["tender_category"] | null
          closing_at: string | null
          contact_email: string | null
          contact_phone: string | null
          content_hash: string | null
          created_at: string | null
          days_remaining: number | null
          description: string | null
          estimated_value: number | null
          expired: boolean | null
          first_seen: string | null
          id: string | null
          issuer: string | null
          last_seen: string | null
          location: string | null
          metadata: Json | null
          notified: boolean | null
          priority: Database["public"]["Enums"]["tender_priority"] | null
          published_date: string | null
          raw_content: string | null
          reference_number: string | null
          source_id: string | null
          source_name: string | null
          source_url: string | null
          source_website_url: string | null
          summary: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Relationships: []
      }
      tenant_stats: {
        Row: {
          max_sources: number | null
          max_subscribers: number | null
          new_tenders_24h: number | null
          plan: Database["public"]["Enums"]["plan_type"] | null
          source_count: number | null
          subscriber_count: number | null
          tender_count: number | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_rate_limit: {
        Args: {
          p_bucket: string
          p_identifier_hash: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          remaining: number
          reset_at: string
        }[]
      }
      get_trial_days_remaining: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_trial_active: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      seed_demo_sources: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      crawl_frequency: "daily" | "weekly"
      digest_status: "pending" | "running" | "success" | "fail"
      doc_type: "html" | "pdf"
      plan_type: "starter" | "pro" | "enterprise"
      source_type: "portal" | "company"
      tender_category:
        | "courier"
        | "printing"
        | "logistics"
        | "stationery"
        | "it_hardware"
        | "general"
      tender_priority: "high" | "medium" | "low"
      user_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (
      Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"]
    )[TableName] extends { Row: infer RowType }
    ? RowType
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer RowType
      }
      ? RowType
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer InsertType
    }
    ? InsertType
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends { Insert: infer InsertType }
      ? InsertType
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer UpdateType
    }
    ? UpdateType
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends { Update: infer UpdateType }
      ? UpdateType
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
