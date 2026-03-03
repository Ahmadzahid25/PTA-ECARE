const fs = require('fs');

const content = `import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const verifyIC = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number } = req.body;
        if (!ic_number || ic_number.length !== 12) {
            res.status(400).json({ error: 'No IC mestilah 12 digit' });
            return;
        }

        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, ic_number, contact_no, address, state')
            .eq('ic_number', ic_number);

        if (error || !data || data.length === 0) {
            res.status(404).json({ registered: false, error: 'Maaf, maklumat anda belum didaftar. Sila daftar dahulu.' });
            return;
        }

        const user = data[0];
        const token = jwt.sign({ id: user.id, role: 'user', ic_number: user.ic_number }, JWT_SECRET, { expiresIn: '1h' } as SignOptions);

        res.json({ registered: true, user, token });
    } catch (error) {
        console.error('Verify IC error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { full_name, ic_number, email, contact_no, contact_no_2, address, state, password } = req.body;

        const { data: existing } = await supabase.from('users').select('id').eq('ic_number', ic_number);
        if (existing && existing.length > 0) {
            res.status(400).json({ error: 'IC number already registered' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);
        const { data: result, error } = await supabase.from('users').insert({
            full_name, ic_number, email: email || null, contact_no, contact_no_2: contact_no_2 || null, address, state: state || null, password_hash
        }).select();

        if (error || !result) {
            throw error;
        }

        const user = result[0];

        // Notify Admins
        try {
            const { data: admins } = await supabase.from('admins').select('id');
            if (admins && admins.length > 0) {
                const notifications = admins.map((admin: any) => ({
                    recipient_id: admin.id,
                    recipient_role: 'admin',
                    title: 'New User Registration',
                    message: \`A new user has successfully registered.\\nName: \${user.full_name} | IC Number: \${user.ic_number}\\nClick here to view details.| uid:\${user.id}\`,
                    type: 'system',
                    is_read: false
                }));
                await supabase.from('notifications').insert(notifications);
            }
        } catch (notifyError) {
            console.error('Failed to notify admins:', notifyError);
        }

        const token = jwt.sign({ id: user.id, role: 'user', ic_number: user.ic_number }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
        res.status(201).json({ message: 'Registration successful', user: { id: user.id, full_name: user.full_name, ic_number: user.ic_number, email: user.email }, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, username, password, role } = req.body;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

        let user: any = null;
        let tokenPayload: any = null;

        if (role === 'user') {
            if (!ic_number) { res.status(400).json({ error: 'IC number is required' }); return; }
            const { data } = await supabase.from('users').select('*').eq('ic_number', ic_number);
            if (!data || data.length === 0) {
                await supabase.from('user_logs').insert({ username: ic_number, user_ip: clientIp, success: false });
                res.status(401).json({ error: 'Invalid IC number or password' }); return;
            }
            if (data[0].status !== 'Active' && data[0].status !== 'active') { // Note status is lowercase 'active' in mock data
                res.status(403).json({ error: 'Account is not active. Please contact administrator.' }); return;
            }
            user = data[0];
            tokenPayload = { id: user.id, role: 'user', ic_number: user.ic_number };
        } else if (role === 'admin') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const { data } = await supabase.from('admins').select('*').eq('username', username);
            if (!data || data.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            user = data[0];
            tokenPayload = { id: user.id, role: 'admin', username: user.username };
        } else if (role === 'technician') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const { data } = await supabase.from('technicians').select('*').eq('username', username);
            if (!data || data.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            if (!data[0].is_active) { res.status(403).json({ error: 'Account is not active' }); return; }
            user = data[0];
            tokenPayload = { id: user.id, role: 'technician', username: user.username };
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            if (role === 'user') {
                await supabase.from('user_logs').insert({ user_id: user.id, username: ic_number || username, user_ip: clientIp, success: false });
            }
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        if (role === 'user') {
            await supabase.from('user_logs').insert({ user_id: user.id, username: ic_number, user_ip: clientIp, success: true });
        }

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
        const { password_hash, ...userWithoutPassword } = user;
        
        res.json({ message: 'Login successful', user: userWithoutPassword, token, role });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email } = req.body;
        let query = supabase.from('users').select('id, email, full_name');
        if (ic_number) query = query.eq('ic_number', ic_number);
        else if (email) query = query.eq('email', email);
        
        const { data } = await query;
        const user = data && data[0] ? data[0] : null;

        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        if (!user.email) { res.status(400).json({ error: 'No email associated with this account' }); return; }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await supabase.from('password_resets').delete().eq('user_id', user.id);
        await supabase.from('password_resets').insert({ user_id: user.id, otp, expires_at: expiresAt });

        console.log(\`OTP for \${user.email}: \${otp}\`);
        res.json({ message: 'OTP sent to your email', email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email, otp } = req.body;
        let query = supabase.from('users').select('id');
        if (ic_number) query = query.eq('ic_number', ic_number);
        else if (email) query = query.eq('email', email);
        
        const { data: users } = await query;
        const userId = users && users[0] ? users[0].id : null;

        if (!userId) { res.status(404).json({ error: 'User not found' }); return; }

        const { data: resetRows } = await supabase.from('password_resets').select('*').eq('user_id', userId).eq('otp', otp);
        if (!resetRows || resetRows.length === 0) { res.status(400).json({ error: 'Invalid OTP' }); return; }
        
        if (new Date(resetRows[0].expires_at) < new Date()) { res.status(400).json({ error: 'OTP has expired' }); return; }
        res.json({ message: 'OTP verified', valid: true });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email, otp, new_password } = req.body;
        let query = supabase.from('users').select('id');
        if (ic_number) query = query.eq('ic_number', ic_number);
        else if (email) query = query.eq('email', email);
        
        const { data: users } = await query;
        const userId = users && users[0] ? users[0].id : null;

        if (!userId) { res.status(404).json({ error: 'User not found' }); return; }

        const { data: resetRows } = await supabase.from('password_resets').select('*').eq('user_id', userId).eq('otp', otp);
        if (!resetRows || resetRows.length === 0 || new Date(resetRows[0].expires_at) < new Date()) {
            res.status(400).json({ error: 'Invalid or expired OTP' }); return;
        }

        const password_hash = await bcrypt.hash(new_password, 10);
        await supabase.from('users').update({ password_hash, updated_at: new Date().toISOString() }).eq('id', userId);
        await supabase.from('password_resets').delete().eq('user_id', userId);

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const role = (req as any).user?.role;

        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        let table = 'users';
        if (role === 'admin') table = 'admins';
        if (role === 'technician') table = 'technicians';

        const { data } = await supabase.from(table).select('*').eq('id', userId);

        if (!data || data.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

        const { password_hash, ...userWithoutPassword } = data[0];
        res.json({ user: userWithoutPassword, role });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
`;

fs.writeFileSync('src/controllers/auth.controller.ts', content);
console.log('Done writing auth.controller.ts');
