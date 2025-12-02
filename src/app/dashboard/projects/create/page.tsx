"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Loader2, Calendar, FileText, Type } from "lucide-react";
import Link from "next/link";

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase() // แปลงเป็นตัวเล็ก
      .trim()
      .replace(/ /g, "-"); // เปลี่ยนเว้นวรรคเป็นขีด
    // ถ้าอยากให้รองรับภาษาไทยใน URL ก็ใช้แค่นี้พอครับ Browser สมัยใหม่รองรับ
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      // +++ สร้าง Slug จากชื่อ +++
      // (ถ้าซ้ำมันจะ Error ซึ่งเราอาจจะต้องดัก error ว่าชื่อซ้ำภายหลัง)
      const slug = generateSlug(formData.title);

      // Insert ลง Database
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: formData.title,
          description: formData.description,
          deadline: formData.deadline
            ? new Date(formData.deadline).toISOString()
            : null,
          created_by: user.id,
          status: "planning",
          slug: slug, // <--- ใส่ Slug ลงไป
        })
        .select()
        .single();

      if (projectError) {
        // ดัก Error กรณีชื่อซ้ำ
        if (projectError.code === "23505") {
          // Code ของ Unique Violation
          throw new Error("ชื่อโปรเจกต์นี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนชื่อใหม่");
        }
        throw projectError;
      }

      // 3. (สำคัญ) เอาคนสร้าง ยัดเข้าไปเป็นสมาชิกคนแรกของโปรเจกต์ด้วย
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: projectData.id,
          user_id: user.id,
          roles: ["producer", "sound"], // ใส่ Role เริ่มต้นให้เขาหน่อย (แก้ทีหลังได้)
        });

      if (memberError) throw memberError;

      // 4. เสร็จแล้ว! กลับไปหน้า Dashboard หรือหน้ารวมโปรเจกต์
      router.push("/dashboard");
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* ปุ่มย้อนกลับ */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-gray-500 hover:text-accent mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        ย้อนกลับ
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-xl font-bold text-gray-900">
            สร้างโปรเจกต์ใหม่ 🚀
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            เริ่มวางแผนงานใหม่ของคุณที่นี่
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. ชื่อโปรเจกต์ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Type className="w-4 h-4 text-gray-400" /> ชื่อโปรเจกต์{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-accent focus:outline-none transition-colors"
                placeholder="เช่น: Cover เพลงรัก (Final)"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* 2. รายละเอียด */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" /> รายละเอียดโดยย่อ
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-accent focus:outline-none transition-colors resize-none"
                placeholder="อธิบายบรีฟงานคร่าวๆ..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* 3. วันกำหนดส่ง (Deadline) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" /> กำหนดส่งงาน
                (Deadline)
              </label>
              <input
                type="datetime-local"
                className="w-full px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-accent focus:outline-none transition-colors"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-accent hover:bg-accent-hover text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading && <Loader2 className="animate-spin w-4 h-4" />}
                สร้างโปรเจกต์
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
