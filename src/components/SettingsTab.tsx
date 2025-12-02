"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle, Loader2, Settings } from "lucide-react";

export default function SettingsTab({ project }: { project: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // State สำหรับฟอร์มแก้ไข
  const [formData, setFormData] = useState({
    title: project.title || "",
    description: project.description || "",
    slug: project.slug || "",
    deadline: project.deadline
      ? new Date(project.deadline).toISOString().slice(0, 16)
      : "",
  });

  // State สำหรับ Modal ลบโปรเจกต์
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. ฟังก์ชันบันทึกการแก้ไขข้อมูลทั่วไป
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: formData.title,
          description: formData.description,
          slug: formData.slug,
          deadline: formData.deadline
            ? new Date(formData.deadline).toISOString()
            : null,
        })
        .eq("id", project.id);

      if (error) throw error;

      alert("บันทึกข้อมูลเรียบร้อย!");
      // ถ้ามีการแก้ Slug ต้องเปลี่ยนหน้าไป URL ใหม่
      if (formData.slug !== project.slug) {
        router.push(`/dashboard/projects/${formData.slug}`);
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. ฟังก์ชันลบโปรเจกต์ (พร้อมลบไฟล์ใน R2)
  const executeDelete = async () => {
    // เช็คชื่อโปรเจกต์เพื่อความปลอดภัย
    if (deleteInput !== project.title) return;

    setIsDeleting(true);

    try {
      // Step A: ดึงรายชื่อไฟล์ทั้งหมดของโปรเจกต์นี้จาก Database ก่อน
      const { data: files } = await supabase
        .from("files")
        .select("file_url") // file_url เก็บชื่อไฟล์ใน R2 (Key)
        .eq("project_id", project.id);

      // Step B: ถ้ามีไฟล์ ให้สั่งลบออกจาก R2 ผ่าน API (Batch Delete)
      if (files && files.length > 0) {
        const fileKeys = files.map((f) => f.file_url);

        // เรียก API ที่เราเพิ่งสร้าง
        await fetch("/api/delete-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKeys }),
        });
      }

      // Step C: ลบโปรเจกต์ออกจาก Database
      // (ข้อมูลย่อยอย่าง Tasks, Members, Files ใน DB จะหายไปเองเพราะ Cascade)
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      // สำเร็จ! กลับหน้า Dashboard
      router.push("/dashboard/projects");
    } catch (error: any) {
      console.error(error);
      alert("ลบไม่สำเร็จ: " + error.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      {/* --- ส่วนฟอร์มแก้ไขข้อมูล --- */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          ตั้งค่าทั่วไป
        </h3>
        <form onSubmit={handleUpdate} className="space-y-4">
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
              )}
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </form>
      </div>

      {/* --- Danger Zone --- */}
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

      {/* --- Delete Modal --- */}
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
                  )}
                  ลบโปรเจกต์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
