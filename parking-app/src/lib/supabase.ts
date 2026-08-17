import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Config from "react-native-config";
import type { Database } from "@/types/database";

const supabaseUrl = Config.SUPABASE_URL ?? "";
const supabaseAnonKey = Config.SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl) {
  console.warn(
    "[supabase] SUPABASE_URL is not set. Create a .env file (see .env.example) at the project root — react-native-config reads it at build time, so rebuild the native app after changing it."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
