import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = generateSignature(apiSecret, {
      folder: "qac-findings",
      timestamp,
    });

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("api_key", apiKey);
    uploadFormData.append("timestamp", timestamp.toString());
    uploadFormData.append("folder", "qac-findings");
    uploadFormData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadFormData }
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || JSON.stringify(data.error) || "Upload failed" }, { status: 400 });
    }

    return NextResponse.json({ url: data.secure_url, public_id: data.public_id });
  } catch (err) {
    return NextResponse.json({ error: `Upload error: ${err}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { public_id } = await req.json();
    if (!public_id) return NextResponse.json({ error: "No public_id" }, { status: 400 });

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = generateSignature(apiSecret, { public_id, timestamp });

    const params = new URLSearchParams({
      public_id,
      timestamp: timestamp.toString(),
      api_key: apiKey,
      signature,
    });

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      { method: "POST", body: params }
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Delete failed" }, { status: 400 });
    }

    return NextResponse.json({ result: data.result });
  } catch (err) {
    return NextResponse.json({ error: `Delete error: ${err}` }, { status: 500 });
  }
}

function generateSignature(secret: string, params: Record<string, string | number>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const crypto = require("crypto");
  return crypto.createHash("sha1").update(sorted + secret).digest("hex");
}
