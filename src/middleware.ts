import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dokit-admin-secret-change-in-production-2026'
);

// Public routes that don't require authentication
const publicRoutes = ['/login', '/login/mfa', '/login/recovery', '/api/auth', '/api/health', '/api/db', '/api/migrations', '/api/clients'];

// Routes that require auth but not full MFA
const partialAuthRoutes = ['/setup-mfa', '/change-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow static files and API routes (except protected ones)
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Get session token
  const token = request.cookies.get('dokit_session')?.value;
  
  if (!token) {
    // No session, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    // Verify token using jose (Edge-compatible)
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    const decoded = payload as {
      userId: number;
      email: string;
      role: string;
      mfaVerified: boolean;
      mustChangePassword?: boolean;
      exp: number;
    };
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('dokit_session');
      return response;
    }
    
    // For partial auth routes, just check if logged in
    if (partialAuthRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }
    
    // MFA check disabled for now
    // if (!decoded.mfaVerified) {
    //   return NextResponse.redirect(new URL('/setup-mfa', request.url));
    // }
    
    // Check if must change password
    if (decoded.mustChangePassword) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }
    
    // All good, continue
    return NextResponse.next();
    
  } catch (error) {
    // Invalid token, redirect to login
    console.error('Middleware JWT error:', error);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('dokit_session');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/health).*)',
  ],
};
