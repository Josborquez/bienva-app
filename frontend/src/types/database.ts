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
      ai_usage: {
        Row: {
          fecha: string
          fotos: number
          mensajes: number
          user_id: string
        }
        Insert: {
          fecha: string
          fotos?: number
          mensajes?: number
          user_id: string
        }
        Update: {
          fecha?: string
          fotos?: number
          mensajes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          aliases: string[]
          carb_g: number | null
          categoria: string | null
          created_at: string
          created_by: string | null
          fuente: string | null
          grasa_g: number | null
          id: string
          kcal: number
          marca: string | null
          nombre: string
          porcion_desc: string
          porcion_g: number | null
          prot_g: number
          updated_at: string
          usos: number
          verificado: boolean
        }
        Insert: {
          aliases?: string[]
          carb_g?: number | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          fuente?: string | null
          grasa_g?: number | null
          id?: string
          kcal: number
          marca?: string | null
          nombre: string
          porcion_desc: string
          porcion_g?: number | null
          prot_g: number
          updated_at?: string
          usos?: number
          verificado?: boolean
        }
        Update: {
          aliases?: string[]
          carb_g?: number | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          fuente?: string | null
          grasa_g?: number | null
          id?: string
          kcal?: number
          marca?: string | null
          nombre?: string
          porcion_desc?: string
          porcion_g?: number | null
          prot_g?: number
          updated_at?: string
          usos?: number
          verificado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "foods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_items: {
        Row: {
          cantidad: number
          cantidad_g: number | null
          carb_g: number | null
          confianza: number | null
          created_at: string
          editado_por_usuario: boolean
          food_id: string | null
          grasa_g: number | null
          id: string
          kcal: number
          meal_id: string
          nombre: string
          prot_g: number
        }
        Insert: {
          cantidad?: number
          cantidad_g?: number | null
          carb_g?: number | null
          confianza?: number | null
          created_at?: string
          editado_por_usuario?: boolean
          food_id?: string | null
          grasa_g?: number | null
          id?: string
          kcal: number
          meal_id: string
          nombre: string
          prot_g: number
        }
        Update: {
          cantidad?: number
          cantidad_g?: number | null
          carb_g?: number | null
          confianza?: number | null
          created_at?: string
          editado_por_usuario?: boolean
          food_id?: string | null
          grasa_g?: number | null
          id?: string
          kcal?: number
          meal_id?: string
          nombre?: string
          prot_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          es_borrador: boolean
          fecha: string
          foto_path: string | null
          id: string
          nota: string | null
          origen: Database["public"]["Enums"]["meal_origin"]
          tipo: Database["public"]["Enums"]["meal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          es_borrador?: boolean
          fecha: string
          foto_path?: string | null
          id?: string
          nota?: string | null
          origen?: Database["public"]["Enums"]["meal_origin"]
          tipo: Database["public"]["Enums"]["meal_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          es_borrador?: boolean
          fecha?: string
          foto_path?: string | null
          id?: string
          nota?: string | null
          origen?: Database["public"]["Enums"]["meal_origin"]
          tipo?: Database["public"]["Enums"]["meal_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          contenido: string
          created_at: string
          id: string
          rol: Database["public"]["Enums"]["chat_role"]
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          rol: Database["public"]["Enums"]["chat_role"]
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          rol?: Database["public"]["Enums"]["chat_role"]
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_photos: {
        Row: {
          created_at: string
          error: string | null
          id: string
          meal_id: string | null
          procesada: boolean
          storage_path: string
          tipo_sugerido: Database["public"]["Enums"]["meal_type"] | null
          tomada_en: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          meal_id?: string | null
          procesada?: boolean
          storage_path: string
          tipo_sugerido?: Database["public"]["Enums"]["meal_type"] | null
          tomada_en?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          meal_id?: string | null
          procesada?: boolean
          storage_path?: string
          tipo_sugerido?: Database["public"]["Enums"]["meal_type"] | null
          tomada_en?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_photos_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memory: {
        Row: {
          actualizado_en: string
          perfil_texto: string
          user_id: string
        }
        Insert: {
          actualizado_en?: string
          perfil_texto?: string
          user_id: string
        }
        Update: {
          actualizado_en?: string
          perfil_texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          fotos_gratis_por_dia: number
          hora_habitual_registro: string | null
          id: string
          meta_kcal_max: number | null
          meta_kcal_min: number | null
          meta_prot_max: number | null
          meta_prot_min: number | null
          nombre: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          recordatorio_activo: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          fotos_gratis_por_dia?: number
          hora_habitual_registro?: string | null
          id: string
          meta_kcal_max?: number | null
          meta_kcal_min?: number | null
          meta_prot_max?: number | null
          meta_prot_min?: number | null
          nombre?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          recordatorio_activo?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          fotos_gratis_por_dia?: number
          hora_habitual_registro?: string | null
          id?: string
          meta_kcal_max?: number | null
          meta_kcal_min?: number | null
          meta_prot_max?: number | null
          meta_prot_min?: number | null
          nombre?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          recordatorio_activo?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_totals: {
        Row: {
          comidas: number | null
          fecha: string | null
          kcal: number | null
          prot_g: number | null
          tiene_borrador: boolean | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      frequent_items: {
        Row: {
          cantidad_tipica: number | null
          food_id: string | null
          kcal_tipico: number | null
          nombre: string | null
          prot_tipico: number | null
          tipo: Database["public"]["Enums"]["meal_type"] | null
          ultima_vez: string | null
          user_id: string | null
          veces: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_analyze_photo: { Args: { p_user: string }; Returns: boolean }
      increment_ai_usage: {
        Args: {
          p_fecha: string
          p_fotos?: number
          p_mensajes?: number
          p_user: string
        }
        Returns: undefined
      }
      norm: { Args: { "": string }; Returns: string }
      search_foods: {
        Args: { lim?: number; q: string }
        Returns: {
          aliases: string[]
          carb_g: number | null
          categoria: string | null
          created_at: string
          created_by: string | null
          fuente: string | null
          grasa_g: number | null
          id: string
          kcal: number
          marca: string | null
          nombre: string
          porcion_desc: string
          porcion_g: number | null
          prot_g: number
          updated_at: string
          usos: number
          verificado: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "foods"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      chat_role: "user" | "assistant"
      meal_origin: "foto" | "texto" | "voz" | "repetir" | "manual"
      meal_type: "desayuno" | "almuerzo" | "snack" | "once" | "cena"
      plan_type: "free" | "pro"
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
      chat_role: ["user", "assistant"],
      meal_origin: ["foto", "texto", "voz", "repetir", "manual"],
      meal_type: ["desayuno", "almuerzo", "snack", "once", "cena"],
      plan_type: ["free", "pro"],
    },
  },
} as const
