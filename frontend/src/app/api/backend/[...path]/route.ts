import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4300/api/v1';

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}/${path}${search}`;

  const headers = new Headers();
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers.set('authorization', authHeader);
  headers.set('content-type', req.headers.get('content-type') || 'application/json');

  const isBodyMethod = !['GET', 'HEAD'].includes(req.method);
  const body = isBodyMethod ? await req.text() : undefined;

  const res = await fetch(url, { method: req.method, headers, body });
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
