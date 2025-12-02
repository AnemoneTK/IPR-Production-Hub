"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Folder,
  FileAudio,
  FileImage,
  File as FileIcon,
  Plus,
  ArrowLeft,
  Loader2,
  Download,
  UploadCloud,
} from "lucide-react";

export default function AssetsTab({ projectId }: { projectId: number }) {
  // State เดิม
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // State ใหม่สำหรับการอัปโหลด
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    let folderQuery = supabase
      .from("folders")
      .select("*")
      .eq("project_id", projectId)
      .order("name");
    let fileQuery = supabase
      .from("files")
      .select("*, profiles(display_name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (currentFolderId) {
      folderQuery = folderQuery.eq("parent_id", currentFolderId);
      fileQuery = fileQuery.eq("folder_id", currentFolderId);
    } else {
      folderQuery = folderQuery.is("parent_id", null);
      fileQuery = fileQuery.is("folder_id", null);
    }

    const [resFolders, resFiles] = await Promise.all([folderQuery, fileQuery]);
    setFolders(resFolders.data || []);
    setFiles(resFiles.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId, currentFolderId]);

  // 2. Create Folder (เหมือนเดิม)
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const { error } = await supabase.from("folders").insert({
      project_id: projectId,
      parent_id: currentFolderId,
      name: newFolderName,
    });
    if (!error) {
      setNewFolderName("");
      setIsCreatingFolder(false);
      fetchData();
    }
  };

  // 3. ฟังก์ชันอัปโหลดไฟล์ (ของใหม่! 🔥)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Step A: ขอ User ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

      // Step B: ขอ Presigned URL จาก API Route ของเรา
      const response = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ name: file.name, type: file.type }),
      });
      const { url, fileName } = await response.json();

      // Step C: อัปโหลดไฟล์ขึ้น R2 ตรงๆ (PUT)
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const publicUrl = `${
        process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || ""
      }/${fileName}`;

      const { error: dbError } = await supabase.from("files").insert({
        project_id: projectId,
        folder_id: currentFolderId,
        name: file.name, // ชื่อเดิมที่ User เห็น
        file_url: fileName, // เก็บชื่อไฟล์ใน R2 (Key) เอาไว้ไปเจนลิงก์โหลดทีหลัง
        file_type: file.type,
        size: file.size,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      // สำเร็จ!
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("อัปโหลดล้มเหลว: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // ล้างค่า input
    }
  };

  const handleDownload = async (fileKey: string, originalName: string) => {
    try {
      // 1. ขอลิงก์จาก API
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, originalName }),
      });
      const { url } = await response.json();

      if (url) {
        // 2. สั่ง Browser ให้เปิดลิงก์นั้น (มันจะเด้งโหลดอัตโนมัติ)
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", originalName); // เสริมความชัวร์
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      alert("ดาวน์โหลดไม่สำเร็จ");
      console.error(error);
    }
  };

  // Navigation Helpers (เหมือนเดิม)
  const enterFolder = (folder: any) => {
    setFolderPath([...folderPath, folder]);
    setCurrentFolderId(folder.id);
  };
  const navigateUp = () => {
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolderId(
      newPath.length > 0 ? newPath[newPath.length - 1].id : null
    );
  };

  return (
    <div className="p-6 min-h-[500px]">
      {/* Input ไฟล์ซ่อนอยู่ตรงนี้ */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {currentFolderId && (
            <button
              onClick={navigateUp}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <span
              onClick={() => {
                setCurrentFolderId(null);
                setFolderPath([]);
              }}
              className={`cursor-pointer hover:text-accent ${
                !currentFolderId && "text-gray-900 font-bold"
              }`}
            >
              Home
            </span>
            {folderPath.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="text-gray-300">/</span>
                <span
                  className={
                    i === folderPath.length - 1 ? "text-gray-900 font-bold" : ""
                  }
                >
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Folder className="w-4 h-4" /> สร้างโฟลเดอร์
          </button>

          {/* ปุ่มอัปโหลด (กดแล้วไปเรียก input ที่ซ่อนอยู่) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover shadow-sm disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            {isUploading ? "กำลังอัป..." : "อัปโหลดไฟล์"}
          </button>
        </div>
      </div>

      {/* Create Folder Form (เหมือนเดิม) */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="mb-4 flex items-center gap-2 max-w-md"
        >
          <input
            autoFocus
            type="text"
            className="flex-1 px-3 py-2 border border-accent rounded-lg outline-none text-sm"
            placeholder="ชื่อโฟลเดอร์..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button
            type="submit"
            className="px-3 py-2 bg-accent text-white text-sm rounded-lg"
          >
            สร้าง
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingFolder(false)}
            className="px-3 py-2 text-gray-500 text-sm"
          >
            ยกเลิก
          </button>
        </form>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Folder Grid */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => enterFolder(folder)}
                  className="group p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all flex flex-col items-center text-center"
                >
                  <Folder
                    className="w-10 h-10 text-blue-300 group-hover:text-blue-500 mb-2 transition-colors"
                    fill="currentColor"
                    fillOpacity={0.2}
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate w-full">
                    {folder.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* File List */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">ชื่อไฟล์</th>
                  <th className="px-4 py-3">ขนาด</th>
                  <th className="px-4 py-3">คนอัปโหลด</th>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {files.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      ยังไม่มีไฟล์ในโฟลเดอร์นี้
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 text-gray-400">
                        {file.file_type.includes("audio") ? (
                          <FileAudio className="w-5 h-5" />
                        ) : file.file_type.includes("image") ? (
                          <FileImage className="w-5 h-5" />
                        ) : (
                          <FileIcon className="w-5 h-5" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {file.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {file.profiles?.display_name}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            handleDownload(file.file_url, file.name)
                          } // <--- แก้ตรงนี้
                          className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-blue-50 transition-colors"
                          title="ดาวน์โหลดต้นฉบับ"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
