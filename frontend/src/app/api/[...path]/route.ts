import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://195.133.30.228";

function buildTargetUrl(
  pathParts: string[],
  request: NextRequest,
  forceTrailingSlash = false
) {
  const path = pathParts.join("/");
  const hasTrailingSlash =
    forceTrailingSlash || request.nextUrl.pathname.endsWith("/");

  const url = new URL(
    `${API_BASE_URL}/api/${path}${hasTrailingSlash ? "/" : ""}`
  );

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
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  return fetch(targetUrl, init);
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

  let response = await fetchUpstream(
    request,
    buildTargetUrl(path, request, false)
  );

  // Для списочных endpoint'ов backend может жить только со слешем на конце.
  // Если без слеша пришел 404, пробуем тот же путь со слешем.
  if (response.status === 404 && !request.nextUrl.pathname.endsWith("/")) {
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