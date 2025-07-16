import { fetchAuthSession } from 'aws-amplify/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import outputs from './amplify_outputs.json';

const { runWithAmplifyServerContext } = createServerRunner({
    config: outputs,
});

export async function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Skip authentication for login page and public routes
    if (request.nextUrl.pathname.startsWith('/login') || 
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname === '/favicon.ico') {
        return response;
    }

    const authenticated = await runWithAmplifyServerContext({
        nextServerContext: { request, response },
        operation: async (context) => {
            try {
                const session = await fetchAuthSession(context);
                return session.tokens !== undefined;
            } catch (error) {
                console.log('Error fetching auth session:', error);
                return false;
            }
        }
    });

    if (!authenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return response;
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