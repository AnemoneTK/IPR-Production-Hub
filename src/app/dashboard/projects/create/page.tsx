"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Loader2, Calendar, FileText, Type } from "lucide-react";
import Link from "next/link";

// ฟังก์ชันสร้าง Slug (ไว้นอก component)
const generateSlug = (title: string) => {
  return title.toLowerCase().trim().replace(/ /g, "-");
  // ถ้าอยากให้รองรับภาษาไทยใน URL ก็ใช้แค่นี้พอครับ
};

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. หา User ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      // 2. สร้าง Slug
      const slug = generateSlug(formData.title);

      // 3. Insert Project
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
          slug: slug,
        })
        .select() // ขอข้อมูลกลับมาด้วย
        .single();

      if (projectError) {
        if (projectError.code === "23505") {
          throw new Error("ชื่อโปรเจกต์นี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนชื่อใหม่");
        }
        throw projectError;
      }

      // 4. Add Creator as Member (Producer)
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: projectData.id,
          user_id: user.id,
          roles: ["producer", "mixer"], // ใส่ Role เริ่มต้นให้ตัวเอง
        });

      if (memberError) throw memberError;

      // 5. ✅ Redirect ไปที่หน้า Workspace ของโปรเจกต์นั้นทันที (แก้ตรงนี้)
      router.push(`/dashboard/projects/${projectData.slug}`);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
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
