import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, type, imageUrls, userId, userEmail, userName } =
      body; // รับ imageUrls (มี s)

    // 1. บันทึกลง Database
    const { error: dbError } = await supabaseAdmin.from("feedbacks").insert({
      user_id: userId,
      title,
      description,
      type,
      image_urls: imageUrls || [], // บันทึกเป็น Array
    });

    if (dbError) throw dbError;

    // 2. เตรียม HTML สำหรับรูปภาพ
    const imagesHtml = (imageUrls || [])
      .map(
        (url: string, index: number) =>
          `<p><strong>รูปที่ ${index + 1}:</strong> <a href="${
            process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN
          }/${url}">ดูรูปภาพ</a></p>`
      )
      .join("");

    // 3. ส่งอีเมล
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.ADMIN_EMAIL!,
      subject: `[IPR Feedback] ${type.toUpperCase()}: ${title}`,
      html: `
        <h2>มีการแจ้งเตือนใหม่จาก ${userName}</h2>
        <p><strong>ประเภท:</strong> ${
          type === "bug" ? "🐞 แจ้งปัญหา" : "💡 เสนอแนะ"
        }</p>
        <p><strong>หัวข้อ:</strong> ${title}</p>
        <p><strong>รายละเอียด:</strong> ${description.substring(0, 100)}...</p>
        ${imagesHtml}
        <br />
        <a href="${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/dashboard/admin/feedback" 
           style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
           กดเพื่อดูรายละเอียดทั้งหมด
        </a>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
