import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey =
	import.meta.env.VITE_SUPABASE_KEY ??
	import.meta.env.VITE_SUPABASE_ANON_KEY ??
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Missing Supabase configuration. Set VITE_SUPABASE_URL and one of: VITE_SUPABASE_KEY, VITE_SUPABASE_ANON_KEY, or VITE_SUPABASE_PUBLISHABLE_KEY.'
	)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		// App uses department-password auth stored in custom tables/RPCs.
		persistSession: false,
		autoRefreshToken: false,
		detectSessionInUrl: false,
	},
})