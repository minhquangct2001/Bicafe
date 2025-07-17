import { NextResponse } from 'next/server';

export function middleware() {
    // Middleware disabled - using client-side route guards instead
    return NextResponse.next();
}

export const config = {
  // Configure which paths the middleware should run on
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (login page)
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!login|api|_next/static|_next/image|favicon.ico).*)',
  ],
};