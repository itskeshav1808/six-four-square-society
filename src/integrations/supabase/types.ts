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
      admin_allowlist: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          title: string
          tournament_id: string | null
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          tournament_id?: string | null
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          cert_type: string
          details: string | null
          id: string
          issued_at: string
          pdf_url: string | null
          player_id: string | null
          recipient_name: string
          title: string
          tournament_id: string | null
          volunteer_id: string | null
        }
        Insert: {
          cert_type: string
          details?: string | null
          id?: string
          issued_at?: string
          pdf_url?: string | null
          player_id?: string | null
          recipient_name: string
          title: string
          tournament_id?: string | null
          volunteer_id?: string | null
        }
        Update: {
          cert_type?: string
          details?: string | null
          id?: string
          issued_at?: string
          pdf_url?: string | null
          player_id?: string | null
          recipient_name?: string
          title?: string
          tournament_id?: string | null
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          incurred_on: string | null
          tournament_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incurred_on?: string | null
          tournament_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incurred_on?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          change: number
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          reason: string | null
        }
        Insert: {
          change: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          reason?: string | null
        }
        Update: {
          change?: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          album: string | null
          caption: string | null
          created_at: string
          id: string
          tournament_id: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          album?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          tournament_id?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          album?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          tournament_id?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      pairings: {
        Row: {
          black_player_id: string | null
          board_number: number | null
          created_at: string
          id: string
          result: string | null
          round_id: string
          white_player_id: string | null
        }
        Insert: {
          black_player_id?: string | null
          board_number?: number | null
          created_at?: string
          id?: string
          result?: string | null
          round_id: string
          white_player_id?: string | null
        }
        Update: {
          black_player_id?: string | null
          board_number?: number | null
          created_at?: string
          id?: string
          result?: string | null
          round_id?: string
          white_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pairings_black_player_id_fkey"
            columns: ["black_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairings_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairings_white_player_id_fkey"
            columns: ["white_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          proof_url: string | null
          reference: string | null
          registration_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tournament_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          proof_url?: string | null
          reference?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tournament_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          proof_url?: string | null
          reference?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tournament_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          cda_id: string | null
          city: string | null
          created_at: string
          dob: string | null
          email: string | null
          emergency_contact: string | null
          fide_id: string | null
          full_name: string
          gender: string | null
          id: string
          parent_name: string | null
          parent_phone: string | null
          phone: string | null
          rating: number | null
          school: string | null
          slug: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          cda_id?: string | null
          city?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          emergency_contact?: string | null
          fide_id?: string | null
          full_name: string
          gender?: string | null
          id?: string
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          rating?: number | null
          school?: string | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          cda_id?: string | null
          city?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          emergency_contact?: string | null
          fide_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          rating?: number | null
          school?: string | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          checkin_status: Database["public"]["Enums"]["checkin_status"]
          created_at: string
          dummy_order_id: string | null
          dummy_payment_id: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          player_id: string
          proof_notes: string | null
          proof_url: string | null
          qr_token: string
          status: Database["public"]["Enums"]["registration_status"]
          tournament_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_status?: Database["public"]["Enums"]["checkin_status"]
          created_at?: string
          dummy_order_id?: string | null
          dummy_payment_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          player_id: string
          proof_notes?: string | null
          proof_url?: string | null
          qr_token?: string
          status?: Database["public"]["Enums"]["registration_status"]
          tournament_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_status?: Database["public"]["Enums"]["checkin_status"]
          created_at?: string
          dummy_order_id?: string | null
          dummy_payment_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          player_id?: string
          proof_notes?: string | null
          proof_url?: string | null
          qr_token?: string
          status?: Database["public"]["Enums"]["registration_status"]
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean | null
          is_published: boolean | null
          round_number: number
          start_time: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          is_published?: boolean | null
          round_number: number
          start_time?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          is_published?: boolean | null
          round_number?: number
          start_time?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          body: string | null
          key: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          key: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          key?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          contribution: number | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          tier: string | null
          tournament_id: string | null
          website_url: string | null
        }
        Insert: {
          contribution?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          tier?: string | null
          tournament_id?: string | null
          website_url?: string | null
        }
        Update: {
          contribution?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          tier?: string | null
          tournament_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          games_played: number | null
          id: string
          player_id: string
          points: number | null
          rank: number | null
          tiebreak: number | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          games_played?: number | null
          id?: string
          player_id: string
          points?: number | null
          rank?: number | null
          tiebreak?: number | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          games_played?: number | null
          id?: string
          player_id?: string
          points?: number | null
          rank?: number | null
          tiebreak?: number | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_categories: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string
          entry_fee: number | null
          id: string
          max_participants: number | null
          name: string
          tournament_id: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          entry_fee?: number | null
          id?: string
          max_participants?: number | null
          name: string
          tournament_id: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          entry_fee?: number | null
          id?: string
          max_participants?: number | null
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          city: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          entry_fee: number | null
          id: string
          is_featured: boolean | null
          name: string
          prize_pool: number | null
          prize_structure: string | null
          registration_deadline: string | null
          rules: string | null
          slug: string
          start_date: string
          status: Database["public"]["Enums"]["tournament_status"]
          time_control: string | null
          total_rounds: number | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          id?: string
          is_featured?: boolean | null
          name: string
          prize_pool?: number | null
          prize_structure?: string | null
          registration_deadline?: string | null
          rules?: string | null
          slug: string
          start_date: string
          status?: Database["public"]["Enums"]["tournament_status"]
          time_control?: string | null
          total_rounds?: number | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          id?: string
          is_featured?: boolean | null
          name?: string
          prize_pool?: number | null
          prize_structure?: string | null
          registration_deadline?: string | null
          rules?: string | null
          slug?: string
          start_date?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          time_control?: string | null
          total_rounds?: number | null
          updated_at?: string
          venue?: string | null
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
      volunteer_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          duty: string | null
          id: string
          location: string | null
          reporting_time: string | null
          status: Database["public"]["Enums"]["volunteer_task_status"]
          title: string
          tournament_id: string | null
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duty?: string | null
          id?: string
          location?: string | null
          reporting_time?: string | null
          status?: Database["public"]["Enums"]["volunteer_task_status"]
          title: string
          tournament_id?: string | null
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duty?: string | null
          id?: string
          location?: string | null
          reporting_time?: string | null
          status?: Database["public"]["Enums"]["volunteer_task_status"]
          title?: string
          tournament_id?: string | null
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_tasks_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_tasks_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role_description: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role_description?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role_description?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "volunteer"
      checkin_status: "not_checked_in" | "checked_in"
      payment_method: "dummy_gateway" | "manual_proof" | "cash" | "free"
      payment_status: "pending" | "verified" | "failed" | "refunded"
      registration_status: "pending" | "approved" | "rejected" | "cancelled"
      tournament_status:
        | "draft"
        | "published"
        | "ongoing"
        | "completed"
        | "cancelled"
      volunteer_task_status: "pending" | "in_progress" | "completed"
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
      app_role: ["admin", "volunteer"],
      checkin_status: ["not_checked_in", "checked_in"],
      payment_method: ["dummy_gateway", "manual_proof", "cash", "free"],
      payment_status: ["pending", "verified", "failed", "refunded"],
      registration_status: ["pending", "approved", "rejected", "cancelled"],
      tournament_status: [
        "draft",
        "published",
        "ongoing",
        "completed",
        "cancelled",
      ],
      volunteer_task_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
