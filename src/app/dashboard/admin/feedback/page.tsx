"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Shield,
  Loader2,
  Bug,
  Lightbulb,
  Search,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import FeedbackModal, { FEEDBACK_STATUSES } from "@/components/FeedbackModal";

export default function AdminFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal States
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  // 🔥 แก้ไข 1: เปลี่ยน state เก็บข้อมูลลบ ให้รองรับ Array ของรูป (string[])
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    imageUrls: string[];
  } | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Check Admin & Fetch Data
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin) {
        alert("หน้านี้สำหรับ Admin เท่านั้น");
        window.location.href = "/dashboard";
        return;
      }
      setIsAdmin(true);
      fetchFeedbacks();
    };
    init();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feedbacks")
      .select("*, profiles(display_name, email)")
      .order("created_at", { ascending: false });
    setFeedbacks(data || []);
    setLoading(false);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
    );
    await supabase.from("feedbacks").update({ status: newStatus }).eq("id", id);
  };

  // 🔥 แก้ไข 2: รับ image_urls (ที่เป็น Array) แทน image_url ตัวเดียว
  const promptDelete = (
    e: React.MouseEvent,
    id: number,
    imageUrls: string[] | null
  ) => {
    e.stopPropagation();
    // ถ้าไม่มีรูป ให้ส่ง array ว่างไป
    setDeleteTarget({ id, imageUrls: imageUrls || [] });
  };

  // 🔥 แก้ไข 3: ส่ง Array ไปให้ API ลบทีเดียวหมด
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      // A. ถ้ามีรูป (หลายรูป) ให้ลบออกจาก R2
      if (deleteTarget.imageUrls && deleteTarget.imageUrls.length > 0) {
        await fetch("/api/delete-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // ส่งไปทั้งก้อนเลย API delete-files เรารองรับ Array อยู่แล้ว
          body: JSON.stringify({ fileKeys: deleteTarget.imageUrls }),
        });
      }

      // B. ลบข้อมูลจาก Database
      const { error } = await supabase
        .from("feedbacks")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      // C. อัปเดตหน้าจอ
      setFeedbacks((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error: any) {
      alert("ลบไม่สำเร็จ: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalUpdate = () => {
    fetchFeedbacks();
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-orange-500" /> Admin Feedback Center
        </h1>
        <button
          onClick={fetchFeedbacks}
          className="text-sm text-gray-500 hover:text-accent"
        >
          รีเฟรชข้อมูล
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 w-48">สถานะ</th>
                <th className="px-6 py-4 w-24">ประเภท</th>
                <th className="px-6 py-4">หัวข้อ</th>
                <th className="px-6 py-4 w-40">ผู้แจ้ง</th>
                <th className="px-6 py-4 w-32 text-right">วันที่</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {feedbacks.map((item) => {
                const currentStatusConfig =
                  FEEDBACK_STATUSES[
                    item.status as keyof typeof FEEDBACK_STATUSES
                  ] || FEEDBACK_STATUSES["pending"];

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedFeedback(item)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  >
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value)
                          }
                          className={`
                                        appearance-none w-full px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border cursor-pointer outline-none transition-all
                                        ${currentStatusConfig.color
                                          .replace("text-", "border-")
                                          .replace("100", "200")} 
                                        ${currentStatusConfig.color}
                                    `}
                        >
                          {Object.entries(FEEDBACK_STATUSES).map(
                            ([key, config]: any) => (
                              <option
                                key={key}
                                value={key}
                                className="bg-white text-gray-700"
                              >
                                {config.label}
                              </option>
                            )
                          )}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <svg
                            className="fill-current h-3 w-3"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          item.type === "bug" ? "text-red-600" : "text-blue-600"
                        }`}
                      >
                        {item.type === "bug" ? (
                          <Bug className="w-3 h-3" />
                        ) : (
                          <Lightbulb className="w-3 h-3" />
                        )}
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 truncate max-w-md group-hover:text-accent transition-colors">
                        {item.title}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-700">
                        {item.profiles?.display_name || "Unknown"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 text-xs">
                      {new Date(item.created_at).toLocaleDateString("th-TH")}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {/* 🔥 แก้ไข 4: ส่ง item.image_urls (array) ไปแทน */}
                      <button
                        onClick={(e) =>
                          promptDelete(e, item.id, item.image_urls)
                        }
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="ลบรายการ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {feedbacks.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    ยังไม่มีรายการแจ้งปัญหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedFeedback && (
        <FeedbackModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onUpdate={handleModalUpdate}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-gray-900">
              ยืนยันการลบ?
            </h3>

            <p className="text-sm text-center text-gray-500 mt-2 mb-6 leading-relaxed">
              คุณต้องการลบรายการนี้ใช่ไหม <br />
              {/* แสดงจำนวนรูปที่จะถูกลบด้วย */}
              {deleteTarget.imageUrls.length > 0 && (
                <span className="text-red-600 font-bold block mt-1">
                  ⚠️ รูปภาพแนบ {deleteTarget.imageUrls.length} รูปจะถูกลบถาวร
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeleting ? "กำลังลบ..." : "ลบรายการ"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
