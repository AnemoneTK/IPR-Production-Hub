"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  Settings,
  Activity,
  CheckCircle2,
  X,
} from "lucide-react";

// ตัวเลือกสถานะ
const PROJECT_STATUSES = [
  {
    value: "planning",
    label: "📝 วางแผน (Planning)",
    color: "bg-gray-100 text-gray-600",
  },
  {
    value: "production",
    label: "🔥 กำลังทำ (In Progress)",
    color: "bg-blue-50 text-blue-600",
  },
  {
    value: "paused",
    label: "⏸️ หยุดพัก (On Hold)",
    color: "bg-orange-50 text-orange-600",
  },
  {
    value: "done",
    label: "✅ เสร็จแล้ว (Completed)",
    color: "bg-green-50 text-green-600",
  },
];

export default function SettingsTab({ project }: { project: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: project.title || "",
    description: project.description || "",
    slug: project.slug || "",
    deadline: project.deadline
      ? new Date(project.deadline).toISOString().slice(0, 16)
      : "",
    status: project.status || "planning",
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 🔥 เพิ่ม State สำหรับ Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          title: formData.title,
          description: formData.description,
          slug: formData.slug,
          deadline: formData.deadline
            ? new Date(formData.deadline).toISOString()
            : null,
          status: formData.status,
        })
        .eq("id", project.id)
        .select(); // <--- 🔥 เพิ่มบรรทัดนี้ เพื่อขอข้อมูลที่อัปเดตกลับมา

      if (error) throw error;

      // 🔥 เพิ่มการเช็ค: ถ้า data ว่างเปล่า แปลว่าไม่ได้อัปเดตจริง (ไม่มีสิทธิ์)
      if (!data || data.length === 0) {
        alert(
          "คุณไม่มีสิทธิ์แก้ไขโปรเจกต์นี้ (ต้องเป็น Producer หรือ Manager)"
        );
        return; // หยุดทำงาน ไม่แสดง Success Modal
      }

      // ถ้าผ่าน ถึงจะโชว์ Modal
      setShowSuccessModal(true);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ฟังก์ชันปิด Modal และรีเฟรชหน้า
  const handleCloseSuccess = () => {
    setShowSuccessModal(false);

    // ถ้าเปลี่ยน Slug ต้องย้าย URL
    if (formData.slug !== project.slug) {
      router.push(`/dashboard/projects/${formData.slug}`);
    } else {
      // ถ้ารูปแบบเดิม ให้รีโหลดหน้าจอเพื่อให้ Header อัปเดตสถานะใหม่
      window.location.reload();
    }
  };

  const executeDelete = async () => {
    if (deleteInput !== project.title) return;
    setIsDeleting(true);

    try {
      const { data: files } = await supabase
        .from("files")
        .select("file_url")
        .eq("project_id", project.id);
      if (files && files.length > 0) {
        const fileKeys = files.map((f) => f.file_url);
        await fetch("/api/delete-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKeys }),
        });
      }
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);
      if (error) throw error;
      router.push("/dashboard/projects");
    } catch (error: any) {
      alert("ลบไม่สำเร็จ: " + error.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      {/* --- Form --- */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          ตั้งค่าทั่วไป
        </h3>
        <form onSubmit={handleUpdate} className="space-y-5">
          {/* Status Selector */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" /> สถานะโปรเจกต์
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_STATUSES.map((status) => (
                <label
                  key={status.value}
                  className={`
                            flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                            ${
                              formData.status === status.value
                                ? `${status.color} border-transparent ring-2 ring-offset-1 ring-blue-200 font-bold shadow-sm`
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                            }
                        `}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={formData.status === status.value}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="hidden"
                  />
                  <span className="text-sm">{status.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อโปรเจกต์
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:outline-none text-gray-500 font-mono text-sm bg-gray-50"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียด
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:outline-none resize-none transition-colors"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันกำหนดส่ง (Deadline)
            </label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
              value={formData.deadline}
              onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value })
              }
            />
          </div>

          <div className="pt-4 flex justify-end border-t border-gray-50 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
        <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Danger Zone
        </h3>
        <p className="text-sm text-gray-600 mb-6 max-w-lg">
          การลบโปรเจกต์จะทำให้ข้อมูลทั้งหมดหายไปถาวร ทั้งไฟล์งานใน Cloud,
          เนื้อเพลง และคอมเมนต์ ไม่สามารถกู้คืนได้
        </p>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all text-sm"
        >
          <Trash2 className="w-4 h-4" /> ฉันเข้าใจ, ลบโปรเจกต์นี้
        </button>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 text-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-700">
                ยืนยันการลบโปรเจกต์?
              </h3>
              <p className="text-sm text-red-600/80 mt-1">
                ไฟล์ทั้งหมดในระบบจะถูกลบและกู้คืนไม่ได้
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4 text-center">
                พิมพ์ชื่อโปรเจกต์{" "}
                <span className="font-bold select-all bg-gray-100 px-1 rounded text-gray-800">
                  {project.title}
                </span>{" "}
                เพื่อยืนยัน
              </p>
              <input
                autoFocus
                type="text"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors text-center font-medium placeholder:font-normal"
                placeholder="พิมพ์ชื่อโปรเจกต์ที่นี่..."
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteInput("");
                  }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={executeDelete}
                  disabled={deleteInput !== project.title || isDeleting}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}{" "}
                  ลบโปรเจกต์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Success Modal (New!) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-300">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center border-t-4 border-green-500 relative">
            <button
              onClick={handleCloseSuccess}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              บันทึกสำเร็จ!
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              ข้อมูลและการตั้งค่าโปรเจกต์ได้รับการอัปเดตเรียบร้อยแล้ว
            </p>
            <button
              onClick={handleCloseSuccess}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-500/30"
            >
              ตกลง, รีเฟรชหน้าจอ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
