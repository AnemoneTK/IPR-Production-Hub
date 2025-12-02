"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  MoreHorizontal,
  User as UserIcon,
  AlertTriangle,
  Loader2,
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
  status: string;
  project_id: number;
  assigned_to?: string;
}

// Config ของแต่ละคอลัมน์
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
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 1. ดึงข้อมูล
  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }); // เรียงตามเวลาที่สร้าง

    if (error) console.error("Error:", error);
    else setTasks(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [projectId, fetchTasks]);

  // 2. สร้างงานใหม่
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      title: newTaskTitle,
      status: "todo",
    });

    if (!error) {
      setNewTaskTitle("");
      setIsAdding(false);
      fetchTasks();
    }
  };

  // 3. ฟังก์ชันจบการลาก (On Drag End)
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // ถ้าลากไปที่ว่าง หรือวางที่เดิม -> ไม่ทำอะไร
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId;
    const taskId = parseInt(draggableId);

    // A. อัปเดตหน้าจอทันที (Optimistic UI) ให้คนใช้รู้สึกว่าเร็ว
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setTasks(updatedTasks);

    // B. อัปเดต Database เบื้องหลัง
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      alert("ย้ายงานไม่สำเร็จ");
      fetchTasks(); // โหลดค่าเดิมกลับมาถ้าพัง
    }
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
        {/* วนลูปสร้าง 4 คอลัมน์ (Revision, Todo, Doing, Done) */}
        {Object.values(COLUMNS).map((col: any) => {
          // กรองงานเฉพาะของคอลัมน์นี้
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className={`w-80 flex-shrink-0 flex flex-col rounded-2xl p-3 border ${col.color} bg-opacity-50 h-fit max-h-full`}
            >
              {/* Header */}
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

              {/* ปุ่มเพิ่มงาน (เฉพาะช่อง Todo) */}
              {col.id === "todo" && (
                <div className="mb-3">
                  {isAdding ? (
                    <form
                      onSubmit={handleCreateTask}
                      className="bg-white p-3 rounded-xl shadow-sm border border-gray-200"
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

              {/* พื้นที่รับการลากวาง (Droppable Zone) */}
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
                            onClick={() => setSelectedTask(task)} // คลิกเพื่อเปิด Modal
                            style={{ ...provided.draggableProps.style }} // จำเป็นสำหรับ Position
                            className={`
                              p-4 rounded-xl shadow-sm border cursor-pointer group relative overflow-hidden bg-white
                              ${
                                task.status === "revision"
                                  ? "border-red-200 shadow-red-100 hover:border-red-300"
                                  : "border-gray-100 hover:border-accent/50"
                              }
                              ${
                                snapshot.isDragging
                                  ? "shadow-lg rotate-2 scale-105 z-50"
                                  : "hover:-translate-y-0.5"
                              }
                            `}
                          >
                            {/* แถบสีแดงถ้างายแก้ */}
                            {task.status === "revision" && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                            )}

                            <div className="flex justify-between items-start gap-2">
                              <h4
                                className={`text-sm font-medium leading-relaxed ${
                                  task.status === "revision"
                                    ? "text-red-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {task.title}
                              </h4>
                              {task.status === "revision" && (
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">
                                <UserIcon className="w-3 h-3" />
                              </div>
                              <span className="text-[10px] text-gray-300 font-mono">
                                #{task.id}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder} {/* พื้นที่จองที่ตอนลาก */}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        {/* Modal คุยงาน */}
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={fetchTasks}
          />
        )}
      </div>
    </DragDropContext>
  );
}
