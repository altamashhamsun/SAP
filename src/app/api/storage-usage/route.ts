import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary credentials not configured" }, { status: 500 });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const [usageRes, resourcesRes] = await Promise.all([
      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
        headers: { Authorization: `Basic ${auth}` },
      }),
      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image?type=upload&max_results=1`, {
        headers: { Authorization: `Basic ${auth}` },
      }),
    ]);

    const usage = await usageRes.json();
    const resources = await resourcesRes.json();

    return NextResponse.json({
      storage: {
        used: usage.storage?.used || 0,
        limit: usage.storage?.limit || 0,
      },
      bandwidth: {
        used: usage.bandwidth?.used || 0,
        limit: usage.bandwidth?.limit || 0,
      },
      assets: {
        count: resources.total_count || 0,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch Cloudinary usage: ${err}` }, { status: 500 });
  }
}
