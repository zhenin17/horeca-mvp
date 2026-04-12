import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000";

function buildTargetUrl(
  pathParts: string[],
  request: NextRequest,
  forceTrailingSlash = false
) {
  const path = pathParts.join("/");
  const hasTrailingSlash =
    forceTrailingSlash || request.nextUrl.pathname.endsWith("/");

  const base = API_BASE_URL.replace(/\/$/, "");
  const url = new URL(`${base}/${path}${hasTrailingSlash ? "/" : ""}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

async function fetchUpstream(
  request: NextRequest,
  targetUrl: string
): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  return fetch(targetUrl, init);
}

function isRedirectStatus(status: number) {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const hasTrailingSlash = request.nextUrl.pathname.endsWith("/");

  let response = await fetchUpstream(
    request,
    buildTargetUrl(path, request, false)
  );

  if (!hasTrailingSlash && (response.status === 404 || isRedirectStatus(response.status))) {
    response = await fetchUpstream(
      request,
      buildTargetUrl(path, request, true)
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: contentType ? { "content-type": contentType } : undefined,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}