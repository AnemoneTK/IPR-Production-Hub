// src/components/AssetsTab.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Folder,
  File as FileIcon,
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
  ArrowLeft,
  CheckSquare,
  Square,
  Archive,
} from "lucide-react";

// Interface
interface FileData {
  id: number;
  name: string;
  file_url: string;
  file_type: string;
  size: number;
  created_at: string;
  folder_id: number | null;
  parent_id?: number | null;
  profiles?: { display_name: string };
  task_id?: number | null;
}

export default function AssetsTab({ projectId }: { projectId: number }) {
  const searchParams = useSearchParams();
  const targetFolderId = searchParams.get("folderId");

  // --- States ---
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<any[]>([]);

  // Data States
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [allFoldersRaw, setAllFoldersRaw] = useState<any[]>([]);
  const [allFilesRaw, setAllFilesRaw] = useState<FileData[]>([]);

  const [loading, setLoading] = useState(true);

  // UI States
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);

  // Selection States (🔥 เพิ่มใหม่)
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isZipping, setIsZipping] = useState(false); // สถานะกำลังบีบไฟล์

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

    if (!targetFolderId) {
      filterCurrentView(allFolders || [], allFiles || [], currentFolderId);
    }
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
    setSelectedFileIds([]); // Clear selection when changing folder
  }, [currentFolderId, allFoldersRaw, allFilesRaw]);

  // Deep Linking
  useEffect(() => {
    if (targetFolderId && allFoldersRaw.length > 0) {
      const folderId = parseInt(targetFolderId);
      const buildPath = (id: number, folders: any[]) => {
        const path = [];
        let current = folders.find((f) => f.id === id);
        while (current) {
          path.unshift(current);
          current = folders.find((f) => f.id === current.parent_id);
        }
        return path;
      };
      const path = buildPath(folderId, allFoldersRaw);
      setFolderPath(path);
      setCurrentFolderId(folderId);
    }
  }, [targetFolderId, allFoldersRaw]);

  // --- 2. Recursive Helpers ---
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

  // --- 🔥 Recursive Get Files for Download ---
  const getFilesRecursive = (
    folderId: number,
    currentPath: string = ""
  ): { file: FileData; zipPath: string }[] => {
    let results: { file: FileData; zipPath: string }[] = [];

    // 1. Files in current folder
    const filesInThis = allFilesRaw.filter((f) => f.folder_id === folderId);
    filesInThis.forEach((f) => {
      results.push({ file: f, zipPath: currentPath + f.name });
    });

    // 2. Subfolders
    const subFolders = allFoldersRaw.filter((f) => f.parent_id === folderId);
    subFolders.forEach((sub) => {
      const subResults = getFilesRecursive(
        sub.id,
        currentPath + sub.name + "/"
      );
      results = results.concat(subResults);
    });

    return results;
  };

  // --- 3. Actions ---
  // ... (Create Folder, Init Folders, Upload Logic - เหมือนเดิม)
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
    // ... logic เดิม ...
    // เพื่อประหยัดพื้นที่ ผมขอละไว้ในฐานที่เข้าใจ (ใช้โค้ดเดิมได้เลย)
    // หรือถ้าต้องการให้ใส่เต็มบอกได้ครับ แต่หลักๆ คือ logic เดิม
    setIsInitializing(false);
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
        await supabase.from("files").insert({
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
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

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
        setAllFoldersRaw((prev) =>
          prev.map((f) =>
            f.id === editingItem.id ? { ...f, name: editingItem.name } : f
          )
        );
      } else {
        setAllFilesRaw((prev) =>
          prev.map((f) =>
            f.id === editingItem.id ? { ...f, name: editingItem.name } : f
          )
        );
      }
      setEditingItem(null);
    } catch {
      alert("Rename failed");
    }
  };

  // --- 🔥 Download Logic (Updated) ---

  // 1. Download Single File (Direct)
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

  // 2. Helper to fetch blob from signed URL
  const fetchFileBlob = async (fileKey: string, originalName: string) => {
    // ขอ Signed URL ก่อน
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey, originalName }),
    });
    const { url } = await response.json();
    if (!url) throw new Error("Cannot get signed url");

    // Fetch เนื้อไฟล์
    const fileRes = await fetch(url);
    return await fileRes.blob();
  };

  // 3. 🔥 Download Multiple Selected Files (Zip)
  const handleDownloadSelected = async () => {
    if (selectedFileIds.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const filesToDownload = files.filter((f) =>
        selectedFileIds.includes(f.id)
      );

      // Parallel Fetching
      await Promise.all(
        filesToDownload.map(async (file) => {
          try {
            const blob = await fetchFileBlob(file.file_url, file.name);
            zip.file(file.name, blob);
          } catch (e) {
            console.error(`Failed to download ${file.name}`, e);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `IPR_files_${new Date().getTime()}.zip`);
      setSelectedFileIds([]); // Clear selection
    } catch (error) {
      alert("Error creating zip file");
      console.error(error);
    } finally {
      setIsZipping(false);
    }
  };

  // 4. 🔥 Download Entire Folder (Zip)
  const handleDownloadFolder = async (folder: any) => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const items = getFilesRecursive(folder.id); // ได้ไฟล์ทั้งหมดพร้อม path

      if (items.length === 0) {
        alert("โฟลเดอร์นี้ว่างเปล่า");
        setIsZipping(false);
        return;
      }

      await Promise.all(
        items.map(async (item) => {
          try {
            const blob = await fetchFileBlob(
              item.file.file_url,
              item.file.name
            );
            zip.file(item.zipPath, blob); // ใช้ path เพื่อสร้าง structure ใน zip
          } catch (e) {
            console.error(`Failed to download ${item.file.name}`, e);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folder.name}.zip`);
    } catch (error) {
      alert("Error downloading folder");
      console.error(error);
    } finally {
      setIsZipping(false);
    }
  };

  // --- Selection Logic ---
  const toggleSelectFile = (id: number) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map((f) => f.id));
    }
  };

  const handleFileClick = async (file: FileData) => {
    // ถ้าอยู่ในโหมด Selection ให้ติ๊กเลือกแทนการเปิด
    if (isSelectionMode) {
      toggleSelectFile(file.id);
      return;
    }

    // Logic เดิม (Preview/Download)
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
      } catch {
        setPreviewImage(null);
      } finally {
        setIsPreviewLoading(false);
      }
    } else if (file.file_type.includes("audio")) {
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
      } catch {
        setPreviewAudio(null);
      } finally {
        setIsPreviewLoading(false);
      }
    } else {
      handleDownload(file.file_url, file.name);
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
        isDragging ? "bg-accent/10" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-accent/20 border-4 border-accent border-dashed rounded-xl m-4 backdrop-blur-sm pointer-events-none">
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

      {/* --- Preview Modals (เหมือนเดิม) --- */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            {isPreviewLoading ? (
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
        </div>
      )}
      {previewAudio && (
        <div
          className="fixed inset-0 z-[100] h-screen w-screen bg-black/90 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-10"
          onClick={() => setPreviewAudio(null)}
        >
          <button
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white"
            onClick={() => setPreviewAudio(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="flex flex-col items-center w-full max-w-lg text-center space-y-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-inner">
              <Music4 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {previewAudio.name}
            </h2>
            {previewAudio.url && (
              <audio
                controls
                autoPlay
                className="w-full"
                src={previewAudio.url}
              />
            )}
          </div>
        </div>
      )}

      {/* --- Toolbar --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {currentFolderId && (
            <button
              onClick={navigateUp}
              className="p-1.5 hover:bg-surface-subtle rounded-lg text-primary-light mr-1 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-primary-light whitespace-nowrap">
            <span
              onClick={() => {
                setCurrentFolderId(null);
                setFolderPath([]);
              }}
              className={`cursor-pointer hover:text-accent ${
                !currentFolderId && "text-primary font-bold"
              }`}
            >
              Home
            </span>
            {folderPath.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="text-primary-light/50">/</span>
                <span
                  className={
                    i === folderPath.length - 1 ? "text-primary font-bold" : ""
                  }
                >
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* 🔥 Selection Tools */}
          {files.length > 0 && (
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedFileIds([]);
              }}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
                isSelectionMode
                  ? "bg-accent/10 text-accent border-accent"
                  : "bg-surface text-primary-light border-border hover:bg-surface-subtle hover:text-primary"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isSelectionMode ? "เสร็จสิ้น" : "เลือก"}
              </span>
            </button>
          )}

          {isSelectionMode && (
            <>
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 text-sm font-medium text-primary-light hover:text-primary bg-surface border border-border rounded-lg"
              >
                All
              </button>
              {selectedFileIds.length > 0 && (
                <button
                  onClick={handleDownloadSelected}
                  disabled={isZipping}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-accent rounded-lg hover:bg-accent-hover shadow-sm disabled:opacity-50"
                >
                  {isZipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  ดาวน์โหลด ({selectedFileIds.length})
                </button>
              )}
            </>
          )}

          {/* View Toggles */}
          <div className="flex bg-surface-subtle border border-border p-1 rounded-lg mr-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-surface shadow text-primary"
                  : "text-primary-light hover:text-primary"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-surface shadow text-primary"
                  : "text-primary-light hover:text-primary"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {!isSelectionMode && (
            <>
              {!currentFolderId && folders.length === 0 && (
                <button
                  onClick={handleInitFolders}
                  disabled={isInitializing}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100"
                >
                  <Wand2 className="w-4 h-4" />
                  <span className="hidden sm:inline">ตั้งค่า</span>
                </button>
              )}
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-surface border border-border rounded-lg hover:bg-surface-subtle"
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
                {isUploading ? "..." : "อัปโหลด"}
              </button>
            </>
          )}
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
            className="flex-1 px-3 py-2 bg-surface border border-accent rounded-lg outline-none text-sm text-primary"
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
            className="px-3 py-2 text-primary-light hover:text-primary text-sm"
          >
            ยกเลิก
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-primary-light">
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
                    className="p-4 bg-surface-subtle rounded-xl border border-border hover:bg-accent/10 hover:border-accent/30 cursor-pointer transition-all flex flex-col items-center text-center"
                  >
                    <Folder
                      className={`w-10 h-10 mb-2 transition-colors ${
                        folder.name.includes("Raw")
                          ? "text-blue-400"
                          : folder.name.includes("Mix")
                          ? "text-orange-400"
                          : "text-primary-light"
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
                          className="w-full text-xs text-center border-b border-accent outline-none bg-transparent text-primary"
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
                      <span className="text-sm font-medium text-primary group-hover:text-accent truncate w-full mt-1 px-1">
                        {folder.name}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-1 right-1 hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    {/* 🔥 Folder Download Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFolder(folder);
                      }}
                      disabled={isZipping}
                      className="p-1.5 bg-surface rounded-full text-primary-light hover:text-accent hover:bg-surface-subtle shadow-sm border border-border"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem({
                          type: "folder",
                          id: folder.id,
                          name: folder.name,
                        });
                      }}
                      className="p-1.5 bg-surface rounded-full text-primary-light hover:text-accent hover:bg-surface-subtle shadow-sm border border-border"
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
                      className="p-1.5 bg-surface rounded-full text-primary-light hover:text-red-500 hover:bg-red-50 shadow-sm border border-border"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRID MODE */}
          {viewMode === "grid" && files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((file) => {
                const isSelected = selectedFileIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    className={`group relative bg-surface border rounded-xl overflow-hidden hover:shadow-md transition-all ${
                      isSelected
                        ? "border-accent ring-1 ring-accent"
                        : "border-border"
                    }`}
                  >
                    <div
                      className="aspect-square bg-surface-subtle flex items-center justify-center relative overflow-hidden cursor-pointer"
                      onClick={() => handleFileClick(file)}
                    >
                      <FileThumbnail file={file} />

                      {/* Selection Checkbox (Overlay) */}
                      {isSelectionMode && (
                        <div className="absolute top-2 left-2 z-20">
                          <div
                            className={`w-5 h-5 rounded border bg-surface flex items-center justify-center ${
                              isSelected
                                ? "bg-accent border-accent text-white"
                                : "border-border"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      )}

                      {!isSelectionMode && (
                        <div
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-2 backdrop-blur-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              handleDownload(file.file_url, file.name)
                            }
                            className="p-2 bg-surface rounded-full text-primary hover:bg-surface-subtle"
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
                            className="p-2 bg-surface rounded-full text-accent hover:bg-surface-subtle"
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
                            className="p-2 bg-surface rounded-full text-red-500 hover:bg-surface-subtle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
                            className="w-full text-xs p-1 bg-surface border border-accent rounded outline-none text-primary"
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
                            className="text-sm font-medium text-primary truncate cursor-pointer hover:text-accent"
                            title={file.name}
                            onClick={() => handleFileClick(file)}
                          >
                            {file.name}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-1 text-[10px] text-primary-light">
                        <span>{formatSize(file.size)}</span>
                        <span>
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST MODE */}
          {viewMode === "list" && files.length > 0 && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[600px]">
                  <thead className="bg-surface-subtle text-primary-light font-medium border-b border-border">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        {isSelectionMode && (
                          <button
                            onClick={handleSelectAll}
                            className="opacity-50 hover:opacity-100"
                          >
                            {selectedFileIds.length === files.length &&
                            files.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-accent" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </th>
                      <th className="px-4 py-3">ชื่อไฟล์</th>
                      <th className="px-4 py-3">ขนาด</th>
                      <th className="px-4 py-3">คนอัปโหลด</th>
                      <th className="px-4 py-3">วันที่</th>
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {files.map((file) => {
                      const isSelected = selectedFileIds.includes(file.id);
                      return (
                        <tr
                          key={file.id}
                          className={`hover:bg-surface-subtle group transition-colors cursor-pointer ${
                            isSelected ? "bg-accent/5" : ""
                          }`}
                          onClick={() => handleFileClick(file)}
                        >
                          <td className="px-4 py-3 text-primary-light">
                            {isSelectionMode ? (
                              <div
                                className={`w-4 h-4 border rounded flex items-center justify-center ${
                                  isSelected
                                    ? "bg-accent border-accent text-white"
                                    : "border-primary-light"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            ) : (
                              getFileIcon(file)
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-primary max-w-[200px]">
                            {editingItem?.id === file.id &&
                            editingItem?.type === "file" ? (
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
                                <button
                                  type="submit"
                                  className="text-green-500"
                                >
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
                              <span
                                className="truncate block"
                                title={file.name}
                              >
                                {file.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-primary-light">
                            {formatSize(file.size)}
                          </td>
                          <td className="px-4 py-3 text-primary-light">
                            {file.profiles?.display_name}
                          </td>
                          <td className="px-4 py-3 text-primary-light">
                            {new Date(file.created_at).toLocaleDateString()}
                          </td>
                          <td
                            className="px-4 py-3 text-right flex justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!isSelectionMode && (
                              <>
                                <button
                                  onClick={() =>
                                    handleDownload(file.file_url, file.name)
                                  }
                                  className="p-1.5 text-primary-light hover:text-accent rounded-lg hover:bg-surface-subtle"
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
                                  className="p-1.5 text-primary-light hover:text-accent rounded-lg hover:bg-surface-subtle"
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
                                  className="p-1.5 text-primary-light hover:text-red-500 rounded-lg hover:bg-surface-subtle"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {files.length === 0 && folders.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full py-20 text-primary-light/50 gap-3 border-2 border-dashed border-border rounded-xl">
              <div className="p-4 bg-surface-subtle rounded-full">
                <FileIcon className="w-8 h-8 opacity-40" />
              </div>
              <span className="font-medium text-sm">
                ยังไม่มีไฟล์ในโฟลเดอร์นี้
              </span>
              <p className="text-xs text-primary-light/70">
                ลากไฟล์มาวางเพื่ออัปโหลดได้เลย
              </p>
            </div>
          )}
        </>
      )}

      {/* Delete Modal (เหมือนเดิม) */}
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
                <span>{isDeleting ? "กำลังลบ..." : "ลบถาวร"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers (เหมือนเดิม)
const getFileIcon = (file: any) => {
  if (file.file_type.includes("image"))
    return <ImageIcon className="w-6 h-6 text-purple-500" />;
  const isMix =
    file.name.toLowerCase().includes("mix") ||
    file.name.toLowerCase().includes("master");
  if (file.file_type.includes("audio"))
    return isMix ? (
      <Disc className="w-6 h-6 text-orange-500" />
    ) : (
      <Music4 className="w-6 h-6 text-blue-500" />
    );
  return <FileIcon className="w-6 h-6 text-primary-light" />;
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
  return <FileIcon className="w-10 h-10 text-primary-light/30" />;
};
