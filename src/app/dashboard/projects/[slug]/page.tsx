"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Layout,
  FolderOpen,
  Music2,
  Settings,
  Loader2,
  Users,
} from "lucide-react";

// --- Import Component ของจริง ---
import BoardTab from "@/components/BoardTab";
import AssetsTab from "@/components/AssetsTab";
import LyricsTab from "@/components/LyricsTab";

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();

  // แปลง Slug กลับเป็นภาษาปกติ (เผื่อเป็นภาษาไทย)
  const slug = params.slug ? decodeURIComponent(params.slug as string) : null;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("board"); // ค่าเริ่มต้นเปิดที่หน้ากระดาน

  useEffect(() => {
    if (!slug) return;

    const fetchProjectDetails = async () => {
      // ดึงข้อมูลโปรเจกต์โดยใช้ Slug
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Project Error:", error);
        // ถ้าหาไม่เจอ หรือไม่มีสิทธิ์ ให้ดีดกลับไปหน้ารวม
        router.push("/dashboard/projects");
        return;
      }

      setProject(data);
      setLoading(false);
    };

    fetchProjectDetails();
  }, [slug, router]);

  if (loading)
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="animate-pulse">กำลังเข้าสู่ Workspace...</p>
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      {/* --- 1. Project Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link
              href="/dashboard/projects"
              className="hover:text-accent transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Projects
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600">Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {project.title}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wide ${
                project.status === "done"
                  ? "bg-green-50 border-green-100 text-green-600"
                  : project.status === "production"
                  ? "bg-blue-50 border-blue-100 text-blue-600"
                  : "bg-yellow-50 border-yellow-100 text-yellow-600"
              }`}
            >
              {project.status}
            </span>
          </div>
        </div>

        {/* ปุ่มจัดการทีม (Mockup) */}
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
          <Users className="w-4 h-4" />
          <span>สมาชิกทีม</span>
        </button>
      </div>

      {/* --- 2. Tabs Navigation --- */}
      <div className="flex items-center gap-1 bg-gray-100/80 p-1.5 rounded-xl w-fit mb-6 shadow-inner">
        <TabButton
          active={activeTab === "board"}
          onClick={() => setActiveTab("board")}
          icon={Layout}
          label="Board"
        />
        <TabButton
          active={activeTab === "assets"}
          onClick={() => setActiveTab("assets")}
          icon={FolderOpen}
          label="Files"
        />
        <TabButton
          active={activeTab === "lyrics"}
          onClick={() => setActiveTab("lyrics")}
          icon={Music2}
          label="Lyrics"
        />
        <div className="w-px h-5 bg-gray-300 mx-2" />
        <TabButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={Settings}
          label="Settings"
        />
      </div>

      {/* --- 3. Content Area --- */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
        {/* หน้ากระดาน (ส่ง ID โปรเจกต์เข้าไปให้ Component) */}
        {activeTab === "board" && <BoardTab projectId={project.id} />}

        {/* หน้าอื่นๆ */}
        {activeTab === "assets" && <AssetsTab projectId={project.id} />}
        {activeTab === "lyrics" && <LyricsTab projectId={project.id} />}

        {/* หน้า Settings Mockup */}
        {activeTab === "settings" && (
          <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              ตั้งค่าโปรเจกต์
            </h2>
            <p className="text-gray-500">
              คุณสามารถแก้ไขชื่อ วันส่งงาน หรือลบโปรเจกต์ได้ที่นี่ (เร็วๆ นี้)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Component ปุ่ม Tab
function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${
          active
            ? "bg-white text-accent shadow-sm ring-1 ring-black/5 scale-100"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 scale-[0.98]"
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
