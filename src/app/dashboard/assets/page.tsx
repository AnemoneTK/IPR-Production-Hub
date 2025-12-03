"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  Filter,
  Download,
  FileAudio,
  FileImage,
  File as FileIcon,
  Loader2,
  Music4,
  Image as ImageIcon,
  Disc,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

// Interface
interface FileData {
  id: number;
  name: string;
  file_url: string;
  file_type: string;
  size: number;
  created_at: string;
  projects: { title: string };
  profiles: { display_name: string };
}

interface ProjectData {
  id: number;
  title: string;
}

export default function GlobalAssetsPage() {
  // --- States ---
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Rename States
  const [editingItem, setEditingItem] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Delete Modal States
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    key: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "all" | "image" | "audio" | "mixed"
  >("all");

  // --- 1. Fetch Data ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, title")
        .order("created_at", { ascending: false });
      setProjects(projectData || []);
      await fetchFiles();
    };
    initData();
  }, []);

  // --- 2. Fetch Files ---
  const fetchFiles = async () => {
    setLoading(true);
    let query = supabase
      .from("files")
      .select("*, projects(title), profiles(display_name)")
      .order("created_at", { ascending: false });

    if (selectedProject !== "all")
      query = query.eq("project_id", selectedProject);
    if (searchTerm.trim()) query = query.ilike("name", `%${searchTerm}%`);

    if (activeTab === "image") query = query.ilike("file_type", "%image%");
    else if (activeTab === "audio") query = query.ilike("file_type", "%audio%");
    else if (activeTab === "mixed")
      query = query
        .ilike("file_type", "%audio%")
        .or("name.ilike.%mix%,name.ilike.%master%,name.ilike.%final%");

    const { data, error } = await query;
    if (error) console.error(error);
    else setFiles((data as any[]) || []);

    setLoading(false);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchFiles();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedProject, activeTab]);

  // --- 3. Rename Logic ---
  const handleRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    try {
      const { error } = await supabase
        .from("files")
        .update({ name: editingItem.name })
        .eq("id", editingItem.id);
      if (error) throw error;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === editingItem.id ? { ...f, name: editingItem.name } : f
        )
      );
      setEditingItem(null);
    } catch (error: any) {
      alert("เปลี่ยนชื่อไม่สำเร็จ: " + error.message);
    }
  };

  // --- 4. Delete Logic ---
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch("/api/delete-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKeys: [deleteTarget.key] }),
      });
      const { error } = await supabase
        .from("files")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- 5. Download ---
  const handleDownload = async (fileKey: string, originalName: string) => {
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, originalName }),
      });
      const { url } = await response.json();
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", originalName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch {
      alert("ดาวน์โหลดไม่สำเร็จ");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" /> คลังไฟล์รวม (Global
            Assets)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            รวมไฟล์ทั้งหมดจากทุกโปรเจกต์ไว้ที่นี่
          </p>
        </div>
      </div>

      {/* --- Filter Bar (Responsive) --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4 items-center justify-between">
        {/* Tabs (Scrollable) */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full xl:w-auto overflow-x-auto pb-1 xl:pb-1">
          {[
            { id: "all", label: "ทั้งหมด", icon: FileIcon },
            { id: "image", label: "รูปภาพ", icon: ImageIcon },
            { id: "audio", label: "เสียงดิบ", icon: Music4 },
            { id: "mixed", label: "มิกซ์แล้ว", icon: Disc },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-accent shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Filters & Toggles */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
          <select
            className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-accent outline-none text-gray-700"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">📁 ทุกโปรเจกต์</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="ค้นหาชื่อไฟล์..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-accent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
          <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>ไม่พบไฟล์ที่ค้นหา</p>
        </div>
      ) : (
        <>
          {/* 🔥 GRID MODE (Mobile Friendly) */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group bg-white p-3 md:p-4 rounded-xl border border-gray-100 hover:border-accent/50 hover:shadow-md transition-all flex flex-col relative"
                >
                  <div className="h-32 md:h-40 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative border border-gray-100">
                    <FileThumbnail file={file} />

                    {/* Desktop Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-2 backdrop-blur-sm">
                      <button
                        onClick={() => handleDownload(file.file_url, file.name)}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        title="ดาวน์โหลด"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingItem({ id: file.id, name: file.name })
                        }
                        className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50"
                        title="เปลี่ยนชื่อ"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            id: file.id,
                            name: file.name,
                            key: file.file_url,
                          })
                        }
                        className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingItem?.id === file.id ? (
                      <form
                        onSubmit={handleRename}
                        className="flex items-center gap-1 mb-1"
                      >
                        <input
                          autoFocus
                          type="text"
                          className="w-full text-xs p-1 border border-accent rounded outline-none"
                          value={editingItem.name}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              name: e.target.value,
                            })
                          }
                          onBlur={() => handleRename()}
                        />
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className="font-semibold text-gray-800 text-sm truncate"
                          title={file.name}
                        >
                          {file.name}
                        </h3>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase flex-shrink-0 hidden sm:inline">
                          {file.file_type.split("/")[1] || "FILE"}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 truncate mb-1 flex items-center gap-1">
                      📁 {file.projects?.title}
                    </p>

                    {/* Desktop Info */}
                    <div className="hidden md:flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-50 pt-2 mt-auto">
                      <span>{file.profiles?.display_name}</span>
                      <span>{formatSize(file.size)}</span>
                    </div>

                    {/* Mobile Actions (Visible) */}
                    <div className="md:hidden flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                      <button
                        onClick={() => handleDownload(file.file_url, file.name)}
                        className="text-gray-600 p-1"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingItem({ id: file.id, name: file.name })
                        }
                        className="text-blue-600 p-1"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            id: file.id,
                            name: file.name,
                            key: file.file_url,
                          })
                        }
                        className="text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 🔥 LIST MODE (Scrollable) */}
          {viewMode === "list" && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 w-12"></th>
                      <th className="px-4 py-3">ชื่อไฟล์</th>
                      <th className="px-4 py-3 w-40">โปรเจกต์</th>
                      <th className="px-4 py-3 w-28">ขนาด</th>
                      <th className="px-4 py-3 w-32">ผู้โหลด</th>
                      <th className="px-4 py-3 w-28">วันที่</th>
                      <th className="px-4 py-3 w-32 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {files.map((file) => (
                      <tr
                        key={file.id}
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        <td className="px-4 py-3 text-gray-400">
                          {getFileIcon(file, "w-5 h-5")}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700 max-w-[200px]">
                          {editingItem?.id === file.id ? (
                            <form
                              onSubmit={handleRename}
                              className="flex items-center gap-2"
                            >
                              <input
                                autoFocus
                                type="text"
                                className="w-full px-2 py-1 border border-accent rounded text-sm outline-none"
                                value={editingItem.name}
                                onChange={(e) =>
                                  setEditingItem({
                                    ...editingItem,
                                    name: e.target.value,
                                  })
                                }
                              />
                              <button type="submit" className="text-green-600">
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="text-gray-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </form>
                          ) : (
                            <span className="truncate block" title={file.name}>
                              {file.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 truncate">
                          {file.projects?.title}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {formatSize(file.size)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {file.profiles?.display_name}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(file.created_at).toLocaleDateString(
                            "th-TH"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                          {/* Mobile: Show Always / Desktop: Show on Hover */}
                          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() =>
                                setEditingItem({ id: file.id, name: file.name })
                              }
                              className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                              title="เปลี่ยนชื่อ"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDownload(file.file_url, file.name)
                              }
                              className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-blue-50"
                              title="ดาวน์โหลด"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  id: file.id,
                                  name: file.name,
                                  key: file.file_url,
                                })
                              }
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                              title="ลบไฟล์"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900">
              ยืนยันการลบไฟล์?
            </h3>
            <p className="text-sm text-center text-gray-500 mt-2 mb-6 leading-relaxed">
              คุณกำลังจะลบ{" "}
              <span className="font-bold text-gray-800">
                "{deleteTarget.name}"
              </span>{" "}
              <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
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

// Helpers
const getFileIcon = (file: FileData, className = "w-6 h-6") => {
  if (file.file_type.includes("image"))
    return <ImageIcon className={`${className} text-purple-500`} />;
  const isMix =
    file.name.toLowerCase().includes("mix") ||
    file.name.toLowerCase().includes("master");
  if (file.file_type.includes("audio"))
    return isMix ? (
      <Disc className={`${className} text-orange-500`} />
    ) : (
      <Music4 className={`${className} text-blue-500`} />
    );
  return <FileIcon className={`${className} text-gray-400`} />;
};

const FileThumbnail = ({ file }: { file: FileData }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (file.file_type.includes("image")) {
      fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey: file.file_url,
          originalName: file.name,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.url) setImageUrl(data.url);
        })
        .catch((err) => console.error(err));
    }
  }, [file]);

  if (file.file_type.includes("image") && imageUrl)
    return (
      <img
        src={imageUrl}
        alt={file.name}
        className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
      />
    );

  const isMix =
    file.name.toLowerCase().includes("mix") ||
    file.name.toLowerCase().includes("master");
  if (file.file_type.includes("audio")) {
    return (
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isMix ? "bg-orange-100 text-orange-500" : "bg-blue-100 text-blue-500"
        }`}
      >
        {isMix ? <Disc className="w-6 h-6" /> : <Music4 className="w-6 h-6" />}
      </div>
    );
  }
  return <FileIcon className="w-10 h-10 text-gray-300" />;
};
