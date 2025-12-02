"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Send,
  Bug,
  Lightbulb,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [formData, setFormData] = useState({
    type: "bug", // bug, feature
    title: "",
    description: "",
  });

  // Image Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // จัดการรูปภาพ
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

      // ดึงชื่อผู้ใช้
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      let uploadedImageKey = null;

      // 1. ถ้ามีรูป ให้อัปโหลดเข้า R2 ก่อน (ใช้ API เดิมที่มีอยู่แล้ว)
      if (selectedFile) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: JSON.stringify({
            name: selectedFile.name,
            type: selectedFile.type,
          }),
        });
        const { url, fileName } = await uploadRes.json();

        await fetch(url, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": selectedFile.type },
        });
        uploadedImageKey = fileName;
      }

      // 2. ส่งข้อมูลไป API Feedback
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imageUrl: uploadedImageKey,
          userId: user.id,
          userEmail: user.email,
          userName: profile?.display_name || "Unknown",
        }),
      });

      if (!res.ok) throw new Error("ส่งข้อมูลไม่สำเร็จ");

      setSent(true);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 animate-in zoom-in">
          <Send className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ส่งเรียบร้อยแล้ว!
        </h2>
        <p className="text-gray-500 mb-6">
          ขอบคุณสำหรับข้อมูล ทีมงานจะรีบตรวจสอบให้ครับ
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          ส่งเรื่องอื่นต่อ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        แจ้งปัญหา / เสนอแนะ
      </h1>
      <p className="text-gray-500 mb-8">
        เจอจุดที่พัง? หรืออยากได้ฟีเจอร์อะไรเพิ่ม? บอกเราได้เลย
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6"
      >
        {/* เลือกประเภท */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "bug" })}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              formData.type === "bug"
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-gray-100 hover:border-gray-200 text-gray-500"
            }`}
          >
            <Bug className="w-6 h-6" />
            <span className="font-bold">แจ้งปัญหา (Bug)</span>
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "feature" })}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              formData.type === "feature"
                ? "border-accent bg-blue-50 text-accent"
                : "border-gray-100 hover:border-gray-200 text-gray-500"
            }`}
          >
            <Lightbulb className="w-6 h-6" />
            <span className="font-bold">เสนอแนะ (Feature)</span>
          </button>
        </div>

        {/* หัวข้อ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            หัวข้อเรื่อง
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-accent focus:outline-none"
            placeholder={
              formData.type === "bug"
                ? "เช่น: อัปโหลดรูปไม่ได้, หน้าจอดำ"
                : "เช่น: อยากได้ Dark Mode"
            }
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
        </div>

        {/* รายละเอียด */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รายละเอียด (เป็นข้อๆ ได้เลย)
          </label>
          <textarea
            rows={5}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-accent focus:outline-none resize-none"
            placeholder="- อธิบายสิ่งที่เกิดขึ้น&#10;- ขั้นตอนที่ทำให้เกิดปัญหา&#10;- หรือรายละเอียดฟีเจอร์ที่อยากได้"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>

        {/* อัปรูป */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ภาพประกอบ (ถ้ามี)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />

          {previewUrl ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-gray-600 hover:text-red-500 hover:bg-white shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-accent hover:text-accent hover:bg-gray-50 transition-all"
            >
              <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm">คลิกเพื่ออัปโหลดรูปภาพ</span>
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          ส่งรายงาน
        </button>
      </form>
    </div>
  );
}
