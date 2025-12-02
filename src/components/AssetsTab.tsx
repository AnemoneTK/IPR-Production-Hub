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
  Trash2,
  AlertTriangle,
  Pencil,
  Check,
  X, // <--- เพิ่มไอคอนใหม่
} from "lucide-react";

export default function AssetsTab({ projectId }: { projectId: number }) {
  // --- States ---
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<any[]>([]);

  // Data States
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [allFoldersRaw, setAllFoldersRaw] = useState<any[]>([]);
  const [allFilesRaw, setAllFilesRaw] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  // Actions States
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Rename States (ใหม่ 🔥)
  const [editingItem, setEditingItem] = useState<{
    type: "folder" | "file";
    id: number;
    name: string;
  } | null>(null);

  // Modal States
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "file" | "folder";
    id: number;
    name: string;
    key?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- 1. Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    const { data: allFolders } = await supabase
      .from("folders")
      .select("*")
      .eq("project_id", projectId);
    const { data: allFiles } = await supabase
      .from("files")
      .select("*, profiles(display_name)")
      .eq("project_id", projectId);

    setAllFoldersRaw(allFolders || []);
    setAllFilesRaw(allFiles || []);

    filterCurrentView(allFolders || [], allFiles || [], currentFolderId);
    setLoading(false);
  };

  const filterCurrentView = (
    allF: any[],
    allFi: any[],
    currId: number | null
  ) => {
    const currentFolders = allF
      .filter((f) => (currId ? f.parent_id === currId : f.parent_id === null))
      .sort((a, b) => a.name.localeCompare(b.name));
    const currentFiles = allFi
      .filter((f) => (currId ? f.folder_id === currId : f.folder_id === null))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    setFolders(currentFolders);
    setFiles(currentFiles);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    filterCurrentView(allFoldersRaw, allFilesRaw, currentFolderId);
  }, [currentFolderId, allFoldersRaw, allFilesRaw]);

  // --- 2. Logic Recursive Delete ---
  const getAllDescendantFiles = (folderId: number): string[] => {
    let keys: string[] = [];
    const filesInThisFolder = allFilesRaw.filter(
      (f) => f.folder_id === folderId
    );
    keys.push(...filesInThisFolder.map((f) => f.file_url));
    const subFolders = allFoldersRaw.filter((f) => f.parent_id === folderId);
    subFolders.forEach((sub) => {
      keys.push(...getAllDescendantFiles(sub.id));
    });
    return keys;
  };

  // --- 3. Actions (Create/Upload/Download) ---
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

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

      const { error: dbError } = await supabase.from("files").insert({
        project_id: projectId,
        folder_id: currentFolderId,
        name: file.name,
        file_url: fileName,
        file_type: file.type,
        size: file.size,
        uploaded_by: user.id,
      });
      if (dbError) throw dbError;
      fetchData();
    } catch (error: any) {
      alert("อัปโหลดล้มเหลว: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  // --- 4. Rename Logic (ใหม่! 🔥) ---
  const handleRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    try {
      const table = editingItem.type === "folder" ? "folders" : "files";

      // อัปเดตใน Database
      const { error } = await supabase
        .from(table)
        .update({ name: editingItem.name })
        .eq("id", editingItem.id);

      if (error) throw error;

      // อัปเดตข้อมูลใน State ทันที (Optimistic)
      if (editingItem.type === "folder") {
        setFolders((prev) =>
          prev.map((f) =>
            f.id === editingItem.id ? { ...f, name: editingItem.name } : f
          )
        );
        setAllFoldersRaw((prev) =>
          prev.map((f) =>
            f.id === editingItem.id ? { ...f, name: editingItem.name } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === editingItem.id ? { ...f, name: editingItem.name } : f
          )
        );
        setAllFilesRaw((prev) =>
          prev.map((f) =>
            f.id === editingItem.id ? { ...f, name: editingItem.name } : f
          )
        );
      }

      setEditingItem(null); // ปิดโหมดแก้ไข
    } catch (error: any) {
      alert("เปลี่ยนชื่อไม่สำเร็จ: " + error.message);
    }
  };

  // --- 5. Delete Logic ---
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      let fileKeysToDelete: string[] = [];
      if (deleteTarget.type === "file" && deleteTarget.key) {
        fileKeysToDelete = [deleteTarget.key];
      } else if (deleteTarget.type === "folder") {
        fileKeysToDelete = getAllDescendantFiles(deleteTarget.id);
      }

      if (fileKeysToDelete.length > 0) {
        await fetch("/api/delete-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKeys: fileKeysToDelete }),
        });
      }

      const table = deleteTarget.type === "file" ? "files" : "folders";
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      if (deleteTarget.type === "file") {
        setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        setAllFilesRaw((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      } else {
        setFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        setAllFoldersRaw((prev) =>
          prev.filter((f) => f.id !== deleteTarget.id)
        );
      }
      setDeleteTarget(null);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigation
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
  const getDeleteCount = () =>
    deleteTarget?.type === "folder"
      ? getAllDescendantFiles(deleteTarget.id).length
      : 0;

  return (
    <div className="p-6 min-h-[500px] relative">
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover shadow-sm disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}{" "}
            {isUploading ? "กำลังอัป..." : "อัปโหลดไฟล์"}
          </button>
        </div>
      </div>

      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="mb-4 flex items-center gap-2 max-w-md animate-in fade-in slide-in-from-top-2"
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

      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Folders Grid */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {folders.map((folder) => (
                <div key={folder.id} className="group relative">
                  <div
                    onClick={() => enterFolder(folder)}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all flex flex-col items-center text-center"
                  >
                    <Folder
                      className="w-10 h-10 text-blue-300 group-hover:text-blue-500 mb-2 transition-colors"
                      fill="currentColor"
                      fillOpacity={0.2}
                    />

                    {/* ส่วนชื่อโฟลเดอร์: แสดง Input เมื่อแก้ไข */}
                    {editingItem?.id === folder.id &&
                    editingItem.type === "folder" ? (
                      <form
                        onSubmit={handleRename}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center gap-1 mt-1"
                      >
                        <input
                          autoFocus
                          type="text"
                          className="w-full text-xs text-center border-b border-blue-500 outline-none bg-transparent"
                          value={editingItem.name}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              name: e.target.value,
                            })
                          }
                          onBlur={() => handleRename()} // กดออกก็เซฟเลย
                        />
                      </form>
                    ) : (
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate w-full mt-1 px-1">
                        {folder.name}
                      </span>
                    )}
                  </div>

                  {/* ปุ่ม Action (ลอยมุมขวาบน) */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem({
                          type: "folder",
                          id: folder.id,
                          name: folder.name,
                        });
                      }}
                      className="p-1.5 bg-white rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 shadow-sm"
                      title="เปลี่ยนชื่อ"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          type: "folder",
                          id: folder.id,
                          name: folder.name,
                        });
                      }}
                      className="p-1.5 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm"
                      title="ลบโฟลเดอร์"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Files Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
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
                    <td colSpan={6} className="p-0 border-none">
                      <div className="flex flex-col items-center justify-center w-full py-20 text-gray-400 gap-3">
                        <div className="p-4 bg-gray-50 rounded-full">
                          <FileIcon className="w-8 h-8 opacity-40" />
                        </div>
                        <span className="font-medium text-sm">
                          ยังไม่มีไฟล์ในโฟลเดอร์นี้
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50 group transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {file.file_type.includes("audio") ? (
                          <FileAudio className="w-5 h-5 text-blue-400" />
                        ) : file.file_type.includes("image") ? (
                          <FileImage className="w-5 h-5 text-purple-400" />
                        ) : (
                          <FileIcon className="w-5 h-5" />
                        )}
                      </td>

                      {/* ชื่อไฟล์ (แก้ไขได้) */}
                      <td className="px-4 py-3 font-medium text-gray-700 max-w-[300px]">
                        {editingItem?.id === file.id &&
                        editingItem.type === "file" ? (
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
                            <button
                              type="submit"
                              className="text-green-600 hover:bg-green-50 p-1 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItem(null)}
                              className="text-gray-400 hover:bg-gray-100 p-1 rounded"
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

                      <td className="px-4 py-3 text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {file.profiles?.display_name}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* ปุ่ม Rename (เพิ่มใหม่) */}
                        <button
                          onClick={() =>
                            setEditingItem({
                              type: "file",
                              id: file.id,
                              name: file.name,
                            })
                          }
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          title="เปลี่ยนชื่อ"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDownload(file.file_url, file.name)
                          }
                          className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-blue-50 transition-colors"
                          title="ดาวน์โหลด"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: "file",
                              id: file.id,
                              name: file.name,
                              key: file.file_url,
                            })
                          }
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="ลบไฟล์"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* --- Delete Modal (เหมือนเดิม) --- */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900">
              {deleteTarget.type === "folder" ? "ลบโฟลเดอร์?" : "ลบไฟล์?"}
            </h3>
            <div className="text-sm text-center text-gray-500 mt-2 mb-4 leading-relaxed">
              คุณกำลังจะลบ{" "}
              <span className="font-medium text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded mx-1 break-all">
                "{deleteTarget.name}"
              </span>
              <br />
              {deleteTarget.type === "folder" && getDeleteCount() > 0 ? (
                <span className="text-red-600 font-bold block mt-1">
                  ⚠️ โฟลเดอร์นี้มี {getDeleteCount()} ไฟล์ข้างใน
                  <br />
                  ทั้งหมดจะถูกลบถาวร!
                </span>
              ) : (
                "การกระทำนี้ไม่สามารถย้อนกลับได้"
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeleting ? "กำลังลบ..." : "ลบถาวร"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
