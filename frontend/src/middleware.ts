import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Extract NextAuth v5 / Auth.js session cookies across all browser environments
  const token = request.cookies.get('authjs.session-token')?.value || 
                request.cookies.get('__Secure-authjs.session-token')?.value ||
                request.cookies.get('next-auth.session-token')?.value || 
                request.cookies.get('__Secure-next-auth.session-token')?.value;

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname === '/submit';

  // 1. Redirect unauthenticated requests targeting protected routes to /login (only if no token present)
  if (isProtectedRoute && !token && process.env.NODE_ENV === 'production') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // 2. Direct exact /dashboard URL to /dashboard/citizen
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL('/dashboard/citizen', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/submit'],
};
