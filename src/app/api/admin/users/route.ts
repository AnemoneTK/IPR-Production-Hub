import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// 1. ตั้งค่าตัวส่งเมล (Transporter)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Email Template Helper ---
const getEmailTemplate = (
  type: "welcome" | "suspend" | "activate",
  data: any
) => {
  const baseStyle =
    "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;";
  const containerStyle =
    "max-w-xl mx-auto border border-border rounded-lg overflow-hidden";
  const headerStyle =
    "background-color: #0f172a; padding: 20px; text-align: center;";
  const bodyStyle = "padding: 30px; background-color: #ffffff;";
  const btnStyle =
    "display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;";

  let subject = "";
  let content = "";

  if (type === "welcome") {
    subject = "🎉 ยินดีต้อนรับสู่ IPR Production Hub";
    content = `
      <h2 style="color: #0f172a;">ยินดีต้อนรับ, ${data.name}</h2>
      <p>แอดมินได้สร้างบัญชีผู้ใช้งานสำหรับคุณเรียบร้อยแล้ว ข้อมูลเข้าสู่ระบบ:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${data.email}</p>
        <p style="margin: 5px 0;"><strong>🔑 Password:</strong> 12341234</p>
      </div>
      <p style="font-size: 14px; color: #64748b;">*ระบบจะบังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าใช้งานครั้งแรก</p>
      <center><a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="${btnStyle}">เข้าสู่ระบบ</a></center>
    `;
  } else if (type === "suspend") {
    subject = "⚠️ แจ้งเตือน: บัญชีถูกระงับการใช้งาน";
    content = `
      <h2 style="color: #ef4444;">บัญชีถูกระงับชั่วคราว</h2>
      <p>เรียนคุณ ${data.name},</p>
      <p>แอดมินได้ระงับการใช้งานบัญชีของคุณชั่วคราว (อาจเนื่องจากหมดช่วงทดสอบระบบ)</p>
      <p>เราจะแจ้งให้ทราบอีกครั้งเมื่อเปิดให้ใช้งานครับ</p>
    `;
  } else if (type === "activate") {
    subject = "✅ แจ้งเตือน: บัญชีเปิดใช้งานแล้ว";
    content = `
      <h2 style="color: #22c55e;">บัญชีเปิดใช้งานแล้ว</h2>
      <p>เรียนคุณ ${data.name},</p>
      <p>แอดมินได้เปิดสิทธิ์การใช้งานบัญชีของคุณเรียบร้อยแล้ว กลับมาลุยงานต่อได้เลย!</p>
      <center><a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="${btnStyle}">เข้าสู่ระบบ</a></center>
    `;
  }

  return {
    subject,
    html: `
      <div style="${baseStyle}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">IPR <span style="color: #292929; background:#ffa31a; padding: 2px 6px; border-radius: 4px; font-size: 18px; vertical-align: middle;">Hub</span></h1>
          </div>
          <div style="${bodyStyle}">${content}</div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">© 2025 IPR Production Hub</div>
        </div>
      </div>
  `,
  };
};

// 1. CREATE USER (แก้ไขใหม่ตามโจทย์)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // รับแค่ email กับ role ไม่ต้องรับ password/name
    const { email, role } = body;

    // ตั้งค่า Default
    const defaultPassword = "12341234";
    const defaultDisplayName = email.split("@")[0]; // ใช้ชื่อหน้าอีเมลเป็นชื่อเล่นไปก่อน

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { displayName: defaultDisplayName },
      });

    if (authError) throw authError;

    if (authData.user) {
      const isProducer = role === "producer";
      await supabaseAdmin
        .from("profiles")
        .update({
          display_name: defaultDisplayName, // บันทึกชื่อ default
          main_role: role,
          is_producer: isProducer,
          must_change_password: true,
          is_active: true,
        })
        .eq("id", authData.user.id);

      // ส่งเมลด้วย Nodemailer
      const emailContent = getEmailTemplate("welcome", {
        name: defaultDisplayName,
        email,
      });
      await transporter.sendMail({
        from: `"IPR Admin" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. UPDATE USER (เหมือนเดิม)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, display_name, main_role, is_admin, is_active, email } = body;

    const { data: oldProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        display_name,
        main_role,
        is_admin,
        is_active,
        is_producer: main_role === "producer",
      })
      .eq("id", id);

    if (error) throw error;

    // ส่งเมลแจ้งเตือนเมื่อสถานะเปลี่ยน
    if (oldProfile && oldProfile.is_active !== is_active) {
      const type = is_active ? "activate" : "suspend";
      const emailContent = getEmailTemplate(type, { name: display_name });

      await transporter.sendMail({
        from: `"IPR Admin" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("Missing User ID");

    // ลบออกจากระบบ Auth (ข้อมูลใน Profile จะหายไปเองถ้าตั้ง Cascade ไว้ หรือมันจะค้างอยู่แต่เข้าไม่ได้)
    // การลบที่ auth.admin.deleteUser ถือเป็นการลบระดับสูงสุด
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
