import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bupfjanqsbvogchanser.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cGZqYW5xc2J2b2djaGFuc2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4OTU5ODUsImV4cCI6MjA2MzQ3MTk4NX0.oJz7-xEDgrn4wuCLPSCh2OLJikOZpNONMi74KHoMch0';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

(async () => {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      console.error('Supabase 连接失败:', error.message);
    } else {
      console.log('Supabase 连接成功');
    }
  })();

export default supabase;

export const testSupabaseConnection = async () => {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      console.error('❌ Supabase 连接失败:', error.message);
    } else {
      console.log('✅ Supabase 连接成功');
    }
  };