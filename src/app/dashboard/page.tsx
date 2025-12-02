"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  Plus,
  Clock,
  CheckCircle2,
  FileAudio,
  FolderKanban,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // State สถิติ (ลบ storageUsed ออกแล้ว)
  const [stats, setStats] = useState({
    pendingTasks: 0,
    activeProjects: 0,
  });

  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ดึง Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // หา Project IDs ของเรา
      const { data: myMemberships } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);
      const projectIds = myMemberships?.map((m) => m.project_id) || [];

      if (projectIds.length > 0) {
        // A. จำนวนโปรเจกต์
        const activeProjects = projectIds.length;

        // B. งานที่ค้าง
        const { count: pendingCount } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("project_id", projectIds)
          .neq("status", "done");

        setStats({
          activeProjects,
          pendingTasks: pendingCount || 0,
        });

        // C. ไฟล์ล่าสุด
        const { data: recentFilesData } = await supabase
          .from("files")
          .select("*, profiles(display_name), projects(title)")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentFiles(recentFilesData || []);

        // D. งานล่าสุด
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("*, projects(title)")
          .in("project_id", projectIds)
          .neq("status", "done")
          .order("created_at", { ascending: false })
          .limit(4);
        setMyTasks(tasksData || []);
      }

      setLoading(false);
    };
    fetchDashboardData();
  }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <FolderKanban className="w-40 h-40 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">
              สวัสดี, {profile?.display_name || "Creator"}! 👋
            </h1>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10 uppercase tracking-wider">
              {profile?.main_role || "Member"}
            </span>
          </div>
          <p className="text-gray-300 opacity-90">
            ระบบพร้อมทำงานแล้ว วันนี้คุณมีงานค้าง {stats.pendingTasks} รายการ
          </p>
        </div>

        {profile?.is_producer && (
          <Link
            href="/dashboard/projects/create"
            className="relative z-10 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            สร้างโปรเจกต์ใหม่
          </Link>
        )}
      </div>

      {/* Quick Stats (เหลือ 2 การ์ด ปรับ Grid เป็น 2 ช่อง) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="งานที่ค้างอยู่"
          value={stats.pendingTasks}
          subtitle="Pending Tasks"
          icon={Clock}
          color="text-orange-500"
        />
        <StatCard
          title="โปรเจกต์ที่ดูแล"
          value={stats.activeProjects}
          subtitle="Active Projects"
          icon={FolderKanban}
          color="text-accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              งานล่าสุด
            </h2>
            <Link
              href="/dashboard/projects"
              className="text-sm text-gray-500 hover:text-accent transition-colors flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {myTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                ยังไม่มีงานที่ค้างอยู่
              </div>
            ) : (
              myTasks.map((task) => (
                <Link
                  href={`/dashboard/projects/${
                    task.projects?.slug || task.project_id
                  }`}
                  key={task.id}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="p-4 border-b border-gray-50 last:border-0 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          task.status === "done"
                            ? "bg-green-500"
                            : task.status === "revision"
                            ? "bg-red-500"
                            : "bg-yellow-400"
                        }`}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900 group-hover:text-accent transition-colors">
                          {task.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {task.projects?.title || "Unknown Project"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 rounded-md font-medium bg-gray-100 text-gray-600">
                        {task.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-gray-400" />
            อัปโหลดล่าสุด
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            {recentFiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                ยังไม่มีไฟล์อัปโหลด
              </div>
            ) : (
              recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="mt-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-accent">
                    <FileAudio className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      โดย {file.profiles?.display_name} • {file.projects?.title}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(file.created_at).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
