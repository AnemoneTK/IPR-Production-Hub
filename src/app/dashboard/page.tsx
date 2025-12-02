"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Image as ImageIcon,
  Music,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// Interface สำหรับข้อมูล Profile
interface UserProfile {
  display_name: string;
  main_role: string;
  is_producer: boolean;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // 1. ดึงข้อมูล User จริงจาก Database
  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, main_role, is_producer")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // 2. ข้อมูลสมมติ (Mock Data) - เดี๋ยวเราจะเปลี่ยนเป็นของจริงตอนทำ Phase 3
  const mockTasks = [
    {
      id: 1,
      title: "อัดเสียงร้อง Cover เพลงรัก",
      project: "Project A",
      due: "พรุ่งนี้",
      status: "pending",
    },
    {
      id: 2,
      title: "ตรวจงาน Artwork ปกคลิป",
      project: "Vlog เที่ยวไทย",
      due: "วันนี้",
      status: "urgent",
    },
    {
      id: 3,
      title: "มิกซ์เสียง Final",
      project: "Project A",
      due: "3 วันที่แล้ว",
      status: "done",
    },
  ];

  const mockActivities = [
    {
      id: 1,
      user: "Sound_Kung",
      action: "อัปโหลดไฟล์",
      target: "Final_Mix_v2.wav",
      time: "10 นาทีที่แล้ว",
      icon: FileAudio,
      color: "text-blue-500",
    },
    {
      id: 2,
      user: "Artist_Chan",
      action: "ส่งงานภาพ",
      target: "Thumbnail_01.png",
      time: "1 ชั่วโมงที่แล้ว",
      icon: ImageIcon,
      color: "text-purple-500",
    },
    {
      id: 3,
      user: "Singer_B",
      action: "แก้ไขเนื้อเพลง",
      target: "เนื้อเพลงรัก (Draft)",
      time: "3 ชั่วโมงที่แล้ว",
      icon: Music,
      color: "text-pink-500",
    },
  ];

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
    );

  return (
    <div className="space-y-8 pb-10">
      {/* --- Section 1: Welcome Banner --- */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">
              สวัสดี, {profile?.display_name || "Creator"}! 👋
            </h1>
            {/* ป้าย Role */}
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10 uppercase tracking-wider">
              {profile?.main_role || "Member"}
            </span>
          </div>
          <p className="text-gray-300 opacity-90">
            วันนี้คุณมีงานที่ต้องดู 2 รายการ และมีเดดไลน์ที่ใกล้ถึง
          </p>
        </div>

        {/* ปุ่มสร้างโปรเจกต์ (โชว์เฉพาะ Producer) */}
        {profile?.is_producer && (
          <Link
            href="/dashboard/projects/create"
            className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            สร้างโปรเจกต์ใหม่
          </Link>
        )}
      </div>

      {/* --- Section 2: Quick Stats --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="งานที่ค้างอยู่"
          value="3"
          subtitle="Pending Tasks"
          icon={Clock}
          color="text-orange-500"
        />
        <StatCard
          title="โปรเจกต์ที่ดูแล"
          value="5"
          subtitle="Active Projects"
          icon={FileAudio}
          color="text-accent"
        />
        <StatCard
          title="พื้นที่จัดเก็บ (R2)"
          value="2.4 GB"
          subtitle="Used of 10 GB"
          icon={CheckCircle2}
          color="text-green-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- Section 3: My Tasks (Left Column) --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              งานของคุณ
            </h2>
            <button className="text-sm text-gray-500 hover:text-accent transition-colors">
              ดูทั้งหมด
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {mockTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      task.status === "urgent"
                        ? "bg-red-500"
                        : task.status === "done"
                        ? "bg-green-500"
                        : "bg-yellow-400"
                    }`}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-accent transition-colors">
                      {task.title}
                    </h3>
                    <p className="text-xs text-gray-500">{task.project}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-medium ${
                      task.status === "urgent"
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {task.due}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Section 4: Recent Activity (Right Column) --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            อัปเดตล่าสุด
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            {mockActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div
                  className={`mt-1 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center ${activity.color}`}
                >
                  <activity.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.user}{" "}
                    <span className="text-gray-500 font-normal text-xs">
                      {activity.action}
                    </span>
                  </p>
                  <p className="text-sm text-accent truncate">
                    {activity.target}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
            <button className="w-full mt-2 py-2 text-xs text-center text-gray-400 hover:text-accent border-t border-gray-50">
              ดูประวัติทั้งหมด
            </button>
          </div>

          {/* กล่อง Shortcut */}
          <div className="bg-primary-light/5 rounded-xl p-4 border border-primary-light/10">
            <h3 className="text-sm font-bold text-gray-700 mb-3">ทางลัด</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-2 bg-white rounded-lg text-xs font-medium text-gray-600 shadow-sm hover:shadow-md hover:text-accent transition-all text-center">
                📁 คลังไฟล์รวม
              </button>
              <button className="p-2 bg-white rounded-lg text-xs font-medium text-gray-600 shadow-sm hover:shadow-md hover:text-accent transition-all text-center">
                🎵 เนื้อเพลง
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component สำหรับการ์ด Stats (เพื่อให้โค้ดดูสะอาด)
function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-lg bg-gray-50 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
