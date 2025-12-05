import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 🔥 รับ originalName เพิ่มเข้ามา
    const { fileName, originalName, fileType, fileSize, scriptId } =
      await request.json();

    if (!fileName || !scriptId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${fileName}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`;

    const { data, error } = await supabaseAdmin
      .from("files")
      .insert({
        // 🔥 ใช้ originalName เป็นชื่อแสดงผล (ถ้าไม่มีให้ใช้ fileName แทนกันเหนียว)
        name: originalName || fileName,
        file_url: publicUrl,
        file_type: fileType,
        size: fileSize,
        script_id: Number(scriptId),
        folder_id: null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Singer Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
