// src/app/api/admin/update-user/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ใช้ Service Role Key เพื่อ Bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetUserId, updates } = body;

    // ตรวจสอบข้อมูลที่ส่งมา
    if (!targetUserId || !updates) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // ทำการอัปเดตข้อมูล
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", targetUserId)
      .select();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
