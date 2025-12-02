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
} from "lucide-react";

// Interface
interface FileData {
  id: number;
  name: string;
  file_url: string; // R2 Key
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

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "all" | "image" | "audio" | "mixed"
  >("all");

  // --- 1. Fetch Data (Initial Load) ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);

      // ดึงรายชื่อโปรเจกต์มาใส่ Dropdown
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, title")
        .order("created_at", { ascending: false });
      setProjects(projectData || []);

      // ดึงไฟล์ทั้งหมด
      await fetchFiles();
    };
    initData();
  }, []);

  // --- 2. Fetch Files with Logic ---
  const fetchFiles = async () => {
    setLoading(true);

    let query = supabase
      .from("files")
      .select("*, projects(title), profiles(display_name)")
      .order("created_at", { ascending: false });

    // A. กรองตามโปรเจกต์
    if (selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }

    // B. กรองตามชื่อ (Search)
    if (searchTerm.trim()) {
      query = query.ilike("name", `%${searchTerm}%`);
    }

    // C. กรองตามประเภท (Tabs)
    if (activeTab === "image") {
      query = query.ilike("file_type", "%image%");
    } else if (activeTab === "audio") {
      query = query.ilike("file_type", "%audio%");
    } else if (activeTab === "mixed") {
      // Logic กรองไฟล์ Mix: หาไฟล์เสียงที่มีคำว่า mix, master, final
      query = query
        .ilike("file_type", "%audio%")
        .or("name.ilike.%mix%,name.ilike.%master%,name.ilike.%final%");
    }

    const { data, error } = await query;

    if (error) console.error("Error fetching files:", error);
    else setFiles((data as any[]) || []);

    setLoading(false);
  };

  // Reload เมื่อ Filter เปลี่ยน
  useEffect(() => {
    // ใช้ Debounce สำหรับ Search เพื่อไม่ให้ยิงรัวเกินไป
    const timeoutId = setTimeout(() => {
      fetchFiles();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedProject, activeTab]);

  // --- 3. Download Function ---
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
    } catch (error) {
      alert("ดาวน์โหลดไม่สำเร็จ");
    }
  };

  // --- 4. Render Helpers ---
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

      {/* --- Filter Bar --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Left: Type Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full lg:w-auto">
          {[
            { id: "all", label: "ทั้งหมด", icon: FileIcon },
            { id: "image", label: "รูปภาพ", icon: ImageIcon },
            { id: "audio", label: "เสียงดิบ", icon: Music4 },
            { id: "mixed", label: "มิกซ์แล้ว", icon: Disc },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-accent shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Search & Project */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Project Dropdown */}
          <select
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-accent outline-none text-gray-700 min-w-[200px]"
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

          {/* Search Input */}
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
        </div>
      </div>

      {/* --- File Grid --- */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="group bg-white p-4 rounded-xl border border-gray-100 hover:border-accent/50 hover:shadow-md transition-all flex flex-col relative"
            >
              {/* Icon / Thumbnail */}
              <div className="h-32 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                {file.file_type.includes("image") ? (
                  // ถ้าอยากโชว์รูปจริงต้องทำ Presigned URL ขาอ่านด้วย แต่ตอนนี้เอาไอคอนไปก่อนเพื่อความเร็ว
                  <ImageIcon className="w-12 h-12 text-purple-300" />
                ) : file.file_type.includes("audio") ? (
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      file.name.toLowerCase().includes("mix")
                        ? "bg-orange-100 text-orange-500"
                        : "bg-blue-100 text-blue-500"
                    }`}
                  >
                    {file.name.toLowerCase().includes("mix") ? (
                      <Disc className="w-6 h-6" />
                    ) : (
                      <Music4 className="w-6 h-6" />
                    )}
                  </div>
                ) : (
                  <FileIcon className="w-12 h-12 text-gray-300" />
                )}

                {/* ปุ่ม Download ลอยขึ้นมาตอน Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button
                    onClick={() => handleDownload(file.file_url, file.name)}
                    className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-accent hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" /> ดาวน์โหลด
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3
                    className="font-semibold text-gray-800 text-sm truncate"
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                    {file.file_type.split("/")[1] || "FILE"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-2 flex items-center gap-1">
                  📁 {file.projects?.title || "Unknown Project"}
                </p>
                <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-50 pt-2 mt-auto">
                  <span>{file.profiles?.display_name}</span>
                  <span>{formatSize(file.size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
