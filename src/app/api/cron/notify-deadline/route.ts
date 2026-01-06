// src/app/api/cron/notify-deadline/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: tasksData, error } = await supabase
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
      .neq("status", "done")
      .eq("is_notified", false)
      // เงื่อนไข: น้อยกว่าหรือเท่ากับพรุ่งนี้ (ใกล้ถึง)
      .lte("due_date", tomorrow.toISOString())
      // เงื่อนไข: ต้องยังไม่เลยกำหนด (ถ้าอยากให้แจ้งงานที่ Late ด้วย ให้ลบบรรทัดนี้ทิ้งครับ)
      .gt("due_date", now.toISOString());

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    const tasks = (tasksData as any[]) || [];

    if (tasks.length === 0) {
      return NextResponse.json({ message: "No tasks to notify" });
    }

    for (const task of tasks) {
      const assigneeIds = task.assigned_to || [];
      let mentionText = "";

      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("display_name, discord_id")
          .in("id", assigneeIds);

        mentionText =
          profiles
            ?.map((p) => (p.discord_id ? `<@${p.discord_id}>` : p.display_name))
            .join(", ") || "";
      }

      const projectName = Array.isArray(task.projects)
        ? task.projects[0]?.title
        : task.projects?.title;

      // 🔥 แก้ไข Timezone ให้เวลาตรงกับประเทศไทย
      const thaiTime = new Date(task.due_date).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
      });

      await sendDiscordNotification({
        title: `⚠️ แจ้งเตือนงานใกล้กำหนดส่ง: ${task.title}`,
        project: projectName || "Unknown Project",
        deadline: thaiTime, // ใช้เวลาไทยที่แก้แล้ว
        mentions: mentionText,
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/projects/${task.project_id}`,
      });

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

async function sendDiscordNotification({
  title,
  project,
  deadline,
  mentions,
  url,
}: any) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("❌ MISSING DISCORD_WEBHOOK_URL");
    return;
  }

  const payload = {
    username: "IPR Production Bot",
    // 🔥 เปลี่ยนรูป Avatar ตรงนี้ได้เลยครับ ใส่ URL ของรูปภาพ
    avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",

    // ข้อความแท็ก (Ping)
    content: mentions ? `เฮ้! ${mentions} ส่งงานยัง?` : undefined,

    embeds: [
      {
        title: title,
        description: `งานในโปรเจกต์ **${project}** กำลังจะถึงกำหนดส่ง`,
        color: 16711680,
        fields: [
          { name: "⏰ Deadline", value: deadline, inline: true },
          {
            name: "👥 ผู้รับผิดชอบ",
            value: mentions || "ไม่ระบุ",
            inline: true,
          },
        ],
        url: url,
        footer: {
          text: "IPR Production Hub System",
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const responseText = await res.text();
      console.error(`❌ Discord Webhook Error (${res.status}):`, responseText);
    } else {
      console.log("✅ Discord Notification Sent Successfully");
    }
  } catch (err) {
    console.error("❌ Network Error sending to Discord:", err);
  }
}
