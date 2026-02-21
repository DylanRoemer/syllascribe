/**
 * Proxy /api/* to the FastAPI backend. Used when the client sends requests to
 * same-origin (e.g. production fallback when NEXT_PUBLIC_API_BASE_URL is unset).
 * Set API_BASE_URL on the Web service to your FastAPI public URL (e.g. on Railway).
 */

const BACKEND_BASE =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy("GET", _request, context);
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy("POST", _request, context);
}

export async function PUT(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy("PUT", _request, context);
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy("PATCH", _request, context);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy("DELETE", _request, context);
}

async function proxy(
  method: string,
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathSegment = path?.length ? path.join("/") : "";
  const url = new URL(request.url);
  const backendPath = `/api${pathSegment ? `/${pathSegment}` : ""}`;
  const backendUrl = `${stripTrailingSlash(BACKEND_BASE)}${backendPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    duplex: "half",
  };
  if (method !== "GET" && method !== "HEAD" && request.body) {
    init.body = request.body;
  }

  let res: Response;
  try {
    res = await fetch(backendUrl, init as RequestInit);
  } catch (proxyErr) {
    throw proxyErr;
  }
  const resHeaders = new Headers(res.headers);
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}
