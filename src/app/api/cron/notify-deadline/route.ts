// src/app/api/cron/notify-deadline/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 🔥 1. ประกาศตัวแปร supabase ตรงนี้ (ที่ error เพราะส่วนนี้หายไป)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // 2. คำนวณเวลา (24 ชม. ข้างหน้า)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 3. ดึงข้อมูลงานจาก Supabase
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        due_date,
        status,
        project_id,
        assigned_to,
        projects (title)
      `
      )
      .neq("status", "done") // ไม่เอางานที่เสร็จแล้ว
      .eq("is_notified", false) // ที่ยังไม่เคยแจ้ง
      .lte("due_date", tomorrow.toISOString()) // น้อยกว่าหรือเท่ากับพรุ่งนี้
      .gt("due_date", now.toISOString()); // แต่ยังไม่เลยกำหนด

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: "No tasks to notify" });
    }

    // 4. วนลูปส่งแจ้งเตือน
    for (const task of tasks) {
      const assigneeIds = task.assigned_to || [];
      let mentionText = "";

      // ดึงข้อมูลคนรับผิดชอบเพื่อสร้าง Tag
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("display_name, discord_id")
          .in("id", assigneeIds);

        // สร้างข้อความแท็ก: ถ้ามี discord_id ใช้ <@id> ถ้าไม่มีใช้ชื่อเฉยๆ
        mentionText =
          profiles
            ?.map((p) => (p.discord_id ? `<@${p.discord_id}>` : p.display_name))
            .join(", ") || "";
      }

      // ส่งเข้า Discord
      await sendDiscordNotification({
        title: `⚠️ แจ้งเตือนงานใกล้กำหนดส่ง: ${task.title}`,
        project: task.projects?.title || "Unknown Project",
        deadline: new Date(task.due_date).toLocaleString("th-TH"),
        mentions: mentionText,
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/projects/${task.project_id}`,
      });

      // อัปเดตว่าแจ้งเตือนแล้ว
      await supabase
        .from("tasks")
        .update({ is_notified: true })
        .eq("id", task.id);
    }

    return NextResponse.json({ success: true, notified_count: tasks.length });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ฟังก์ชันยิง Webhook (แยกไว้ด้านล่าง)
async function sendDiscordNotification({
  title,
  project,
  deadline,
  mentions,
  url,
}: any) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload = {
    username: "IPR Production Bot",
    avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
    // 🔥 ใส่ mentions ใน content เพื่อให้เด้งแจ้งเตือน (Ping)
    content: mentions ? `เฮ้! ${mentions} มีงานใกล้ถึงกำหนดส่งครับ` : undefined,
    embeds: [
      {
        title: title,
        description: `งานในโปรเจกต์ **${project}** กำลังจะถึงกำหนดส่ง`,
        color: 16711680, // สีแดง
        fields: [
          { name: "⏰ Deadline", value: deadline, inline: true },
          {
            name: "👥 ผู้รับผิดชอบ",
            value: mentions || "ไม่ระบุ",
            inline: true,
          },
        ],
        url: url,
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
