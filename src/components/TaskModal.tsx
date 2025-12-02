"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";

export default function TaskModal({ task, onClose, onUpdate }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. โหลดคอมเมนต์เก่าๆ พร้อมชื่อคนพิมพ์
  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from("task_comments")
        .select(
          `
          id, content, created_at,
          profiles ( display_name, avatar_url )
        `
        )
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });

      setComments(data || []);
      setLoading(false);
    };
    fetchComments();
  }, [task.id]);

  // 2. ฟังก์ชันส่งคอมเมนต์ใหม่
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: user.id,
      content: newComment,
    });

    if (!error) {
      setNewComment("");
      // โหลดใหม่แบบบ้านๆ (หรือจะ push array เอาเร็วๆ ก็ได้)
      const { data } = await supabase
        .from("task_comments")
        .select(`id, content, created_at, profiles ( display_name )`)
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });
      setComments(data || []);
    }
  };

  // 3. ฟังก์ชันแจ้งปัญหางาน (เปลี่ยนสถานะเป็น revision)
  const markAsRevision = async () => {
    await supabase
      .from("tasks")
      .update({ status: "revision" })
      .eq("id", task.id);
    onUpdate(); // แจ้ง component แม่ให้รีเฟรชหน้า
    onClose();
  };

  // 4. ฟังก์ชันย้ายสถานะปกติ
  const changeStatus = async (status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", task.id);
    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-lg text-gray-800">{task.title}</h3>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${
                task.status === "revision"
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-gray-100 border-gray-200 text-gray-500"
              }`}
            >
              {task.status === "revision"
                ? "🚨 มีปัญหา / รอแก้ไข"
                : task.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* ปุ่ม Action เปลี่ยนสถานะ */}
          <div className="grid grid-cols-2 gap-3">
            {task.status !== "done" && (
              <button
                onClick={() => changeStatus("done")}
                className="flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> งานเสร็จแล้ว
              </button>
            )}
            {task.status !== "revision" && (
              <button
                onClick={markAsRevision}
                className="flex items-center justify-center gap-2 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors"
              >
                <AlertTriangle className="w-4 h-4" /> แจ้งปัญหา/แก้
              </button>
            )}
          </div>

          {/* Chat / Comments Section */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              📝 หมายเหตุ & บันทึก
            </h4>
            <div className="space-y-3 mb-4 min-h-[100px]">
              {loading ? (
                <p className="text-xs text-gray-400 text-center">
                  กำลังโหลด...
                </p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center bg-gray-50 p-4 rounded-lg">
                  ยังไม่มีบันทึก
                </p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0 text-xs">
                      {c.profiles?.display_name?.substring(0, 2) || "U"}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-r-xl rounded-bl-xl border border-gray-100 flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold text-gray-900 text-xs">
                          {c.profiles?.display_name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(c.created_at).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendComment} className="relative">
              <input
                type="text"
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-accent focus:outline-none transition-colors text-sm"
                placeholder="เขียนหมายเหตุ หรือสิ่งที่ต้องแก้..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="absolute right-2 top-2 p-1.5 text-accent hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
