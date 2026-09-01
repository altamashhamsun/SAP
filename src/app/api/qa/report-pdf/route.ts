import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get("path");
    if (!path) return new NextResponse("Missing path", { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { data, error } = await supabase.storage.from("qa-reports").download(path);
    if (error || !data) return new NextResponse("Report not found", { status: 404 });

    const buf = Buffer.from(await data.arrayBuffer());
    const filename = path.split("/").pop() || "qa-report.pdf";

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return new NextResponse(`Error: ${err}`, { status: 500 });
  }
}