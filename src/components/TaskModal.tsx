"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  X,
  Send,
  Calendar,
  Trash2,
  User as UserIcon,
  Check,
  Plus,
} from "lucide-react";

export default function TaskModal({
  task,
  members,
  onClose,
  onUpdate,
  onDelete,
}: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");

  // 🔥 แก้ไข 1: แปลงวันที่จาก UTC (DB) เป็น Local Time สำหรับ input
  const formatToLocalDatetime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offsetMs = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offsetMs)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  };

  const [dueDate, setDueDate] = useState(formatToLocalDatetime(task.due_date));
  const [assignedTo, setAssignedTo] = useState<string[]>(
    task.assigned_to || []
  );
  const [showMemberSelect, setShowMemberSelect] = useState(false);

  // 1. โหลดคอมเมนต์
  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("*, profiles(display_name)")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });
      setComments(data || []);
    };
    fetchComments();
  }, [task.id]);

  // 2. บันทึกการแก้ไข (Auto Save)
  const handleUpdateTask = async (field: string, value: any) => {
    if (field === "title") setTitle(value);
    if (field === "description") setDescription(value);

    // 🔥 แก้ไข 2: แปลงค่าจาก Input กลับเป็น UTC ISO String ก่อนส่ง DB
    if (field === "due_date") {
      setDueDate(value);
      if (value) {
        value = new Date(value).toISOString(); // แปลงกลับเป็น UTC
      } else {
        value = null;
      }
    }

    await supabase
      .from("tasks")
      .update({ [field]: value })
      .eq("id", task.id);
    onUpdate(); // เรียกให้หน้า Board รีเฟรชข้อมูล
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
    const { data } = await supabase
      .from("task_comments")
      .select("*, profiles(display_name)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div className="flex-1 mr-4">
            <input
              type="text"
              className="w-full bg-transparent font-bold text-xl text-gray-900 outline-none border-none placeholder:text-gray-400"
              value={title}
              onChange={(e) => handleUpdateTask("title", e.target.value)}
            />
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                  task.status === "revision"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {task.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Picker (แก้แล้ว) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Deadline
              </label>
              <input
                type="datetime-local"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-accent"
                value={dueDate}
                onChange={(e) => handleUpdateTask("due_date", e.target.value)}
              />
            </div>

            {/* Assignees */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <UserIcon className="w-3 h-3" /> ผู้รับผิดชอบ
              </label>
              <div className="flex flex-wrap gap-2">
                {assignedTo.map((id) => {
                  const member = members.find((m: any) => m.id === id);
                  if (!member) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1 pl-1 pr-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[9px]">
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
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-xs hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-3 h-3" /> เพิ่มคน
                </button>
              </div>

              {showMemberSelect && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden p-1">
                  {members.map((m: any) => {
                    const isSelected = assignedTo.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleAssignee(m.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-bold">
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
            <label className="text-xs font-bold text-gray-500 uppercase">
              รายละเอียด
            </label>
            <textarea
              rows={4}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-accent resize-none leading-relaxed"
              placeholder="ใส่รายละเอียดงาน..."
              value={description}
              onChange={(e) => handleUpdateTask("description", e.target.value)}
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-sm font-bold text-gray-800 mb-4">
              💬 ความคิดเห็น
            </h4>
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-center text-gray-400 text-xs py-4">
                  ยังไม่มีคอมเมนต์
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                    {c.profiles?.display_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none text-sm border border-gray-100">
                    <div className="flex justify-between items-center gap-4 mb-1">
                      <span className="font-bold text-gray-900 text-xs">
                        {c.profiles?.display_name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.created_at).toLocaleString("th-TH")}
                      </span>
                    </div>
                    <p className="text-gray-700">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-accent outline-none"
                placeholder="เขียนคอมเมนต์..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="bg-accent text-white p-2 rounded-xl hover:bg-accent-hover disabled:opacity-50"
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
