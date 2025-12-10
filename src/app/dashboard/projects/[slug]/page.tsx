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
  AudioWaveform,
} from "lucide-react";

// Import Components
import BoardTab from "@/components/BoardTab";
import AssetsTab from "@/components/AssetsTab";
import LyricsTab from "@/components/LyricsTab";
import SettingsTab from "@/components/SettingsTab";
import MemberModal from "@/components/MemberModal";
import ArrangementTab from "@/components/ArrangementTab";

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug ? decodeURIComponent(params.slug as string) : null;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  const [activeTab, setActiveTab] = useState("board");
  const [showMemberModal, setShowMemberModal] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!slug) return;

    const fetchProjectDetails = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Project Error:", error);
        router.push("/dashboard/projects");
        return;
      }

      setProject(data);
      setLoading(false);
    };

    fetchProjectDetails();
  }, [slug, router]);

  const handleCloseModal = () => {
    setShowMemberModal(false);
    setRefreshKey((prev) => prev + 1);
  };

  if (loading)
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="animate-pulse text-primary-light">
          กำลังเข้าสู่ Workspace...
        </p>
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary-light mb-1">
            <Link
              href="/dashboard/projects"
              className="hover:text-accent transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Projects
            </Link>
            <span className="opacity-50">/</span>
            <span className="opacity-70">Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">{project.title}</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wide ${
                project.status === "done"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent"
                  : project.status === "production"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-transparent"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-transparent"
              }`}
            >
              {project.status}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowMemberModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-light bg-surface border border-border rounded-xl hover:bg-surface-subtle hover:text-primary transition-colors shadow-sm"
        >
          <Users className="w-4 h-4" />
          <span>สมาชิกทีม</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      {/* ปรับสีพื้นหลังแถบ Tab ให้ใช้ตัวแปร surface-subtle เพื่อรองรับ Dark Mode */}
      <div className="flex items-center gap-1 bg-surface-subtle border border-border p-1.5 rounded-xl w-fit mb-6 shadow-inner overflow-x-auto max-w-full">
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

        <TabButton
          active={activeTab === "arrange"}
          onClick={() => setActiveTab("arrange")}
          icon={AudioWaveform}
          label="Arrange"
        />

        <div className="w-px h-5 bg-border mx-2 flex-shrink-0" />

        <TabButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={Settings}
          label="Settings"
        />
      </div>

      {/* Content Area */}
      {/* ใช้ bg-surface เพื่อให้เป็นสีการ์ดในโหมดมืด */}
      <div className="flex-1 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden relative flex flex-col">
        {activeTab === "board" && (
          <BoardTab key={refreshKey} projectId={project.id} />
        )}

        {(activeTab === "assets" || activeTab === "settings") && (
          <div className="flex-1 overflow-y-auto">
            {activeTab === "assets" && (
              <AssetsTab key={refreshKey} projectId={project.id} />
            )}
            {activeTab === "settings" && (
              <SettingsTab key={refreshKey} project={project} />
            )}
          </div>
        )}

        {activeTab === "lyrics" && (
          <LyricsTab key={refreshKey} projectId={project.id} />
        )}

        {activeTab === "arrange" && (
          <ArrangementTab key={refreshKey} projectId={project.id} />
        )}
      </div>

      {showMemberModal && (
        <MemberModal projectId={project.id} onClose={handleCloseModal} />
      )}
    </div>
  );
}

// Sub-component สำหรับปุ่ม Tab
function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
        ${
          active
            ? "bg-surface text-accent shadow-sm ring-1 ring-border scale-100"
            : "text-primary-light hover:text-primary hover:bg-surface/50 scale-[0.98]"
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
