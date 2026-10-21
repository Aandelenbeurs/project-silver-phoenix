import { NextResponse, type NextRequest } from 'next/server';
import { assessRequest } from './lib/request-security';
export function middleware(request: NextRequest) {
  const denied=assessRequest(request, {user:process.env.PHOENIX_AUTH_USER,password:process.env.PHOENIX_AUTH_PASSWORD});
  const response=denied ? NextResponse.json({success:false,error:denied.message},{status:denied.status}) : NextResponse.next();
  if(denied?.status===401) response.headers.set('WWW-Authenticate','Basic realm="Phoenix Portfolio", charset="UTF-8"');
  response.headers.set('X-Content-Type-Options','nosniff');
  response.headers.set('X-Frame-Options','DENY');
  response.headers.set('Referrer-Policy','same-origin');
  if(request.nextUrl.pathname.startsWith('/api/')) response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
