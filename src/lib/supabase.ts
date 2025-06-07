import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const getFullApplication = async (applicationId: string) => {
  const { data, error } = await supabase.rpc('get_full_application', {
    p_application_id: applicationId
  });

  if (error) throw error;
  return data;
};

export const uploadDocument = async (file: File, userId: string, applicationId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${applicationId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('user_docs')
    .upload(fileName, file);

  if (error) throw error;
  return data;
};