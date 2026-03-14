import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticateUser, createSessionToken, updateLastLogin, logAuditEvent } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Demo login bypass for testing
    if (email === 'demo@sirkl.ai' && password === 'demo2026') {
      const token = createSessionToken({
        userId: 0,
        email: 'demo@sirkl.ai',
        role: 'admin',
        mfaVerified: true,
        mustChangePassword: false
      } as any);
      
      const cookieStore = await cookies();
      cookieStore.set('dokit_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60,
        path: '/'
      });
      
      return NextResponse.json({ success: true, requireMfa: false });
    }
    
    const result = await authenticateUser(email, password);
    
    if (!result.success || !result.user) {
      await logAuditEvent('LOGIN_FAILED', `Failed login attempt for ${email}`);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }
    
    const user = result.user;
    
    // MFA disabled for now - always grant full access
    const mfaVerified = true;
    
    // Create session token
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      mfaVerified,
      mustChangePassword: user.must_change_password
    } as any);
    
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('dokit_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/'
    });
    
    // Store pending user ID for MFA verification
    if (user.mfa_enabled) {
      cookieStore.set('dokit_mfa_pending', String(user.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60, // 10 minutes to complete MFA
        path: '/'
      });
    }
    
    await logAuditEvent('LOGIN_SUCCESS', `User logged in: ${email}`, user.id);
    
    return NextResponse.json({
      success: true,
      requiresMfa: user.mfa_enabled,
      mustChangePassword: user.must_change_password,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
