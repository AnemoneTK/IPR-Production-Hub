// src/components/BoardTab.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  User as UserIcon,
  AlertTriangle,
  Loader2,
  Trash2,
  Calendar,
  Clock,
  X,
  Check,
  AlignLeft,
  Paperclip, // เพิ่มไอคอน
  Search,
  File,
  FolderOpen,
  FileAudio,
  FileImage,
  FileVideo,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import TaskModal from "./TaskModal";

// Interface
interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  project_id: number;
  assigned_to?: string[];
  due_date?: string;
}

// Interface สำหรับไฟล์
interface AttachedFile {
  id: number;
  name: string;
  folder_id: number;
  file_type: string;
  task_id?: number | null;
}

const COLUMNS: any = {
  revision: {
    id: "revision",
    title: "แก้ด่วน / Revision",
    color: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50",
    titleColor: "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50",
  },
  todo: {
    id: "todo",
    title: "To Do",
    color: "bg-surface-subtle border-border",
    titleColor: "text-primary bg-surface border border-border",
  },
  doing: {
    id: "doing",
    title: "In Progress",
    color:
      "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50",
    titleColor:
      "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50",
  },
  done: {
    id: "done",
    title: "Done",
    color:
      "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50",
    titleColor:
      "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50",
  },
};

export default function BoardTab({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal States
  const [isCreating, setIsCreating] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    description: "",
    assigned_to: [] as string[],
    due_date: "",
  });
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 Create Modal - File Picker States
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<AttachedFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]); // เก็บ ID ไฟล์ที่เลือกตอนสร้าง
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    const { data: memberData } = await supabase
      .from("project_members")
      .select("profiles(id, display_name, avatar_url)")
      .eq("project_id", projectId);

    const cleanMembers = memberData?.map((m: any) => m.profiles) || [];

    setTasks(taskData || []);
    setMembers(cleanMembers);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchData();
      const channel = supabase
        .channel(`realtime:board:${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
            } else {
              fetchData();
            }
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [projectId, fetchData]);

  // --- Create Task Logic ---
  const openFilePicker = async () => {
    setShowFilePicker(true);
    setIsLoadingPicker(true);
    // ดึงไฟล์ที่ยังไม่มี task_id (ไฟล์ว่าง) ในโปรเจกต์นี้
    const { data } = await supabase
      .from("files")
      .select("id, name, folder_id, file_type, task_id")
      .eq("project_id", projectId)
      .is("task_id", null)
      .order("created_at", { ascending: false });

    setAvailableFiles(data || []);
    setIsLoadingPicker(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) return;
    setIsSubmitting(true);

    // 1. สร้าง Task ก่อน
    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: newForm.title,
        description: newForm.description,
        status: "todo",
        assigned_to: newForm.assigned_to,
        due_date: newForm.due_date
          ? new Date(newForm.due_date).toISOString()
          : null,
      })
      .select()
      .single();

    if (error) {
      alert("สร้างงานไม่สำเร็จ: " + error.message);
    } else if (newTask) {
      // 2. ถ้ามีไฟล์ที่เลือกไว้ ให้ update task_id ของไฟล์เหล่านั้น
      if (selectedFileIds.length > 0) {
        await supabase
          .from("files")
          .update({ task_id: newTask.id })
          .in("id", selectedFileIds);
      }

      // Reset State
      setIsCreating(false);
      setNewForm({ title: "", description: "", assigned_to: [], due_date: "" });
      setSelectedFileIds([]); // Reset files
      fetchData();
    }
    setIsSubmitting(false);
  };

  const toggleNewAssignee = (userId: string) => {
    setNewForm((prev) => {
      const current = prev.assigned_to;
      if (current.includes(userId)) {
        return { ...prev, assigned_to: current.filter((id) => id !== userId) };
      } else {
        return { ...prev, assigned_to: [...current, userId] };
      }
    });
  };

  // --- Helper Icons ---
  const getFileIcon = (type: string) => {
    if (type.includes("image"))
      return <FileImage className="w-4 h-4 text-purple-500" />;
    if (type.includes("audio"))
      return <FileAudio className="w-4 h-4 text-orange-500" />;
    if (type.includes("video"))
      return <FileVideo className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-primary-light" />;
  };

  // --- Delete Task ---
  const promptDelete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setDeleteTarget({ id: task.id, title: task.title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await supabase.from("tasks").delete().eq("id", deleteTarget.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      if (selectedTask?.id === deleteTarget.id) setSelectedTask(null);
      setDeleteTarget(null);
    } catch (error: any) {
      alert("ลบไม่สำเร็จ");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Drag & Drop ---
  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const taskId = parseInt(draggableId);

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center text-primary-light">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full min-h-[600px] overflow-x-auto p-6 gap-6 bg-surface-subtle items-start">
          {Object.values(COLUMNS).map((col: any) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`w-80 flex-shrink-0 flex flex-col rounded-2xl p-3 border ${col.color} h-fit max-h-full transition-colors`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${col.titleColor}`}
                    >
                      {col.title}
                    </span>
                    <span className="text-primary-light text-xs font-semibold bg-surface/50 px-2 py-0.5 rounded-md">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {col.id === "todo" && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full mb-3 py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-primary-light hover:text-accent hover:bg-surface rounded-xl transition-all border border-dashed border-border hover:border-accent"
                  >
                    <Plus className="w-4 h-4" /> สร้างการ์ดงานใหม่
                  </button>
                )}

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[100px] transition-colors rounded-xl p-1 ${
                        snapshot.isDraggingOver
                          ? "bg-surface/20 ring-2 ring-accent/20"
                          : ""
                      }`}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedTask(task)}
                              style={{ ...provided.draggableProps.style }}
                              className={`p-4 rounded-xl shadow-sm border cursor-pointer group relative overflow-hidden bg-surface transition-all ${
                                task.status === "revision"
                                  ? "border-red-200 dark:border-red-900/50 shadow-red-100 dark:shadow-none hover:border-red-300 dark:hover:border-red-700"
                                  : "border-border hover:border-accent/50 dark:hover:border-accent/50"
                              } ${
                                snapshot.isDragging
                                  ? "shadow-lg rotate-2 scale-105 z-50 ring-2 ring-accent"
                                  : "hover:-translate-y-0.5 dark:hover:shadow-none"
                              }`}
                            >
                              {task.status === "revision" && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                              )}
                              <div className="flex justify-between items-start gap-2">
                                <h4
                                  className={`text-sm font-medium leading-relaxed pr-6 ${
                                    task.status === "revision"
                                      ? "text-red-700 dark:text-red-400"
                                      : "text-primary"
                                  }`}
                                >
                                  {task.title}
                                </h4>
                                <button
                                  onClick={(e) => promptDelete(e, task)}
                                  className="absolute top-2 right-2 p-1.5 text-primary-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {task.assigned_to &&
                                  task.assigned_to.length > 0 ? (
                                    task.assigned_to.map((userId) => {
                                      const member = members.find(
                                        (m) => m.id === userId
                                      );
                                      if (!member) return null;
                                      return (
                                        <div
                                          key={userId}
                                          className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center text-[9px] font-bold border border-surface ring-1 ring-border"
                                          title={member.display_name}
                                        >
                                          {member.display_name
                                            ?.substring(0, 2)
                                            .toUpperCase()}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-surface-subtle flex items-center justify-center text-primary-light border border-surface">
                                      <UserIcon className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                                {task.due_date && (
                                  <div
                                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                                      new Date(task.due_date) < new Date() &&
                                      task.status !== "done"
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                                        : "bg-surface-subtle text-primary-light border-border"
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />{" "}
                                    {new Date(task.due_date).toLocaleDateString(
                                      "th-TH",
                                      { day: "numeric", month: "short" }
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* --- Create Task Modal --- */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-border relative">
            {/* Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface-subtle">
              <h3 className="font-bold text-lg text-primary">
                สร้างการ์ดงานใหม่
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-2 hover:bg-surface rounded-lg text-primary-light hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-primary-light uppercase mb-2 block">
                  ชื่องาน
                </label>
                <input
                  type="text"
                  autoFocus
                  className="w-full text-xl font-bold p-2 border-b-2 border-border focus:border-accent outline-none bg-transparent placeholder:text-primary-light/50 text-primary"
                  placeholder="ใส่ชื่องาน..."
                  value={newForm.title}
                  onChange={(e) =>
                    setNewForm({ ...newForm, title: e.target.value })
                  }
                />
              </div>

              {/* Grid: Date & Assignees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-light uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Deadline
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full p-2.5 bg-surface-subtle border border-border rounded-xl text-sm outline-none focus:border-accent text-primary [color-scheme:light] dark:[color-scheme:dark]"
                    value={newForm.due_date}
                    onChange={(e) =>
                      setNewForm({ ...newForm, due_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-primary-light uppercase flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> ผู้รับผิดชอบ
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[42px] items-center">
                    {newForm.assigned_to.map((id) => {
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
                            onClick={() => toggleNewAssignee(id)}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setShowMemberSelect(!showMemberSelect)}
                      className="flex items-center gap-1 px-2 py-1 bg-surface-subtle text-primary-light border border-border rounded-full text-xs hover:bg-surface hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" /> เพิ่มคน
                    </button>
                  </div>
                  {showMemberSelect && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-xl z-10 overflow-hidden p-1">
                      {members.map((m: any) => {
                        const isSelected = newForm.assigned_to.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleNewAssignee(m.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                              isSelected
                                ? "bg-accent/10 text-accent font-bold"
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

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary-light uppercase flex items-center gap-1">
                  <AlignLeft className="w-3 h-3" /> รายละเอียด
                </label>
                <textarea
                  rows={5}
                  className="w-full p-4 bg-surface-subtle border border-border rounded-xl text-sm outline-none focus:border-accent resize-none leading-relaxed text-primary placeholder:text-primary-light/50"
                  placeholder="ใส่รายละเอียดงาน..."
                  value={newForm.description}
                  onChange={(e) =>
                    setNewForm({ ...newForm, description: e.target.value })
                  }
                />
              </div>

              {/* 🔥 Attachments Section (Create Mode) */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-primary-light uppercase flex items-center gap-2">
                    <Paperclip className="w-3 h-3" /> ไฟล์ที่เกี่ยวข้อง (
                    {selectedFileIds.length})
                  </h4>
                  <button
                    onClick={openFilePicker}
                    className="text-[10px] bg-accent/10 text-accent hover:bg-accent hover:text-white px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> เลือกไฟล์
                  </button>
                </div>

                {selectedFileIds.length === 0 ? (
                  <div
                    className="p-4 rounded-xl bg-surface-subtle border border-dashed border-border text-center cursor-pointer hover:bg-surface transition-colors"
                    onClick={openFilePicker}
                  >
                    <p className="text-xs text-primary-light">
                      ยังไม่มีไฟล์แนบ
                    </p>
                    <p className="text-[10px] text-primary-light/60 mt-1">
                      คลิกเพื่อเลือกไฟล์จาก Assets
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {/* แสดงรายการไฟล์ที่ถูกเลือกจาก availableFiles (หรือถ้าไม่มีใน list แล้วอาจต้อง fetch ใหม่ แต่ใน flow นี้เราเลือกจาก availableFiles อยู่แล้ว) */}
                    {availableFiles
                      .filter((f) => selectedFileIds.includes(f.id))
                      .map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 bg-surface-subtle border border-border rounded-xl"
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border shrink-0 text-primary-light">
                              {getFileIcon(file.file_type)}
                            </div>
                            <span className="text-sm font-medium text-primary truncate">
                              {file.name}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setSelectedFileIds((prev) =>
                                prev.filter((id) => id !== file.id)
                              )
                            }
                            className="p-2 text-primary-light hover:text-red-500 hover:bg-surface rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    {/* กรณีไฟล์ที่เลือกอาจจะไม่อยู่ใน availableFiles (เช่นเพิ่งโหลดหน้า) อาจต้องมีการจัดการเพิ่มเติม แต่เบื้องต้นใช้ availableFiles ไปก่อน */}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border bg-surface-subtle flex justify-end gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 text-primary-light hover:bg-surface rounded-xl font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={!newForm.title.trim() || isSubmitting}
                className="px-6 py-2.5 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                สร้างงาน
              </button>
            </div>

            {/* 🔥 File Picker Overlay (Create Mode) */}
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
                      f.name
                        .toLowerCase()
                        .includes(fileSearchQuery.toLowerCase())
                    ).length === 0 ? (
                    <div className="text-center py-10 text-primary-light opacity-50">
                      <File className="w-10 h-10 mx-auto mb-2" />
                      <p>ไม่พบไฟล์ที่ว่างอยู่</p>
                    </div>
                  ) : (
                    availableFiles
                      .filter((f) =>
                        f.name
                          .toLowerCase()
                          .includes(fileSearchQuery.toLowerCase())
                      )
                      .map((file) => {
                        const isSelected = selectedFileIds.includes(file.id);
                        return (
                          <div
                            key={file.id}
                            onClick={() => {
                              if (isSelected)
                                setSelectedFileIds((prev) =>
                                  prev.filter((id) => id !== file.id)
                                );
                              else
                                setSelectedFileIds((prev) => [
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
                                <FolderOpen className="w-2.5 h-2.5" />{" "}
                                จากโฟลเดอร์ ID: {file.folder_id}
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
                    เลือก {selectedFileIds.length} ไฟล์
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowFilePicker(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-primary hover:bg-surface"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Modal (Edit) */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchData}
          onDelete={() =>
            setDeleteTarget({ id: selectedTask.id, title: selectedTask.title })
          }
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-border">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary">ลบงานนี้?</h3>
            <p className="text-primary-light mb-6">
              "{deleteTarget.title}" จะหายไปถาวร
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-surface-subtle text-primary hover:bg-border/50 rounded-xl font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold flex justify-center items-center gap-2 shadow-lg shadow-red-500/30"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}{" "}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
