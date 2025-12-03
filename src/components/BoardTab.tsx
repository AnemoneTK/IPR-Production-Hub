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
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import TaskModal from "./TaskModal";

// Update Interface
interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  project_id: number;
  assigned_to?: string[]; // 🔥 เปลี่ยนเป็น Array
  due_date?: string;
}

const COLUMNS: any = {
  revision: {
    id: "revision",
    title: "แก้ด่วน / Revision",
    color: "bg-red-50 border-red-200",
    titleColor: "text-red-700 bg-red-100",
  },
  todo: {
    id: "todo",
    title: "To Do",
    color: "bg-gray-100 border-gray-200",
    titleColor: "text-gray-700 bg-gray-200",
  },
  doing: {
    id: "doing",
    title: "In Progress",
    color: "bg-blue-50 border-blue-100",
    titleColor: "text-blue-700 bg-blue-100",
  },
  done: {
    id: "done",
    title: "Done",
    color: "bg-green-50 border-green-100",
    titleColor: "text-green-700 bg-green-100",
  },
};

export default function BoardTab({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchData = useCallback(async () => {
    // A. Fetch Tasks (ไม่ต้อง join profiles แล้ว เพราะเรามี assigned_to เป็น id array)
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    // B. Fetch Members
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
        .channel(`realtime:project:${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${projectId}`,
          },
          () => fetchData()
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [projectId, fetchData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: newTaskTitle,
        status: "todo",
        assigned_to: [],
      });
    setNewTaskTitle("");
    setIsAdding(false);
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("ยืนยันที่จะลบงานนี้?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    if (selectedTask?.id === taskId) setSelectedTask(null);
  };

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
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full min-h-[600px] overflow-x-auto p-6 gap-6 bg-gray-50/50 items-start">
        {Object.values(COLUMNS).map((col: any) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`w-80 flex-shrink-0 flex flex-col rounded-2xl p-3 border ${col.color} bg-opacity-50 h-fit max-h-full`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${col.titleColor}`}
                  >
                    {col.title}
                  </span>
                  <span className="text-gray-400 text-xs font-semibold bg-white/50 px-2 py-0.5 rounded-md">
                    {colTasks.length}
                  </span>
                </div>
              </div>
              {col.id === "todo" && (
                <div className="mb-3">
                  {isAdding ? (
                    <form
                      onSubmit={handleCreateTask}
                      className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 animate-in fade-in zoom-in duration-200"
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder="ชื่องาน..."
                        className="w-full text-sm outline-none mb-2 bg-transparent"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setIsAdding(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="bg-accent text-white px-2 py-1 rounded"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsAdding(true)}
                      className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-xl transition-all border border-dashed border-gray-300"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มงานใหม่
                    </button>
                  )}
                </div>
              )}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[100px] transition-colors rounded-xl p-1 ${
                      snapshot.isDraggingOver
                        ? "bg-white/40 ring-2 ring-accent/20"
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
                            className={`p-4 rounded-xl shadow-sm border cursor-pointer group relative overflow-hidden bg-white ${
                              task.status === "revision"
                                ? "border-red-200 shadow-red-100 hover:border-red-300"
                                : "border-gray-100 hover:border-accent/50"
                            } ${
                              snapshot.isDragging
                                ? "shadow-lg rotate-2 scale-105 z-50"
                                : "hover:-translate-y-0.5"
                            }`}
                          >
                            {task.status === "revision" && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                            )}
                            <div className="flex justify-between items-start gap-2">
                              <h4
                                className={`text-sm font-medium leading-relaxed pr-6 ${
                                  task.status === "revision"
                                    ? "text-red-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {task.title}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="ลบงาน"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* 🔥 ส่วนแสดงรูปคนหลายคน (Avatars Stack) */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
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
                                        className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold border border-white ring-1 ring-gray-100"
                                        title={member.display_name}
                                      >
                                        {member.display_name
                                          ?.substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 border border-white">
                                    <UserIcon className="w-3 h-3" />
                                  </div>
                                )}
                              </div>

                              {task.due_date && (
                                <div
                                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                                    new Date(task.due_date) < new Date() &&
                                    task.status !== "done"
                                      ? "bg-red-50 text-red-600 border-red-100"
                                      : "bg-gray-50 text-gray-400 border-gray-100"
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
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
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            members={members}
            onClose={() => setSelectedTask(null)}
            onUpdate={() => {
              /* Realtime handles */
            }}
            onDelete={() => handleDeleteTask(selectedTask.id)}
          />
        )}
      </div>
    </DragDropContext>
  );
}
