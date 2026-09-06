import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = ['/auth/login', '/auth/signup', '/auth/reset-password', '/auth/callback', '/api'];

function isPublicPath(pathname: string): boolean {
  // Check if first segment is a valid locale
  const firstSegment = pathname.split('/')[1] || '';
  const hasLocale = (routing.locales as readonly string[]).includes(firstSegment);
  // Strip locale prefix if present
  const strippedPath = hasLocale
    ? pathname.slice(firstSegment.length + 1) || '/'
    : pathname;
  return PUBLIC_PATHS.some((p) => strippedPath.startsWith(p)) || strippedPath === '/';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle i18n routing first
  const intlResponse = intlMiddleware(request);

  // Skip auth check for public paths
  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  // Check auth
  const response = intlResponse || NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Extract locale safely - only use it if it's a known locale
    const firstSegment = pathname.split('/')[1] || '';
    const locale = (routing.locales as readonly string[]).includes(firstSegment)
      ? firstSegment
      : routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico|manifest.json|icons|sw.js|workbox).*)'],
};
