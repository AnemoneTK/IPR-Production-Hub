// src/components/TaskModal.tsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  X,
  Send,
  Calendar,
  Trash2,
  User as UserIcon,
  Check,
  Plus,
  Paperclip,
  File,
  FolderOpen,
  ExternalLink,
  Loader2,
  Unlink,
  Search,
  FileAudio,
  FileImage,
  FileVideo,
  AlertTriangle, // เพิ่มไอคอนแจ้งเตือน
} from "lucide-react";

// Interface
interface AttachedFile {
  id: number;
  name: string;
  folder_id: number;
  file_type: string;
  task_id?: number | null;
}

export default function TaskModal({
  task,
  members,
  onClose,
  onUpdate,
  onDelete,
}: any) {
  const params = useParams();
  const projectSlug = params.slug;

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");

  // Date logic
  const formatToLocalDatetime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };
  const [dueDate, setDueDate] = useState(formatToLocalDatetime(task.due_date));
  const [assignedTo, setAssignedTo] = useState<string[]>(
    task.assigned_to || []
  );
  const [showMemberSelect, setShowMemberSelect] = useState(false);

  // --- Attachments States ---
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  // --- File Picker States ---
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<AttachedFile[]>([]);
  const [selectedFilesToLink, setSelectedFilesToLink] = useState<number[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);

  // --- Unlink Confirmation State (เพิ่มใหม่) ---
  const [unlinkTarget, setUnlinkTarget] = useState<AttachedFile | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    fetchComments();
    fetchAttachedFiles();
  }, [task.id]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("task_comments")
      .select("*, profiles(display_name)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  const fetchAttachedFiles = async () => {
    setIsLoadingFiles(true);
    const { data } = await supabase
      .from("files")
      .select("id, name, folder_id, file_type, task_id")
      .eq("task_id", task.id);
    setAttachedFiles(data || []);
    setIsLoadingFiles(false);
  };

  // 2. Fetch Files for Picker
  const openFilePicker = async () => {
    setShowFilePicker(true);
    setIsLoadingPicker(true);
    setSelectedFilesToLink([]);

    const { data } = await supabase
      .from("files")
      .select("id, name, folder_id, file_type, task_id")
      .eq("project_id", task.project_id)
      .is("task_id", null)
      .order("created_at", { ascending: false });

    setAvailableFiles(data || []);
    setIsLoadingPicker(false);
  };

  const handleLinkFiles = async () => {
    if (selectedFilesToLink.length === 0) return;

    const { error } = await supabase
      .from("files")
      .update({ task_id: task.id })
      .in("id", selectedFilesToLink);

    if (!error) {
      setShowFilePicker(false);
      fetchAttachedFiles();
    } else {
      alert("เกิดข้อผิดพลาดในการแนบไฟล์");
    }
  };

  // 3. Update Task Logic
  const handleUpdateTask = async (field: string, value: any) => {
    if (field === "title") setTitle(value);
    if (field === "description") setDescription(value);
    if (field === "due_date") {
      setDueDate(value);
      value = value ? new Date(value).toISOString() : null;
    }
    await supabase
      .from("tasks")
      .update({ [field]: value })
      .eq("id", task.id);
    onUpdate();
  };

  const toggleAssignee = async (userId: string) => {
    let newAssignees = [...assignedTo];
    if (newAssignees.includes(userId)) {
      newAssignees = newAssignees.filter((id) => id !== userId);
    } else {
      newAssignees.push(userId);
    }
    setAssignedTo(newAssignees);
    await supabase
      .from("tasks")
      .update({ assigned_to: newAssignees })
      .eq("id", task.id);
    onUpdate();
  };

  // 4. Comments Logic
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: user.id,
      content: newComment,
    });
    setNewComment("");
    fetchComments();
  };

  // 5. Unlink File (ปรับใหม่เป็นเรียก Modal)
  const promptUnlink = (file: AttachedFile) => {
    setUnlinkTarget(file);
  };

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    setIsUnlinking(true);

    const { error } = await supabase
      .from("files")
      .update({ task_id: null })
      .eq("id", unlinkTarget.id);

    if (!error) {
      setAttachedFiles((prev) => prev.filter((f) => f.id !== unlinkTarget.id));
      setUnlinkTarget(null);
    } else {
      alert("เกิดข้อผิดพลาด");
    }
    setIsUnlinking(false);
  };

  // Helper: Get Icon
  const getFileIcon = (type: string) => {
    if (type.includes("image"))
      return <FileImage className="w-4 h-4 text-purple-500" />;
    if (type.includes("audio"))
      return <FileAudio className="w-4 h-4 text-orange-500" />;
    if (type.includes("video"))
      return <FileVideo className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-primary-light" />;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-border relative">
        {/* --- Header --- */}
        <div className="p-5 border-b border-border flex justify-between items-start bg-surface-subtle">
          <div className="flex-1 mr-4">
            <input
              type="text"
              className="w-full bg-transparent font-bold text-xl text-primary outline-none border-none placeholder:text-primary-light/50"
              value={title}
              onChange={(e) => handleUpdateTask("title", e.target.value)}
              placeholder="ชื่อการ์ดงาน..."
            />
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                  task.status === "revision"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                    : "bg-surface text-primary-light border-border"
                }`}
              >
                {task.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="p-2 text-primary-light hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-primary-light hover:text-primary hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- Body --- */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary-light uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Deadline
              </label>
              <input
                type="datetime-local"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-sm text-primary outline-none focus:border-accent [color-scheme:light] dark:[color-scheme:dark]"
                value={dueDate}
                onChange={(e) => handleUpdateTask("due_date", e.target.value)}
              />
            </div>

            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-primary-light uppercase flex items-center gap-1">
                <UserIcon className="w-3 h-3" /> ผู้รับผิดชอบ
              </label>
              <div className="flex flex-wrap gap-2">
                {assignedTo.map((id) => {
                  const member = members.find((m: any) => m.id === id);
                  if (!member) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1 pl-1 pr-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 rounded-full text-xs font-bold"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[9px]">
                        {member.display_name?.substring(0, 2).toUpperCase()}
                      </div>
                      {member.display_name}
                      <button
                        onClick={() => toggleAssignee(id)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => setShowMemberSelect(!showMemberSelect)}
                  className="flex items-center gap-1 px-2 py-1 bg-surface-subtle text-primary-light border border-border rounded-full text-xs hover:bg-surface transition-colors"
                >
                  <Plus className="w-3 h-3" /> เพิ่มคน
                </button>
              </div>
              {showMemberSelect && (
                <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-xl z-10 overflow-hidden p-1">
                  {members.map((m: any) => {
                    const isSelected = assignedTo.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleAssignee(m.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold"
                            : "hover:bg-surface-subtle text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-surface-subtle flex items-center justify-center text-[10px] text-primary-light font-bold border border-border">
                            {m.display_name?.substring(0, 2).toUpperCase()}
                          </div>
                          {m.display_name}
                        </div>
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {showMemberSelect && (
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => setShowMemberSelect(false)}
                ></div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-primary-light uppercase">
              รายละเอียด
            </label>
            <textarea
              rows={4}
              className="w-full p-4 bg-surface-subtle border border-border rounded-xl text-sm text-primary outline-none focus:border-accent resize-none leading-relaxed placeholder:text-primary-light/50"
              placeholder="ใส่รายละเอียดงาน..."
              value={description}
              onChange={(e) => handleUpdateTask("description", e.target.value)}
            />
          </div>

          {/* --- Attachments Section --- */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-primary-light uppercase flex items-center gap-2">
                <Paperclip className="w-3 h-3" /> ไฟล์ที่เกี่ยวข้อง (
                {attachedFiles.length})
              </h4>
              <button
                onClick={openFilePicker}
                className="text-[10px] bg-accent/10 text-accent hover:bg-accent hover:text-white px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> เพิ่มไฟล์แนบ
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="flex items-center gap-2 text-xs text-primary-light">
                <Loader2 className="w-3 h-3 animate-spin" /> กำลังโหลด...
              </div>
            ) : attachedFiles.length === 0 ? (
              <div
                className="p-4 rounded-xl bg-surface-subtle border border-dashed border-border text-center cursor-pointer hover:bg-surface transition-colors"
                onClick={openFilePicker}
              >
                <p className="text-xs text-primary-light">
                  ยังไม่มีไฟล์แนบในงานนี้
                </p>
                <p className="text-[10px] text-primary-light/60 mt-1">
                  คลิกเพื่อเลือกไฟล์จาก Assets
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 bg-surface-subtle border border-border rounded-xl hover:bg-surface hover:border-accent group transition-all"
                  >
                    <Link
                      href={`/dashboard/projects/${projectSlug}?tab=assets&folderId=${file.folder_id}`}
                      target="_blank"
                      className="flex items-center gap-3 overflow-hidden flex-1"
                    >
                      <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center border border-border shrink-0">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-primary truncate">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-primary-light flex items-center gap-1">
                          <FolderOpen className="w-3 h-3" /> ไปที่ Assets{" "}
                          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </div>
                    </Link>
                    {/* ปุ่ม Unlink เรียก Modal แทน alert */}
                    <button
                      onClick={() => promptUnlink(file)}
                      className="p-2 text-primary-light hover:text-red-500 hover:bg-surface rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="ยกเลิกการเชื่อมโยง"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- Comments Section --- */}
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-bold text-primary mb-4">
              💬 ความคิดเห็น
            </h4>
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
              {comments.length === 0 && (
                <p className="text-center text-primary-light text-xs py-4">
                  ยังไม่มีคอมเมนต์
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-primary-light font-bold text-xs flex-shrink-0">
                    {c.profiles?.display_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="bg-surface-subtle p-3 rounded-2xl rounded-tl-none text-sm border border-border flex-1">
                    <div className="flex justify-between items-center gap-4 mb-1">
                      <span className="font-bold text-primary text-xs">
                        {c.profiles?.display_name}
                      </span>
                      <span className="text-[10px] text-primary-light">
                        {new Date(c.created_at).toLocaleString("th-TH")}
                      </span>
                    </div>
                    <p className="text-primary-light">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-2 bg-surface border border-border rounded-xl text-sm text-primary focus:border-accent outline-none placeholder:text-primary-light/50"
                placeholder="เขียนคอมเมนต์..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="bg-accent text-white p-2 rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* --- 🔥 File Picker Modal (Overlay) --- */}
        {showFilePicker && (
          <div className="absolute inset-0 z-[80] bg-surface flex flex-col animate-in slide-in-from-bottom-5">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <Paperclip className="w-5 h-5" /> เลือกไฟล์เพื่อแนบ
              </h3>
              <button
                onClick={() => setShowFilePicker(false)}
                className="p-1.5 hover:bg-surface rounded-lg text-primary-light"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-border bg-surface">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-light" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไฟล์..."
                  className="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border rounded-xl text-sm focus:outline-none focus:border-accent text-primary"
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {isLoadingPicker ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : availableFiles.filter((f) =>
                  f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-10 text-primary-light opacity-50">
                  <File className="w-10 h-10 mx-auto mb-2" />
                  <p>ไม่พบไฟล์ที่ว่างอยู่</p>
                </div>
              ) : (
                availableFiles
                  .filter((f) =>
                    f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
                  )
                  .map((file) => {
                    const isSelected = selectedFilesToLink.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (isSelected)
                            setSelectedFilesToLink((prev) =>
                              prev.filter((id) => id !== file.id)
                            );
                          else
                            setSelectedFilesToLink((prev) => [
                              ...prev,
                              file.id,
                            ]);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-accent/10 border-accent"
                            : "bg-surface border-border hover:border-accent/50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-accent border-accent text-white"
                              : "border-primary-light/50 bg-surface"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-surface-subtle flex items-center justify-center border border-border text-primary-light">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isSelected ? "text-accent" : "text-primary"
                            }`}
                          >
                            {file.name}
                          </p>
                          <p className="text-[10px] text-primary-light flex items-center gap-1">
                            <FolderOpen className="w-2.5 h-2.5" /> จากโฟลเดอร์
                            ID: {file.folder_id}
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-border bg-surface-subtle flex justify-between items-center">
              <span className="text-xs text-primary-light">
                เลือก {selectedFilesToLink.length} ไฟล์
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilePicker(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-primary hover:bg-surface"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleLinkFiles}
                  disabled={selectedFilesToLink.length === 0}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 🔥 Unlink Confirmation Modal --- */}
        {unlinkTarget && (
          <div className="absolute inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-surface p-6 rounded-2xl shadow-xl max-w-sm w-full border border-border scale-100 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                <Unlink className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center text-primary mb-2">
                ยกเลิกการเชื่อมโยง?
              </h3>
              <p className="text-center text-primary-light text-sm mb-6 leading-relaxed">
                ไฟล์{" "}
                <span className="font-bold text-primary">
                  "{unlinkTarget.name}"
                </span>{" "}
                จะไม่แสดงในการ์ดงานนี้อีก แต่ไฟล์ต้นฉบับยังคงอยู่ใน Assets
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setUnlinkTarget(null)}
                  disabled={isUnlinking}
                  className="flex-1 py-2.5 bg-surface-subtle text-primary font-medium rounded-xl hover:bg-border transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmUnlink}
                  disabled={isUnlinking}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  {isUnlinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "ยืนยัน"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
