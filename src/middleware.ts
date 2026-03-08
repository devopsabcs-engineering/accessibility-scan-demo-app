import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('http');

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { method, url } = request;
  const pathname = new URL(url).pathname;

  const response = NextResponse.next();

  const duration = Date.now() - start;
  log.info(`${method} ${pathname}`, {
    method,
    pathname,
    status: response.status,
    durationMs: duration,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/scan/:path*', '/crawl/:path*'],
};
