import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long').max(100),
});

export async function POST(req: NextRequest) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // 1. Get the admin email from the authenticated cookie
    const token = req.cookies.get('adminToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    let adminEmail = '';
    try {
      const encodedSecret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, encodedSecret);
      if (!payload.email || typeof payload.email !== 'string') throw new Error('Invalid payload');
      adminEmail = payload.email;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // 2. Parse input
    const raw = await req.json();
    const parsed = passwordChangeSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    // 3. Verify current password
    // We fetch from admin_users table. (If lazy migration hasn't happened yet, this will fail. 
    // They must log in at least once so the system migrates their credentials to the DB).
    const { data: adminUser, error: dbError } = await supabaseAdmin
      .from('admin_users')
      .select('password_hash')
      .eq('email', adminEmail)
      .single();

    if (dbError || !adminUser) {
      return NextResponse.json(
        { error: 'Account not fully migrated yet. Please sign out and sign back in before changing your password.' },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, adminUser.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 403 });
    }

    // 4. Hash new password and update DB
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabaseAdmin
      .from('admin_users')
      .update({ password_hash: newHashedPassword })
      .eq('email', adminEmail);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
