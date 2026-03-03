import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://srshalxtikpylcfztlmz.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyc2hhbHh0aWtweWxjZnp0bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg0OTg0MCwiZXhwIjoyMDg1NDI1ODQwfQ.Mw4wTRl8qMDLXMXClfPqbH2WbfTH4m5eGnGtK0cXXWU';

const sb = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
    console.log('1. Querying all users (first 3):');
    const { data: allUsers, error: allErr } = await sb.from('users').select('id, ic_number, full_name, status').limit(3);
    console.log('   Error:', allErr);
    console.log('   Data:', JSON.stringify(allUsers, null, 2));

    console.log('\n2. Querying user with ic_number=020116110323:');
    const { data: user, error: userErr } = await sb.from('users').select('id, ic_number, full_name, status').eq('ic_number', '020116110323');
    console.log('   Error:', userErr);
    console.log('   Data:', JSON.stringify(user, null, 2));

    console.log('\n3. Querying admins (count):');
    const { data: admins, error: adminErr } = await sb.from('admins').select('id, username').limit(3);
    console.log('   Error:', adminErr);
    console.log('   Data:', JSON.stringify(admins, null, 2));
}

test().then(() => setTimeout(() => process.exit(0), 1000));
