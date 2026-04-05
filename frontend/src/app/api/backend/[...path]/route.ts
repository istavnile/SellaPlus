import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4300/api/v1';

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}/${path}${search}`;

  const reqContentType = req.headers.get('content-type') || '';

  const headers = new Headers();
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers.set('authorization', authHeader);

  // For multipart uploads, forward the content-type including boundary
  if (reqContentType) {
    headers.set('content-type', reqContentType);
  }

  // Read body as raw binary to avoid corrupting multipart/binary data
  const isBodyMethod = !['GET', 'HEAD'].includes(req.method);
  const body = isBodyMethod ? await req.arrayBuffer() : undefined;

  const res = await fetch(url, { method: req.method, headers, body });

  // IMPORTANT: Use arrayBuffer for response to correctly handle binary data
  // (images, files, etc). text() would corrupt non-UTF8 binary content.
  const resContentType = res.headers.get('content-type') || 'application/json';
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    status: res.status,
    headers: { 'content-type': resContentType },
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
