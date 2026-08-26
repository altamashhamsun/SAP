import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const nextCursor = req.nextUrl.searchParams.get("next_cursor");

    let url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?type=upload&max_results=50`;
    if (nextCursor) url += `&next_cursor=${nextCursor}`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Failed to list" }, { status: 400 });
    }

    return NextResponse.json({
      resources: data.resources.map((r: Record<string, unknown>) => ({
        public_id: r.public_id,
        secure_url: r.secure_url,
        format: r.format,
        bytes: r.bytes,
        created_at: r.created_at,
        width: r.width,
        height: r.height,
      })),
      next_cursor: data.next_cursor || null,
      total_count: data.total_count || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: `List error: ${err}` }, { status: 500 });
  }
}
