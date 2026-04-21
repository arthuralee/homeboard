// Lists curated photos stored in the PHOTOS R2 bucket. The widget fetches
// this index and then requests each image from /api/photos/<key>.

interface Env {
  PHOTOS: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const listed = await context.env.PHOTOS.list({ limit: 1000 });
    const keys = listed.objects
      .filter((obj) => !obj.key.startsWith('.') && obj.size > 0)
      .map((obj) => obj.key);

    return new Response(JSON.stringify({ photos: keys }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    console.error('Photos list error:', err);
    return new Response(JSON.stringify({ error: 'Failed to list photos', photos: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
