/**
 * POST /api/auth/verify-passcode
 *
 * Fix #2: Replaces client-side Supabase passcode lookup.
 *
 * Students submit their passcode here.  The server verifies it against
 * the database and — if valid — returns a short-lived signed JWT
 * (student_session token, 2h TTL).  The client stores this token in
 * sessionStorage instead of the raw passcode, eliminating the
 * CWE-922 finding where the plain passcode was recoverable via XSS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET;


const schema = z.object({
  passcode: z.string().min(4).max(64),
  fullName: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfiguration: missing JWT_SECRET.' }, { status: 500 });
  }

  // Validate input
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { passcode, fullName } = parsed.data;

  // 1. Check legacy global passcode from app_settings
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'auth_settings')
    .single();

  const globalPasscode = settingsData?.value?.student_password || process.env.STUDENT_PASSWORD || 'ALPHA2024';
  let validPasscode = null;

  if (passcode.toUpperCase() === globalPasscode.toUpperCase()) {
    validPasscode = globalPasscode.toUpperCase();
  } else {
    // 2. Check new passcodes table
    const { data: passcodeRecord } = await supabase
      .from('passcodes')
      .select('code, group_name, teacher_name')
      .eq('code', passcode.toUpperCase())
      .eq('is_active', true)
      .single();
      
    if (passcodeRecord) {
      validPasscode = passcodeRecord.code;
    }
  }

  if (!validPasscode) {
    return NextResponse.json(
      { error: 'Invalid or inactive passcode. Please check with your teacher.' },
      { status: 403 }
    );
  }

  // Issue a short-lived student session token (2 hours)
  const encodedSecret = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({
    passcode: validPasscode.toUpperCase(),
    fullName: fullName || '',
    type: 'student_session',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encodedSecret);


  return NextResponse.json({ 
    token,
    allowSkip: settingsData?.value?.allow_skip ?? true 
  }, { status: 200 });
}
