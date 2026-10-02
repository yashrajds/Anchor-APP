import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Anchor] Supabase environment variables are not set. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file. ' +
    'The app will run in offline/localStorage mode.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          photo_url: string | null
          course: string | null
          year: string | null
          birthday: string | null
          joined: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          photo_url?: string | null
          course?: string | null
          year?: string | null
          birthday?: string | null
          joined?: string
        }
        Update: {
          name?: string
          photo_url?: string | null
          course?: string | null
          year?: string | null
          birthday?: string | null
        }
      }
      daily_records: {
        Row: {
          id: string
          user_id: string
          day: string
          sleep: number | null
          mood: number | null
          focus_sec: number | null
          calm_sec: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          day: string
          sleep?: number | null
          mood?: number | null
          focus_sec?: number | null
          calm_sec?: number | null
        }
        Update: {
          sleep?: number | null
          mood?: number | null
          focus_sec?: number | null
          calm_sec?: number | null
        }
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          day: string
          content: string
          mood: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          day: string
          content: string
          mood?: number | null
        }
        Update: {
          content?: string
          mood?: number | null
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          label: string
          color: string
          sort_order: number
          created_at: string
        }
        Insert: {
          user_id: string
          label: string
          color: string
          sort_order?: number
        }
        Update: {
          label?: string
          color?: string
          sort_order?: number
        }
      }
      habit_completions: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          day: string
          created_at: string
        }
        Insert: {
          habit_id: string
          user_id: string
          day: string
        }
        Update: never
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: string
          notif_checkin: boolean
          notif_checkin_time: string
          notif_streak: boolean
          notif_weekly: boolean
          notif_quiet: boolean
          notif_quiet_start: string
          notif_quiet_end: string
          a11y_text_size: string
          a11y_reduce_motion: boolean
          a11y_contrast: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          theme?: string
        }
        Update: {
          theme?: string
          notif_checkin?: boolean
          notif_checkin_time?: string
          notif_streak?: boolean
          notif_weekly?: boolean
          notif_quiet?: boolean
          notif_quiet_start?: string
          notif_quiet_end?: string
          a11y_text_size?: string
          a11y_reduce_motion?: boolean
          a11y_contrast?: boolean
        }
      }
    }
  }
}
