"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  X,
  Check,
  AlertCircle,
  Clock,
  Archive,
  Loader2,
  PlayCircle,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";

// Config สถานะ (ปรับสีให้รองรับ Dark Mode)
export const FEEDBACK_STATUSES = {
  pending: {
    label: "รอตรวจสอบ",
    color:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-border",
    icon: Clock,
  },
  acknowledged: {
    label: "รับเรื่องแล้ว",
    color:
      "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Check,
  },
  in_progress: {
    label: "กำลังดำเนินการ",
    color:
      "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    icon: PlayCircle,
  },
  considering: {
    label: "เก็บไว้พิจารณา",
    color:
      "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: Archive,
  },
  blocked: {
    label: "ติดปัญหา / รอแก้",
    color:
      "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: AlertCircle,
  },
  done: {
    label: "เสร็จสิ้น",
    color:
      "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: Check,
  },
};

export default function FeedbackModal({ feedback, onClose, onUpdate }: any) {
  const [status, setStatus] = useState(feedback.status || "pending");
  const [updating, setUpdating] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // ดึงลิงก์รูป (ถ้ามี)
  useEffect(() => {
    const loadImages = async () => {
      // เช็คว่า image_urls (ใหม่) หรือ image_url (เก่า) มีข้อมูลไหม
      const keys =
        feedback.image_urls || (feedback.image_url ? [feedback.image_url] : []);

      if (keys.length > 0) {
        const urls = await Promise.all(
          keys.map(async (key: string) => {
            const res = await fetch("/api/download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileKey: key,
                originalName: "evidence.png",
              }),
            });
            const data = await res.json();
            return data.url;
          })
        );
        setImageUrls(urls);
      }
    };
    loadImages();
  }, [feedback]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    setStatus(newStatus); // เปลี่ยนสีทันทีเพื่อให้รู้ว่ากดแล้ว

    const { error } = await supabase
      .from("feedbacks")
      .update({ status: newStatus })
      .eq("id", feedback.id);

    if (error) {
      alert("อัปเดตไม่สำเร็จ");
      setStatus(feedback.status); // กลับไปค่าเดิมถ้าพัง
    } else {
      onUpdate();
    }
    setUpdating(false);
  };

  // ดึง Config สีของสถานะปัจจุบัน
  const currentStatusConfig =
    FEEDBACK_STATUSES[status as keyof typeof FEEDBACK_STATUSES] ||
    FEEDBACK_STATUSES["pending"];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {/* 🔥 แก้: bg-white -> bg-surface */}
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200 border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-start bg-surface-subtle/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  feedback.type === "bug"
                    ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800"
                }`}
              >
                {feedback.type}
              </span>
              <span className="text-primary-light text-xs">
                {new Date(feedback.created_at).toLocaleString("th-TH")}
              </span>
            </div>
            <h3 className="text-xl font-bold text-primary leading-snug">
              {feedback.title}
            </h3>
            <p className="text-sm text-primary-light mt-1">
              แจ้งโดย:{" "}
              <span className="font-medium text-primary">
                {feedback.profiles?.display_name || "Unknown"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-light hover:text-primary p-2 hover:bg-surface-subtle rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* --- Status Selector (ปรับปรุงใหม่ สวยงาม) --- */}
          <div>
            <label className="text-xs font-bold text-primary-light uppercase mb-3 block tracking-wider">
              อัปเดตสถานะงาน
            </label>
            <div className="relative group">
              {/* ไอคอนด้านซ้าย */}
              <div
                className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10 ${
                  currentStatusConfig.color.split(" ")[1] // ดึง text color มาใช้
                }`}
              >
                {updating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <StatusIcon className="w-5 h-5" />
                )}
              </div>

              {/* ตัว Select */}
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                className={`
                            appearance-none w-full pl-12 pr-10 py-4 rounded-xl text-sm font-bold border-2 cursor-pointer outline-none transition-all duration-200
                            ${currentStatusConfig.color} 
                            hover:brightness-95 dark:hover:brightness-110 focus:ring-4 focus:ring-opacity-20 focus:ring-current
                        `}
              >
                {Object.entries(FEEDBACK_STATUSES).map(([key, config]: any) => (
                  <option
                    key={key}
                    value={key}
                    // 🔥 แก้: bg-white -> bg-surface, text-gray-700 -> text-primary
                    className="bg-surface text-primary py-2"
                  >
                    {config.label}
                  </option>
                ))}
              </select>

              {/* ไอคอนลูกศรด้านขวา */}
              <div
                className={`absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none ${
                  currentStatusConfig.color.split(" ")[1]
                }`}
              >
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                รายละเอียด
              </h4>
              <div className="text-primary text-sm whitespace-pre-wrap leading-relaxed bg-surface-subtle p-5 border border-border rounded-xl">
                {feedback.description || "- ไม่มีรายละเอียด -"}
              </div>
            </div>

            {/* Image Evidence */}
            {(feedback.image_urls?.length > 0 || feedback.image_url) && (
              <div>
                <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary-light" /> หลักฐาน /
                  ภาพประกอบ
                </h4>
                {imageUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {imageUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block relative group rounded-xl overflow-hidden border-2 border-border hover:border-accent/50 transition-all"
                      >
                        <div className="bg-surface-subtle aspect-video flex items-center justify-center">
                          <img
                            src={url}
                            alt={`Evidence ${i}`}
                            className="max-w-full max-h-[200px] object-contain shadow-sm"
                          />
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 bg-surface-subtle rounded-xl flex items-center justify-center text-primary-light border-2 border-dashed border-border">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-xs">กำลังโหลดรูปภาพ...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
