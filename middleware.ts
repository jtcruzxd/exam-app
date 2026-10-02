import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 'exam_session';

type Role = 'admin' | 'examiner';

interface SessionPayload {
  userId: string;
  username: string;
  role: Role;
}

async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin routes: require role === 'admin'
  if (pathname.startsWith('/admin')) {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.redirect(new URL('/login?from=admin', req.url));
    }
    if (session.role !== 'admin') {
      // Examiners get sent to their own dashboard
      return NextResponse.redirect(new URL('/examiner', req.url));
    }
    return NextResponse.next();
  }

  // ── Examiner routes: require role === 'examiner' OR 'admin'
  if (pathname.startsWith('/examiner')) {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.redirect(new URL('/login?from=examiner', req.url));
    }
    if (session.role === 'admin') {
      // Admins can also access examiner views
      return NextResponse.next();
    }
    if (session.role !== 'examiner') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // ── Login page: redirect already-logged-in users
  if (pathname === '/login') {
    const session = await getSessionFromRequest(req);
    if (session?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (session?.role === 'examiner') {
      return NextResponse.redirect(new URL('/examiner', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/examiner/:path*', '/login'],
};
