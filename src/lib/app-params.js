import { supabase } from '@/api/supabaseClient';
export const appParams = {
	appId: 'supabase-migration',
	token: null,
	fromUrl: typeof window !== 'undefined' ? window.location.href : '',
	functionsVersion: 'v1',
	appBaseUrl: '/'}
