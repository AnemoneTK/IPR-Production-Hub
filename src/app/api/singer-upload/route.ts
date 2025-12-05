import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ใช้ Admin Client เพื่อบันทึกข้อมูลข้าม RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // รับแค่ข้อมูล (JSON) ไม่ได้รับไฟล์แล้ว
    const { fileName, fileType, fileSize, scriptId } = await request.json();

    if (!fileName || !scriptId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // สร้าง Public URL (เหมือนเดิม)
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${fileName}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`;

    // บันทึกลง Supabase (ใช้ Admin)
    const { data, error } = await supabaseAdmin
      .from("files")
      .insert({
        name: fileName, // ใช้ชื่อไฟล์ที่ตั้งใหม่
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
