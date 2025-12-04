"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  Music,
  Plus,
  Search,
  FileText,
  Copy,
  FolderOpen,
  Loader2,
  Globe,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { LyricBlock } from "@/components/lyrics/LyricEditor";

// --- Interfaces ---
interface ProjectData {
  id: number;
  title: string;
  slug?: string;
}

interface ScriptData {
  id: number;
  title: string;
  content: string;
  project_id: number | null;
  updated_at: string;
  projects?: ProjectData | null;
}

type FilterType = "all" | "in_project" | "no_project";

export default function GlobalLyricsPage() {
  // Data State
  const [scripts, setScripts] = useState<ScriptData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Modal State
  const [importTarget, setImportTarget] = useState<ScriptData | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("no_project");
  const [isImporting, setIsImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch Scripts
    const { data: scriptsData, error: scriptError } = await supabase
      .from("scripts")
      .select("*, projects(title, slug)")
      .order("updated_at", { ascending: false });

    if (scriptError) console.error(scriptError);

    // Fetch Projects
    const { data: projectsData, error: projectError } = await supabase
      .from("projects")
      .select("id, title")
      .order("created_at", { ascending: false });

    if (projectError) console.error(projectError);

    setScripts((scriptsData as unknown as ScriptData[]) || []);
    setProjects((projectsData as unknown as ProjectData[]) || []);
    setLoading(false);
  };

  const handleCreateNew = async () => {
    const { data, error } = await supabase
      .from("scripts")
      .insert({
        title: "เพลงใหม่ (No Project)",
        content: JSON.stringify([]),
        project_id: null,
      })
      .select()
      .single();

    if (error) {
      alert("สร้างเพลงไม่สำเร็จ: " + error.message);
      return;
    }

    if (data) {
      window.location.href = `/dashboard/lyrics/${data.id}`;
    }
  };

  const promptDelete = (id: number, title: string) => {
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await supabase
        .from("reference_links")
        .delete()
        .eq("script_id", deleteTarget.id);
      const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setScripts(scripts.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error: any) {
      alert("ลบไม่สำเร็จ: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImport = async () => {
    if (!importTarget) return;
    setIsImporting(true);

    try {
      const originalContent = importTarget.content;
      let parsedContent: LyricBlock[] = [];
      try {
        const raw = JSON.parse(originalContent);
        if (Array.isArray(raw)) {
          parsedContent = raw.map((block: any) => ({
            ...block,
            id: crypto.randomUUID(),
            singers: [],
            comments: [],
          }));
        }
      } catch (e) {
        console.error("JSON Parse error", e);
        parsedContent = [];
      }

      const targetProjectId =
        selectedProject === "no_project" ? null : parseInt(selectedProject);

      const { data: newScript, error } = await supabase
        .from("scripts")
        .insert({
          project_id: targetProjectId,
          title: `${importTarget.title} (Copy)`,
          content: JSON.stringify(parsedContent),
        })
        .select()
        .single();

      if (error) throw error;

      if (newScript) {
        const { data: originalLinks } = await supabase
          .from("reference_links")
          .select("title, url")
          .eq("script_id", importTarget.id);

        if (originalLinks && originalLinks.length > 0) {
          const newLinks = originalLinks.map((link) => ({
            script_id: newScript.id,
            title: link.title,
            url: link.url,
          }));
          await supabase.from("reference_links").insert(newLinks);
        }
      }

      setImportTarget(null);
      setSelectedProject("no_project");
      fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter Logic
  const filteredScripts = scripts.filter((s) => {
    const matchesSearch = s.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "in_project"
        ? s.project_id !== null
        : s.project_id === null;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex flex-col space-y-6 pb-10">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Music className="w-7 h-7 text-accent" /> คลังเนื้อเพลง
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            จัดการเนื้อเพลงทั้งหมด ทั้งในโปรเจกต์และเพลงอิสระ
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" /> เขียนเพลงใหม่
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl flex-shrink-0">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterType === "all"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilterType("in_project")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${
              filterType === "in_project"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" /> ในโปรเจกต์
          </button>
          <button
            onClick={() => setFilterType("no_project")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${
              filterType === "no_project"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> ไม่มีโปรเจกต์
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อเพลง..."
            className="w-full pl-10 pr-4 py-2.5 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white/50 rounded-2xl border border-gray-100/50">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : filteredScripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Music className="w-12 h-12 mb-3 opacity-20" />
            <p>ไม่พบเพลงที่ค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 p-2">
            {filteredScripts.map((script) => (
              <div
                key={script.id}
                className="group relative flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-200 cursor-pointer"
              >
                {/* 🔥 Overlay Link: ทำให้ทั้งการ์ดคลิกได้ */}
                <Link
                  href={`/dashboard/lyrics/${script.id}`}
                  className="absolute inset-0 z-0"
                />

                {/* Left: Info */}
                <div className="flex items-center gap-4 min-w-0 pointer-events-none">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      script.project_id
                        ? "bg-blue-50 text-blue-500"
                        : "bg-orange-50 text-orange-500"
                    }`}
                  >
                    {script.project_id ? (
                      <FolderOpen className="w-5 h-5" />
                    ) : (
                      <Music className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate pr-4 group-hover:text-accent transition-colors">
                      {script.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {script.project_id && script.projects ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          {script.projects.title}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">
                          ไม่มีโปรเจกต์
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        • อัปเดต{" "}
                        {new Date(script.updated_at).toLocaleDateString(
                          "th-TH"
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions (z-10 เพื่อให้กดได้) */}
                <div className="flex items-center gap-1 pl-4 relative z-10">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // ป้องกันการกด Link พื้นหลัง
                      setImportTarget(script);
                    }}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="ทำสำเนา"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // ป้องกันการกด Link พื้นหลัง
                      promptDelete(script.id, script.title);
                    }}
                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบเพลง"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Modals --- */}

      {/* Import Modal */}
      {importTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setImportTarget(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Copy className="w-5 h-5 text-accent" /> ทำสำเนาเพลง
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              คุณกำลังจะสร้างสำเนาของเพลง{" "}
              <strong>&quot;{importTarget.title}&quot;</strong>
            </p>

            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              เก็บไว้ที่ไหน?
            </label>
            <select
              className="w-full p-3 border border-gray-200 rounded-xl mb-6 outline-none focus:border-accent text-sm"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="no_project">
                📂 ไม่ระบุโปรเจกต์ (เก็บในคลังกลาง)
              </option>
              <option disabled>──────────</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.title}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setImportTarget(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex-1 py-2.5 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover disabled:opacity-50 flex justify-center items-center gap-2 transition-colors"
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                สร้างสำเนา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100 scale-100 animate-in zoom-in-95 duration-200 text-center relative">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">ลบเพลงนี้?</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6 leading-relaxed">
              คุณต้องการลบเพลง <br />
              <span className="font-bold text-gray-800">
                "{deleteTarget.title}"
              </span>{" "}
              <br />
              ใช่ไหม? (ไม่สามารถกู้คืนได้)
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>ลบถาวร</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
