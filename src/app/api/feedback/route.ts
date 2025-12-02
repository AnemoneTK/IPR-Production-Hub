import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // <--- import ตรงนี้
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// สร้าง Admin Client เฉพาะกิจ (Bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ใช้ Key พิเศษ
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, type, imageUrl, userId, userEmail, userName } =
      body;

    // 1. บันทึกลง Database (ใช้ supabaseAdmin แทน supabase ปกติ)
    const { error: dbError } = await supabaseAdmin.from("feedbacks").insert({
      user_id: userId,
      title,
      description,
      type,
      image_url: imageUrl,
    });

    if (dbError) throw dbError;

    // 2. ส่งอีเมลหา Admin
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.ADMIN_EMAIL!,
      subject: `[IPR Feedback] ${type.toUpperCase()}: ${title}`,
      html: `
        <h2>มีการแจ้งเตือนใหม่จาก ${userName}</h2>
        <p><strong>หัวข้อ:</strong> ${title}</p>
        <p><strong>ประเภท:</strong> ${
          type === "bug" ? "🐞 แจ้งปัญหา" : "💡 เสนอแนะ"
        }</p>
        <p><strong>รายละเอียด:</strong> ${description.substring(0, 100)}...</p>
        
        <br />
        <a href="${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/dashboard/admin/feedback" 
           style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
           กดเพื่อดูรายละเอียดและรูปภาพ
        </a>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
