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
  X,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Disc,
  Music4,
  Wand2,
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

  // UI States
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);

  // Actions States
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Rename & Delete States
  const [editingItem, setEditingItem] = useState<{
    type: "folder" | "file";
    id: number;
    name: string;
  } | null>(null);
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

  // --- 2. Recursive Delete Helpers ---
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

  // --- 3. Actions ---
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

  const handleInitFolders = async () => {
    setIsInitializing(true);
    const defaultFolders = ["🎵 Raw Audio", "🎚️ Mixed & Master", "📸 Artwork"];

    try {
      for (const name of defaultFolders) {
        const exists = allFoldersRaw.some(
          (f) => f.name === name && f.parent_id === null
        );
        if (!exists) {
          await supabase.from("folders").insert({
            project_id: projectId,
            parent_id: null,
            name: name,
          });
        }
      }
      await fetchData();
    } catch (error) {
      alert("Error init folders");
    } finally {
      setIsInitializing(false);
    }
  };

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
        await supabase
          .from("files")
          .insert({
            project_id: projectId,
            folder_id: currentFolderId,
            name: file.name,
            file_url: fileName,
            file_type: file.type,
            size: file.size,
            uploaded_by: user.id,
          });
      }
      fetchData();
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

  // --- Other Actions ---
  const handleRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;
    try {
      const table = editingItem.type === "folder" ? "folders" : "files";
      await supabase
        .from(table)
        .update({ name: editingItem.name })
        .eq("id", editingItem.id);
      if (editingItem.type === "folder") {
        setFolders((prev) =>
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
      }
      setEditingItem(null);
    } catch (error) {
      alert("Rename failed");
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
      alert("Download failed");
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      let fileKeysToDelete: string[] = [];
      if (deleteTarget.type === "file" && deleteTarget.key)
        fileKeysToDelete = [deleteTarget.key];
      else if (deleteTarget.type === "folder")
        fileKeysToDelete = getAllDescendantFiles(deleteTarget.id);

      if (fileKeysToDelete.length > 0)
        await fetch("/api/delete-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKeys: fileKeysToDelete }),
        });

      const table = deleteTarget.type === "file" ? "files" : "folders";
      await supabase.from(table).delete().eq("id", deleteTarget.id);

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
      alert("Error: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

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
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      className={`p-4 md:p-6 min-h-[500px] relative transition-colors ${
        isDragging ? "bg-blue-50/50" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-100/80 border-4 border-blue-400 border-dashed rounded-xl m-4 backdrop-blur-sm pointer-events-none">
          <div className="text-center text-blue-600 animate-bounce">
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

      {/* Toolbar (Responsive Stack) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {currentFolderId && (
            <button
              onClick={navigateUp}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 whitespace-nowrap">
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

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-white shadow text-gray-800"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-white shadow text-gray-800"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {!currentFolderId && folders.length === 0 && (
            <button
              onClick={handleInitFolders}
              disabled={isInitializing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {isInitializing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">ตั้งค่า</span>
            </button>
          )}

          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Folder className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">สร้าง</span>
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
            {isUploading ? "กำลังอัป..." : "อัปโหลด"}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
              {folders.map((folder) => (
                <div key={folder.id} className="group relative">
                  <div
                    onClick={() => enterFolder(folder)}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all flex flex-col items-center text-center"
                  >
                    <Folder
                      className={`w-10 h-10 mb-2 transition-colors ${
                        folder.name.includes("Raw")
                          ? "text-blue-400"
                          : folder.name.includes("Mix")
                          ? "text-orange-400"
                          : "text-gray-400"
                      }`}
                      fill="currentColor"
                      fillOpacity={0.2}
                    />
                    {editingItem?.id === folder.id &&
                    editingItem?.type === "folder" ? (
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
                          onBlur={() => handleRename()}
                        />
                      </form>
                    ) : (
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate w-full mt-1 px-1">
                        {folder.name}
                      </span>
                    )}
                  </div>

                  {/* Desktop Overlay */}
                  <div className="absolute top-1 right-1 hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
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
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Mobile Actions (Visible) */}
                  <div className="md:hidden flex justify-center mt-1 gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem({
                          type: "folder",
                          id: folder.id,
                          name: folder.name,
                        });
                      }}
                      className="text-blue-500"
                    >
                      <Pencil className="w-4 h-4" />
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
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 🔥 GRID MODE */}
          {viewMode === "grid" && files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
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
                          setEditingItem({
                            type: "file",
                            id: file.id,
                            name: file.name,
                          })
                        }
                        className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50"
                        title="เปลี่ยนชื่อ"
                      >
                        <Pencil className="w-4 h-4" />
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
                        className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    {editingItem?.id === file.id &&
                    editingItem?.type === "file" ? (
                      <form
                        onSubmit={handleRename}
                        className="flex items-center gap-1"
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
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="text-sm font-medium text-gray-700 truncate"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                      <span>{formatSize(file.size)}</span>
                      <span>
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Mobile Actions (Visible) */}
                    <div className="md:hidden flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                      <button
                        onClick={() => handleDownload(file.file_url, file.name)}
                        className="text-gray-600 p-1"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingItem({
                            type: "file",
                            id: file.id,
                            name: file.name,
                          })
                        }
                        className="text-blue-600 p-1"
                      >
                        <Pencil className="w-4 h-4" />
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
          {viewMode === "list" && files.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[600px]">
                  {" "}
                  {/* Set min-width */}
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
                    {files.map((file) => (
                      <tr
                        key={file.id}
                        className="hover:bg-gray-50 group transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400">
                          {getFileIcon(file)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700 max-w-[200px]">
                          {editingItem?.id === file.id &&
                          editingItem?.type === "file" ? (
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
                        <td className="px-4 py-3 text-gray-500">
                          {formatSize(file.size)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {file.profiles?.display_name}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(file.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                          <button
                            onClick={() =>
                              handleDownload(file.file_url, file.name)
                            }
                            className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-blue-50"
                            title="ดาวน์โหลด"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {/* Always show edit/delete on List view for simplicity, or use hover on desktop */}
                          <button
                            onClick={() =>
                              setEditingItem({
                                type: "file",
                                id: file.id,
                                name: file.name,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                            title="เปลี่ยนชื่อ"
                          >
                            <Pencil className="w-4 h-4" />
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
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
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

          {files.length === 0 && folders.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full py-20 text-gray-400 gap-3 border-2 border-dashed border-gray-100 rounded-xl">
              <div className="p-4 bg-gray-50 rounded-full">
                <FileIcon className="w-8 h-8 opacity-40" />
              </div>
              <span className="font-medium text-sm">
                ยังไม่มีไฟล์ในโฟลเดอร์นี้
              </span>
              <p className="text-xs text-gray-300">
                ลากไฟล์มาวางเพื่ออัปโหลดได้เลย
              </p>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
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
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

// Helpers
const getFileIcon = (file: any) => {
  if (file.file_type.includes("image"))
    return <FileImage className="w-5 h-5 text-purple-400" />;
  const isMix =
    file.name.toLowerCase().includes("mix") ||
    file.name.toLowerCase().includes("master");
  if (file.file_type.includes("audio"))
    return isMix ? (
      <Disc className="w-5 h-5 text-orange-500" />
    ) : (
      <Music4 className="w-5 h-5 text-blue-500" />
    );
  return <FileIcon className="w-5 h-5 text-gray-400" />;
};

const FileThumbnail = ({ file }: { file: any }) => {
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
