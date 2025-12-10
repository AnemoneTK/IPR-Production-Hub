"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  FileText,
  Type,
  Music,
  Copy,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";

const generateSlug = (title: string) => {
  return title.toLowerCase().trim().replace(/ /g, "-");
};

interface ScriptOption {
  id: number;
  title: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Data for Form
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
  });

  // Song Options State
  const [songMode, setSongMode] = useState<"new" | "import">("new");
  const [availableScripts, setAvailableScripts] = useState<ScriptOption[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [songTitle, setSongTitle] = useState("");

  // Load scripts on mount
  useEffect(() => {
    const fetchScripts = async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, title")
        .order("updated_at", { ascending: false });
      setAvailableScripts(data || []);
    };
    fetchScripts();
  }, []);

  useEffect(() => {
    if (songMode === "new") {
      setSongTitle(formData.title);
    }
  }, [formData.title, songMode]);

  useEffect(() => {
    if (songMode === "import" && selectedScriptId) {
      const script = availableScripts.find(
        (s) => s.id.toString() === selectedScriptId
      );
      if (script) setSongTitle(script.title);
    }
  }, [selectedScriptId, availableScripts, songMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      const slug = generateSlug(formData.title);

      // 1. Create Project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: formData.title,
          description: formData.description,
          deadline: formData.deadline
            ? new Date(formData.deadline).toISOString()
            : null,
          created_by: user.id,
          status: "planning",
          slug: slug,
        })
        .select()
        .single();

      if (projectError) {
        if (projectError.code === "23505") throw new Error("ชื่อโปรเจกต์ซ้ำ");
        throw projectError;
      }

      // 2. Add Member
      await supabase.from("project_members").insert({
        project_id: projectData.id,
        user_id: user.id,
        roles: ["producer", "mixer"],
      });

      // 3. Handle Script
      let scriptContent = JSON.stringify([]);

      if (songMode === "import" && selectedScriptId) {
        const { data: sourceScript } = await supabase
          .from("scripts")
          .select("content, id")
          .eq("id", selectedScriptId)
          .single();

        if (sourceScript) {
          try {
            const raw = JSON.parse(sourceScript.content);
            const cleanContent = Array.isArray(raw)
              ? raw.map((b: any) => ({
                  ...b,
                  id: crypto.randomUUID(),
                  singers: [],
                  comments: [],
                }))
              : [];
            scriptContent = JSON.stringify(cleanContent);
          } catch {
            scriptContent = JSON.stringify([]);
          }
        }
      }

      const { data: newScript } = await supabase
        .from("scripts")
        .insert({
          project_id: projectData.id,
          title: songTitle || formData.title,
          content: scriptContent,
          updated_by: user.id,
        })
        .select()
        .single();

      if (songMode === "import" && selectedScriptId && newScript) {
        const { data: originalLinks } = await supabase
          .from("reference_links")
          .select("title, url")
          .eq("script_id", selectedScriptId);

        if (originalLinks && originalLinks.length > 0) {
          const newLinks = originalLinks.map((l) => ({
            script_id: newScript.id,
            title: l.title,
            url: l.url,
          }));
          await supabase.from("reference_links").insert(newLinks);
        }
      }

      router.push(`/dashboard/projects/${projectData.slug}`);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-primary-light hover:text-accent mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
      </Link>

      {/* 🔥 แก้ bg-white -> bg-surface, border-gray... -> border-border */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-subtle/50">
          <h1 className="text-xl font-bold text-primary">
            สร้างโปรเจกต์ใหม่ 🚀
          </h1>
          <p className="text-sm text-primary-light mt-1">
            เริ่มวางแผนงานใหม่ของคุณที่นี่
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Project Info */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide border-b border-border pb-2">
                ข้อมูลโปรเจกต์
              </h3>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary-light" /> ชื่อโปรเจกต์{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  // 🔥 แก้ input style ให้รองรับ dark mode
                  className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-primary placeholder:text-primary-light/50 focus:border-accent focus:outline-none transition-colors"
                  placeholder="เช่น: Cover เพลงรัก (Final)"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-light" /> รายละเอียด
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-primary placeholder:text-primary-light/50 focus:border-accent focus:outline-none transition-colors resize-none"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* Deadline Input */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-light" /> Deadline
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-primary placeholder:text-primary-light/50 focus:border-accent focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Section 2: Song Setup */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide border-b border-border pb-2 flex items-center gap-2">
                <Music className="w-4 h-4 text-accent" /> ตั้งค่าเพลง /
                เนื้อร้อง
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Button: New Song */}
                <button
                  type="button"
                  onClick={() => setSongMode("new")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    songMode === "new"
                      ? "border-accent bg-accent/10" // 🔥 ใช้ bg-accent/10 แทน bg-blue-50/50 เพื่อให้เข้ากับ Dark Mode
                      : "border-border hover:border-primary-light/50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-primary mb-1">
                    <PlusCircle
                      className={`w-5 h-5 ${
                        songMode === "new"
                          ? "text-accent"
                          : "text-primary-light"
                      }`}
                    />{" "}
                    สร้างเพลงใหม่
                  </div>
                  <p className="text-xs text-primary-light ml-7">
                    เริ่มจากหน้าเปล่า
                  </p>
                </button>

                {/* Button: Import Song */}
                <button
                  type="button"
                  onClick={() => setSongMode("import")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    songMode === "import"
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-primary-light/50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-primary mb-1">
                    <Copy
                      className={`w-5 h-5 ${
                        songMode === "import"
                          ? "text-accent"
                          : "text-primary-light"
                      }`}
                    />{" "}
                    Import จากคลัง
                  </div>
                  <p className="text-xs text-primary-light ml-7">
                    ดึงเพลงที่มีอยู่แล้วมาใช้
                  </p>
                </button>
              </div>

              {/* Import Selection */}
              {songMode === "import" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-primary mb-2">
                    เลือกเพลงต้นฉบับ
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-primary focus:border-accent focus:outline-none"
                    value={selectedScriptId}
                    onChange={(e) => setSelectedScriptId(e.target.value)}
                  >
                    <option value="">-- เลือกเพลง --</option>
                    {availableScripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Song Title Input */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  ชื่อเพลงในโปรเจกต์นี้
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-primary placeholder:text-primary-light/50 focus:border-accent focus:outline-none"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="ชื่อเพลง..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-border flex justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 rounded-xl text-primary-light hover:bg-surface-subtle font-medium transition-colors"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-accent hover:bg-accent-hover text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-accent/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading && <Loader2 className="animate-spin w-4 h-4" />}
                สร้างโปรเจกต์
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
