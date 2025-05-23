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
      app_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      content_requests: {
        Row: {
          audience: string | null
          company: string | null
          country: string | null
          created_at: string
          id: string
          include_frontmatter: boolean | null
          include_images: boolean | null
          language: string
          media_file: string | null
          media_mode: string
          prompt: string
          tone: string | null
          tone_type: string | null
          tone_url: string | null
          use_ai_media: boolean | null
          word_count: number
        }
        Insert: {
          audience?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          id?: string
          include_frontmatter?: boolean | null
          include_images?: boolean | null
          language: string
          media_file?: string | null
          media_mode?: string
          prompt: string
          tone?: string | null
          tone_type?: string | null
          tone_url?: string | null
          use_ai_media?: boolean | null
          word_count: number
        }
        Update: {
          audience?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          id?: string
          include_frontmatter?: boolean | null
          include_images?: boolean | null
          language?: string
          media_file?: string | null
          media_mode?: string
          prompt?: string
          tone?: string | null
          tone_type?: string | null
          tone_url?: string | null
          use_ai_media?: boolean | null
          word_count?: number
        }
        Relationships: []
      }
      content_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          media_agent_prompt: string | null
          name: string
          system_prompt: string
          updated_at: string
          user_prompt: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          media_agent_prompt?: string | null
          name: string
          system_prompt: string
          updated_at?: string
          user_prompt: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          media_agent_prompt?: string | null
          name?: string
          system_prompt?: string
          updated_at?: string
          user_prompt?: string
        }
        Relationships: []
      }
      generated_content: {
        Row: {
          content: string
          fact_check_score: number | null
          frontmatter: Json | null
          generated_at: string
          id: string
          images: Json
          readability_score: string | null
          reading_time: number | null
          request_id: string
          seo_score: number | null
          title: string
          word_count: number
        }
        Insert: {
          content: string
          fact_check_score?: number | null
          frontmatter?: Json | null
          generated_at?: string
          id?: string
          images?: Json
          readability_score?: string | null
          reading_time?: number | null
          request_id: string
          seo_score?: number | null
          title: string
          word_count: number
        }
        Update: {
          content?: string
          fact_check_score?: number | null
          frontmatter?: Json | null
          generated_at?: string
          id?: string
          images?: Json
          readability_score?: string | null
          reading_time?: number | null
          request_id?: string
          seo_score?: number | null
          title?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "content_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
