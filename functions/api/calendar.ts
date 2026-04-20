// Proxies the user's private Google Calendar iCal feed.
// ARTHUR_GCAL_LINK is a CF Pages secret and never reaches the client.

interface Env {
  ARTHUR_GCAL_LINK: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const feedUrl = context.env.ARTHUR_GCAL_LINK;
  if (!feedUrl) {
    const keys = Object.keys(context.env ?? {}).sort();
    return new Response(
      `ARTHUR_GCAL_LINK not bound on context.env. Bound keys: [${keys.join(', ') || 'none'}]`,
      { status: 500 },
    );
  }

  const trimmed = feedUrl.trim();
  const upstream = await fetch(trimmed, {
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!upstream.ok) {
    const hadWhitespace = trimmed !== feedUrl;
    let host = '(invalid)';
    let pathTail = '(invalid)';
    try {
      const parsed = new URL(trimmed);
      host = parsed.host;
      // last 12 chars of the path so we can see the token shape without
      // leaking the full private URL
      pathTail = parsed.pathname.slice(-12);
    } catch {
      // leave defaults
    }
    const bodySnippet = (await upstream.text()).slice(0, 160);
    return new Response(
      `upstream ${upstream.status}\n` +
        `stored url: len=${feedUrl.length} trimmedLen=${trimmed.length} whitespace=${hadWhitespace} host=${host} …path${pathTail}\n` +
        `upstream body: ${bodySnippet}`,
      { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
};
