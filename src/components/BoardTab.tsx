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
import TaskModal from "./TaskModal";

// Interface สำหรับข้อมูล Task
interface Task {
  id: number;
  title: string;
  status: string; // 'todo', 'doing', 'done', 'revision'
  project_id: number;
}

export default function BoardTab({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // State สำหรับเปิด Modal (เก็บ Task ที่ถูกคลิก)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 1. ดึงข้อมูลงานทั้งหมด
  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [projectId, fetchTasks]);

  // 2. ฟังก์ชันสร้างงานใหม่
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    // สร้างงานใหม่ สถานะเริ่มที่ 'todo'
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      title: newTaskTitle,
      status: "todo",
    });

    if (error) {
      alert("สร้างงานไม่สำเร็จ: " + error.message);
    } else {
      setNewTaskTitle("");
      setIsAdding(false);
      fetchTasks(); // โหลดข้อมูลใหม่ทันที
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  // แยกงานตามสถานะ
  const revisionTasks = tasks.filter((t) => t.status === "revision");
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const doingTasks = tasks.filter((t) => t.status === "doing");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex h-full min-h-[600px] overflow-x-auto p-6 gap-6 bg-gray-50/50 items-start">
      {/* --- Column Revision (แสดงเฉพาะเมื่อมีงานแก้) --- */}
      {revisionTasks.length > 0 && (
        <Column
          title="Needs Revision / แก้ไข"
          count={revisionTasks.length}
          color="bg-red-50 text-red-700 border-red-200"
          headerColor="bg-red-100 text-red-800"
        >
          <div className="space-y-3">
            {revisionTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
                isAlert
              />
            ))}
          </div>
        </Column>
      )}

      {/* --- Column 1: To Do --- */}
      <Column
        title="To Do"
        count={todoTasks.length}
        color="bg-gray-100 border-gray-200"
        headerColor="bg-gray-200 text-gray-700"
      >
        {/* ปุ่มเพิ่มงาน */}
        <div className="mb-3">
          {isAdding ? (
            <form
              onSubmit={handleCreateTask}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-2"
            >
              <input
                autoFocus
                type="text"
                placeholder="ชื่องาน..."
                className="w-full text-sm outline-none mb-3 bg-transparent placeholder:text-gray-400"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <div className="flex justify-end gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover shadow-sm"
                >
                  เพิ่ม
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-xl transition-all border border-dashed border-gray-300 hover:border-gray-400"
            >
              <Plus className="w-4 h-4" /> เพิ่มงานใหม่
            </button>
          )}
        </div>

        <div className="space-y-3">
          {todoTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      </Column>

      {/* --- Column 2: Doing --- */}
      <Column
        title="In Progress"
        count={doingTasks.length}
        color="bg-blue-50/50 border-blue-100"
        headerColor="bg-blue-100 text-blue-700"
      >
        <div className="space-y-3">
          {doingTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      </Column>

      {/* --- Column 3: Done --- */}
      <Column
        title="Done"
        count={doneTasks.length}
        color="bg-green-50/50 border-green-100"
        headerColor="bg-green-100 text-green-700"
      >
        <div className="space-y-3">
          {doneTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      </Column>

      {/* --- Modal Popup --- */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchTasks} // อัปเดตเสร็จให้โหลดกระดานใหม่
        />
      )}
    </div>
  );
}

// --- Sub Components ---

function Column({ title, count, color, headerColor, children }: any) {
  return (
    <div
      className={`w-80 flex-shrink-0 flex flex-col rounded-2xl p-3 border ${color} bg-opacity-50 h-fit max-h-full`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${headerColor}`}
          >
            {title}
          </span>
          <span className="text-gray-400 text-xs font-semibold bg-white/50 px-2 py-0.5 rounded-md">
            {count}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1 hover:bg-black/5 rounded">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Column Body */}
      <div className="flex-1 overflow-y-auto min-h-[100px] pr-1 scrollbar-hide">
        {children}
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, isAlert }: any) {
  return (
    <div
      onClick={onClick}
      className={`
            p-4 rounded-xl shadow-sm border cursor-pointer transition-all duration-200 group relative overflow-hidden
            ${
              isAlert
                ? "bg-white border-red-200 shadow-red-100 hover:shadow-md hover:border-red-300"
                : "bg-white border-gray-100 hover:shadow-md hover:border-accent/50 hover:-translate-y-0.5"
            }
          `}
    >
      {/* แถบสีด้านซ้ายบอกสถานะ */}
      {isAlert && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
      )}

      <div className="flex justify-between items-start gap-2">
        <h4
          className={`text-sm font-medium leading-relaxed ${
            isAlert ? "text-red-700" : "text-gray-700 group-hover:text-accent"
          }`}
        >
          {task.title}
        </h4>
        {isAlert && (
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center -space-x-2 overflow-hidden">
          {/* Mockup รูป User (ของจริงต้องดึงจาก Assigned To) */}
          <div className="w-6 h-6 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">
            <UserIcon className="w-3 h-3" />
          </div>
        </div>

        {/* ID งานเล็กๆ */}
        <span className="text-[10px] text-gray-300 font-mono">#{task.id}</span>
      </div>
    </div>
  );
}
