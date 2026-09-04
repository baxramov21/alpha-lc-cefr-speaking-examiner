/**
 * sessionToken.ts
 *
 * Fix #2 / Fix #3: Shared utility for verifying student session tokens.
 *
 * Students receive a short-lived signed JWT (2h) when their passcode is
 * verified server-side.  This token is stored in sessionStorage in place
 * of the raw passcode and must accompany every AI evaluation request and
 * the final submission.  Verifying it here prevents:
 *   - Unauthenticated access to expensive Gemini endpoints
 *   - Raw passcode exposure in sessionStorage
 */

import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

export interface StudentSessionPayload {
  passcode: string;
  fullName?: string;
  programme?: string;
  grammarLevel?: string;
  groupName?: string;
  teacherName?: string;
}

/**
 * Verifies a student session JWT and returns its payload.
 * Returns null if the token is missing, expired, or tampered.
 */
export async function verifyStudentSessionToken(
  token: string | null | undefined
): Promise<StudentSessionPayload | null> {
  if (!token || !JWT_SECRET) return null;

  try {
    const encodedSecret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, encodedSecret);

    if (
      payload.type !== 'student_session' ||
      typeof payload.passcode !== 'string'
    ) {
      return null;
    }

    return {
      passcode: payload.passcode as string,
      fullName: payload.fullName as string | undefined,
      programme: payload.programme as string | undefined,
      grammarLevel: payload.grammarLevel as string | undefined,
      groupName: payload.groupName as string | undefined,
      teacherName: payload.teacherName as string | undefined,
    };
  } catch {
    return null;
  }
}
