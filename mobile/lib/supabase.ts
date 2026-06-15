import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://bmaeyhohopcgusapkstz.supabase.co'
const supabasePublishableKey = 'sb_publishable_MSHub-CHDLIHdIMXs4_veA_xKF4XL5-'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})