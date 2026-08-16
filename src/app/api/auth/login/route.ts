import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { loginRateLimiter } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabase';

// Fallback environment variables for initial setup / lazy migration
const JWT_SECRET = process.env.JWT_SECRET;
const ENV_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in environment variables.');
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anonymous';
    let success = true;
    try {
      const result = await loginRateLimiter.limit(ip);
      success = result.success;
    } catch (rlError) {
      console.warn('Rate limiter failed, bypassing:', rlError);
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    // 1. Check if admin_users table has this user
    let isValidUser = false;
    let foundEmail = email;

    // We use a try-catch for the DB query in case the user hasn't run the SQL migration yet.
    try {
      const { data: adminUser, error: dbError } = await supabaseAdmin
        .from('admin_users')
        .select('password_hash')
        .eq('email', email)
        .single();
      
      if (!dbError && adminUser) {
        // User exists in DB, verify bcrypt hash
        isValidUser = await bcrypt.compare(password, adminUser.password_hash);
      } else if (email === ENV_ADMIN_EMAIL && password === ENV_ADMIN_PASSWORD) {
        // LAZY MIGRATION: 
        // No user found in DB, but matches .env fallback.
        // Let's create the user in the database to migrate them permanently!
        isValidUser = true;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Attempt to insert. If the table is missing, this fails silently (expected pre-migration).
        await supabaseAdmin.from('admin_users').insert({
          email: email,
          password_hash: hashedPassword
        });
      }
    } catch (dbEx) {
      // If table doesn't exist yet, fallback strictly to .env
      console.warn('admin_users table not accessible yet. Falling back to .env credentials.');
      if (email === ENV_ADMIN_EMAIL && password === ENV_ADMIN_PASSWORD) {
        isValidUser = true;
      }
    }

    if (isValidUser) {
      const encodedSecret = new TextEncoder().encode(JWT_SECRET);
      
      const token = await new SignJWT({ email: foundEmail })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(encodedSecret);

      const response = NextResponse.json({ success: true });
      response.cookies.set('adminToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
