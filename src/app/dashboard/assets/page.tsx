"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  Filter,
  Download,
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
  Eye,
  UploadCloud,
  Music,
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

  // Preview States
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [previewAudio, setPreviewAudio] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // --- 3. Upload Logic ---
  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        const response = await fetch("/api/upload", {
          method: "POST",
          body: JSON.stringify({ name: file.name, type: file.type }),
        });
        const { url, fileName } = await response.json();

        await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        const targetProjectId =
          selectedProject === "all" ? null : parseInt(selectedProject);

        await supabase.from("files").insert({
          project_id: targetProjectId,
          folder_id: null,
          name: file.name,
          file_url: fileName,
          file_type: file.type,
          size: file.size,
          uploaded_by: user.id,
        });
      }
      fetchFiles();
    } catch (error: any) {
      alert("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  // --- 4. Rename Logic ---
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

  // --- 5. Delete Logic ---
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

  // --- 6. Download ---
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

  // --- 7. Click/Preview Logic ---
  const handleFileClick = async (file: FileData) => {
    // 🖼️ รูปภาพ
    if (file.file_type.includes("image")) {
      setIsPreviewLoading(true);
      setPreviewImage({ url: "", name: file.name });

      try {
        const response = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileKey: file.file_url,
            originalName: file.name,
          }),
        });
        const { url } = await response.json();
        if (url) setPreviewImage({ url, name: file.name });
      } catch (error) {
        console.error("Preview failed", error);
        alert("เปิดรูปภาพไม่สำเร็จ");
        setPreviewImage(null);
      } finally {
        setIsPreviewLoading(false);
      }
    }
    // 🎵 เสียง
    else if (file.file_type.includes("audio")) {
      setIsPreviewLoading(true);
      setPreviewAudio({ url: "", name: file.name });

      try {
        const response = await fetch("/api/get-signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: file.file_url }),
        });
        const { signedUrl } = await response.json();

        if (signedUrl) setPreviewAudio({ url: signedUrl, name: file.name });
        else throw new Error("No signed URL");
      } catch (error) {
        console.error("Preview failed", error);
        alert("เปิดไฟล์เสียงไม่สำเร็จ");
        setPreviewAudio(null);
      } finally {
        setIsPreviewLoading(false);
      }
    } else {
      handleDownload(file.file_url, file.name);
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
    <div
      className={`space-y-6 pb-10 min-h-screen relative transition-colors ${
        isDragging ? "bg-accent/10" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent/20 border-4 border-accent border-dashed m-4 rounded-xl backdrop-blur-sm pointer-events-none">
          <div className="text-center text-accent animate-bounce">
            <UploadCloud className="w-16 h-16 mx-auto mb-2" />
            <h3 className="text-2xl font-bold">วางไฟล์เพื่ออัปโหลด</h3>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />

      {/* 🔥 Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] h-screen w-screen bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="absolute top-4 right-4 flex items-center gap-2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {previewImage.url && (
              <a
                href={previewImage.url}
                download={previewImage.name}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title="ดาวน์โหลดต้นฉบับ"
              >
                <Download className="w-6 h-6" />
              </a>
            )}
            <button
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            {isPreviewLoading && !previewImage.url ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : (
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[90vh] object-contain shadow-2xl pointer-events-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>

          <div className="absolute bottom-8 text-white font-medium text-lg drop-shadow-md bg-black/60 px-4 py-2 rounded-full max-w-[80%] truncate pointer-events-none">
            {previewImage.name}
          </div>
        </div>
      )}

      {/* 🔥 Audio Player Page */}
      {previewAudio && (
        <div
          className="fixed inset-0 z-[100] h-screen w-screen bg-black/95 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-10 duration-300"
          onClick={() => setPreviewAudio(null)}
        >
          <div
            className="absolute top-6 right-6 flex items-center gap-3 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {previewAudio.url && (
              <a
                href={previewAudio.url}
                download={previewAudio.name}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <Download className="w-6 h-6" />
              </a>
            )}
            <button
              onClick={() => setPreviewAudio(null)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="flex flex-col items-center w-full max-w-lg text-center space-y-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-48 h-48 md:w-72 md:h-72 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-700 shadow-2xl flex items-center justify-center relative ${
                isPreviewLoading ? "" : "animate-spin-slow"
              }`}
            >
              <div className="absolute inset-0 rounded-full border-2 border-white/10 m-4"></div>
              <div className="absolute inset-0 rounded-full border border-white/5 m-8"></div>
              <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-inner">
                <Music className="w-10 h-10 text-white" />
              </div>
            </div>

            <div className="space-y-2 w-full px-4">
              {isPreviewLoading && !previewAudio.url ? (
                <div className="flex justify-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold text-white truncate">
                    {previewAudio.name}
                  </h2>
                  <p className="text-gray-400 text-sm">Audio Preview</p>
                </>
              )}
            </div>

            {previewAudio.url && (
              <div className="w-full bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/5">
                <audio
                  key={previewAudio.url}
                  controls
                  autoPlay
                  className="w-full h-12"
                  src={previewAudio.url}
                  controlsList="nodownload"
                >
                  Browser ของคุณไม่รองรับการเล่นเสียง
                </audio>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" /> คลังไฟล์รวม (Global
            Assets)
          </h1>
          <p className="text-primary-light text-sm mt-1">
            รวมไฟล์ทั้งหมดจากทุกโปรเจกต์ไว้ที่นี่
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl shadow-sm disabled:opacity-50 transition-all active:scale-95"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
          <span>{isUploading ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}</span>
        </button>
      </div>

      {/* --- Filter Bar --- */}
      {/* 🔥 แก้: bg-white -> bg-surface, border-gray... -> border-border */}
      <div className="bg-surface p-4 rounded-2xl shadow-sm border border-border flex flex-col xl:flex-row gap-4 items-center justify-between sticky top-2 z-20">
        <div className="flex bg-surface-subtle border border-border p-1 rounded-xl w-full xl:w-auto overflow-x-auto pb-1 xl:pb-1 no-scrollbar">
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
                  ? "bg-surface text-accent shadow-sm"
                  : "text-primary-light hover:text-primary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
          <select
            className="w-full sm:w-auto px-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-sm focus:border-accent outline-none text-primary cursor-pointer"
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
            <Search className="absolute left-3 top-2.5 text-primary-light w-4 h-4" />
            <input
              type="text"
              placeholder="ค้นหาชื่อไฟล์..."
              className="w-full pl-9 pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-sm focus:border-accent outline-none text-primary placeholder:text-primary-light/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-surface-subtle border border-border p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-primary-light hover:text-primary"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-primary-light hover:text-primary"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-primary-light">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border text-primary-light">
          <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>ไม่พบไฟล์ที่ค้นหา</p>
        </div>
      ) : (
        <>
          {/* 🔥 GRID MODE */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group bg-surface p-3 md:p-4 rounded-xl border border-border hover:border-accent/50 hover:shadow-md dark:hover:shadow-none transition-all flex flex-col relative"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-32 md:h-40 bg-surface-subtle rounded-lg mb-3 flex items-center justify-center overflow-hidden relative border border-border cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    <FileThumbnail file={file} />

                    {/* Desktop Overlay */}
                    <div
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-2 backdrop-blur-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDownload(file.file_url, file.name)}
                        className="p-2 bg-surface rounded-full text-primary hover:bg-surface-subtle"
                        title="ดาวน์โหลด"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() =>
                          setEditingItem({ id: file.id, name: file.name })
                        }
                        className="p-2 bg-surface rounded-full text-accent hover:bg-surface-subtle"
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
                        className="p-2 bg-surface rounded-full text-red-500 hover:bg-surface-subtle"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    {editingItem?.id === file.id ? (
                      <form
                        onSubmit={handleRename}
                        className="flex items-center gap-1 mb-1"
                      >
                        <input
                          autoFocus
                          type="text"
                          className="w-full text-xs p-1 border border-accent bg-surface text-primary rounded outline-none"
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
                          className="font-semibold text-primary text-sm truncate cursor-pointer hover:text-accent"
                          title={file.name}
                          onClick={() => handleFileClick(file)}
                        >
                          {file.name}
                        </h3>
                        <span className="text-[10px] bg-surface-subtle text-primary-light border border-border px-1.5 py-0.5 rounded uppercase flex-shrink-0 hidden sm:inline">
                          {file.file_type.split("/")[1] || "FILE"}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-primary-light truncate mb-1 flex items-center gap-1">
                      📁 {file.projects?.title}
                    </p>
                    <div className="hidden md:flex items-center justify-between text-[10px] text-primary-light border-t border-border pt-2 mt-auto">
                      <span>{file.profiles?.display_name}</span>
                      <span>{formatSize(file.size)}</span>
                    </div>
                    {/* Mobile Actions */}
                    <div className="md:hidden flex justify-between items-center mt-2 pt-2 border-t border-border">
                      <button
                        onClick={() => handleDownload(file.file_url, file.name)}
                        className="text-primary-light p-2 hover:bg-surface-subtle rounded"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingItem({ id: file.id, name: file.name })
                        }
                        className="text-accent p-2 hover:bg-surface-subtle rounded"
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
                        className="text-red-500 p-2 hover:bg-surface-subtle rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[700px]">
                  <thead className="bg-surface-subtle text-primary-light font-medium border-b border-border">
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
                  <tbody className="divide-y divide-border">
                    {files.map((file) => (
                      <tr
                        key={file.id}
                        className="hover:bg-surface-subtle group transition-colors cursor-pointer"
                        onClick={() => handleFileClick(file)}
                      >
                        <td className="px-4 py-3 text-primary-light">
                          {getFileIcon(file)}
                        </td>
                        <td className="px-4 py-3 font-medium text-primary max-w-[200px]">
                          {editingItem?.id === file.id ? (
                            <form
                              onSubmit={handleRename}
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                autoFocus
                                type="text"
                                className="w-full px-2 py-1 bg-surface border border-accent rounded text-sm outline-none text-primary"
                                value={editingItem.name}
                                onChange={(e) =>
                                  setEditingItem({
                                    ...editingItem,
                                    name: e.target.value,
                                  })
                                }
                              />
                              <button type="submit" className="text-green-500">
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="text-primary-light"
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
                        <td className="px-4 py-3 text-primary-light truncate">
                          {file.projects?.title}
                        </td>
                        <td className="px-4 py-3 text-primary-light font-mono text-xs">
                          {formatSize(file.size)}
                        </td>
                        <td className="px-4 py-3 text-primary-light">
                          {file.profiles?.display_name}
                        </td>
                        <td className="px-4 py-3 text-primary-light text-xs">
                          {new Date(file.created_at).toLocaleDateString(
                            "th-TH"
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-right flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              handleDownload(file.file_url, file.name)
                            }
                            className="p-1.5 text-primary-light hover:text-accent rounded-lg hover:bg-surface-subtle"
                            title="ดาวน์โหลด"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setEditingItem({ id: file.id, name: file.name })
                            }
                            className="p-1.5 text-primary-light hover:text-accent rounded-lg hover:bg-surface-subtle"
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
                            className="p-1.5 text-primary-light hover:text-red-500 rounded-lg hover:bg-surface-subtle"
                            title="ลบไฟล์"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100 dark:border-red-900/50 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-primary">
              ยืนยันการลบไฟล์?
            </h3>
            <p className="text-sm text-center text-primary-light mt-2 mb-6 leading-relaxed">
              คุณกำลังจะลบ{" "}
              <span className="font-bold text-primary">
                "{deleteTarget.name}"
              </span>{" "}
              <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-surface-subtle text-primary font-medium rounded-xl hover:bg-border transition-colors"
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
    return (
      <ImageIcon
        className={`${className} text-purple-500 dark:text-purple-400`}
      />
    );
  const isMix =
    file.name.toLowerCase().includes("mix") ||
    file.name.toLowerCase().includes("master");
  if (file.file_type.includes("audio"))
    return isMix ? (
      <Disc className={`${className} text-orange-500 dark:text-orange-400`} />
    ) : (
      <Music4 className={`${className} text-blue-500 dark:text-blue-400`} />
    );
  return <FileIcon className={`${className} text-primary-light`} />;
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
  if (file.file_type.includes("audio"))
    return (
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isMix
            ? "bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-300"
            : "bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
        }`}
      >
        {isMix ? <Disc className="w-6 h-6" /> : <Music4 className="w-6 h-6" />}
      </div>
    );
  return <FileIcon className="w-10 h-10 text-primary-light/50" />;
};
