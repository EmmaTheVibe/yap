const UPSTREAM_BASE = "https://whisperbox.koyeb.app";

type RouteCtx = {
  params: Promise<{ path: string[] }>;
};

const FORWARDED_HEADERS = ["authorization", "accept"];

async function proxy(request: Request, { params }: RouteCtx) {
  const { path } = await params;
  const upstreamUrl = new URL(
    `/${path.map(encodeURIComponent).join("/")}`,
    UPSTREAM_BASE,
  );
  upstreamUrl.search = new URL(request.url).search;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const contentType = request.headers.get("content-type");
  if (hasBody && contentType) headers.set("content-type", contentType);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });

    const responseBody = await upstream.arrayBuffer();
    if (!upstream.ok) {
      console.error(
        "WhisperBox proxy error:",
        request.method,
        upstreamUrl.pathname,
        upstream.status,
        new TextDecoder().decode(responseBody.slice(0)),
      );
    }

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    responseHeaders.set("x-whisperbox-status", String(upstream.status));

    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Could not reach WhisperBox API" },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
