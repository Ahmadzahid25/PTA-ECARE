import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAllUserPasswords() {
    console.log('Resetting all user passwords to "user123"...\n');

    const hash = await bcrypt.hash('user123', 10);

    // Update all users
    const { data, error } = await supabase
        .from('users')
        .update({ password_hash: hash })
        .neq('id', '00000000-0000-0000-0000-000000000000') // match all
        .select('id, full_name, ic_number');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Updated ${data.length} users:`);
        data.forEach(u => console.log(`  IC: ${u.ic_number} | Name: ${u.full_name}`));
        console.log('\nAll users can now login with password: user123');
    }

    setTimeout(() => process.exit(0), 1000);
}

resetAllUserPasswords();
