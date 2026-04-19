// Proxies the user's private Google Calendar iCal feed.
// ARTHUR_GCAL_LINK is a CF Pages secret and never reaches the client.

interface Env {
  ARTHUR_GCAL_LINK: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const feedUrl = context.env.ARTHUR_GCAL_LINK;
  if (!feedUrl) {
    return new Response('ARTHUR_GCAL_LINK secret not configured', { status: 500 });
  }

  const upstream = await fetch(feedUrl, {
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
};
