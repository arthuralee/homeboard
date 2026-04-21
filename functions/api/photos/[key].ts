// Serves an individual photo from the PHOTOS R2 bucket.

interface Env {
  PHOTOS: R2Bucket;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = decodeURIComponent(context.params.key as string);

  const object = await context.env.PHOTOS.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const contentType =
    object.httpMetadata?.contentType ?? CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream';

  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      ETag: object.httpEtag,
    },
  });
};
