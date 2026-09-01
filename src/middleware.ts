import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
// NOTE: Do NOT throw here at module level — that would crash the entire Next.js runtime.
// The check happens inside the middleware function instead.

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const encodedSecret = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

  // Protect /admin (except /admin itself which is login) and /api/admin
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin';
  const isAdminApiRoute = pathname.startsWith('/api/admin');

  if (isAdminRoute || isAdminApiRoute) {
    const token = req.cookies.get('adminToken')?.value;

    if (!token) {
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    try {
      if (!encodedSecret) {
        console.error('JWT_SECRET env var is not set on this deployment!');
        if (isAdminApiRoute) return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET missing' }, { status: 500 });
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      await jwtVerify(token, encodedSecret);
      return NextResponse.next();
    } catch (err) {
      console.error('JWT Verification failed:', err);
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/admin', req.url));
      response.cookies.delete('adminToken');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
