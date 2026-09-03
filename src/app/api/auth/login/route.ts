import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

// Fallback environment variables for initial setup / lazy migration
const JWT_SECRET = process.env.JWT_SECRET;
const ENV_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;



export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfiguration: missing JWT_SECRET.' }, { status: 500 });
  }

  try {
    const { password } = await req.json();

    let isValidUser = false;

    // Check .env password directly
    if (password === ENV_ADMIN_PASSWORD) {
      isValidUser = true;
    } else {
      // Fallback: check if ANY admin user has this password (since we dropped emails)
      try {
        const { data: adminUsers, error: dbError } = await supabaseAdmin
          .from('admin_users')
          .select('password_hash');
        
        if (!dbError && adminUsers && adminUsers.length > 0) {
          for (const user of adminUsers) {
            if (await bcrypt.compare(password, user.password_hash)) {
              isValidUser = true;
              break;
            }
          }
        }
      } catch (dbEx) {
        console.warn('admin_users table not accessible yet.');
      }
    }

    if (isValidUser) {
      const encodedSecret = new TextEncoder().encode(JWT_SECRET);
      
      const token = await new SignJWT({ email: 'admin' })
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
