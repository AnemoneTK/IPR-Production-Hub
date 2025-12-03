"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Send,
  Bug,
  Lightbulb,
  Image as ImageIcon,
  Loader2,
  X,
  Plus,
  History,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  PlayCircle,
  Archive,
} from "lucide-react";
// ดึง Config สีสถานะมาใช้ต่อ (เพื่อให้สีตรงกันทั้งเว็บ)
import { FEEDBACK_STATUSES } from "@/components/FeedbackModal";

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");

  // --- Form States ---
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // --- History States ---
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 1. Fetch History Data
  const fetchHistory = async () => {
    setLoadingHistory(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setMyFeedbacks(data || []);
    setLoadingHistory(false);
  };

  // โหลดข้อมูลเมื่อกด Tab History
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  // --- Actions ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 5) {
        alert("สูงสุด 5 รูป");
        return;
      }
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setSelectedFiles([...selectedFiles, ...newFiles]);
      setPreviewUrls([...previewUrls, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    const newPreviews = [...previewUrls];
    newPreviews.splice(index, 1);
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      const uploadedKeys: string[] = [];
      for (const file of selectedFiles) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: JSON.stringify({ name: file.name, type: file.type }),
        });
        const { url, fileName } = await uploadRes.json();
        await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        uploadedKeys.push(fileName);
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imageUrls: uploadedKeys,
          userId: user.id,
          userEmail: user.email,
          userName: profile?.display_name || "Unknown",
        }),
      });

      if (!res.ok) throw new Error("ส่งไม่สำเร็จ");
      setSent(true);
      // เคลียร์ฟอร์ม
      setFormData({ type: "bug", title: "", description: "" });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ศูนย์ช่วยเหลือ & แจ้งปัญหา
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            ส่งเรื่องถึงทีมงาน หรือติดตามสถานะงานที่แจ้งไป
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => {
              setActiveTab("submit");
              setSent(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "submit"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Send className="w-4 h-4" /> แจ้งเรื่องใหม่
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "history"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <History className="w-4 h-4" /> ประวัติการแจ้ง
          </button>
        </div>
      </div>

      {/* --- Tab 1: Submit Form --- */}
      {activeTab === "submit" && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          {sent ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ได้รับเรื่องแล้ว!
              </h2>
              <p className="text-gray-500 mb-6">
                ขอบคุณที่ช่วยแจ้งปัญหาครับ คุณสามารถติดตามสถานะได้ที่เมนู
                "ประวัติการแจ้ง"
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setSent(false)}
                  className="bg-gray-900 text-white px-6 py-2 rounded-xl hover:bg-black transition-colors"
                >
                  ส่งเรื่องอื่นต่อ
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  ดูประวัติ
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6"
            >
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
                  <Bug className="w-6 h-6" />{" "}
                  <span className="font-bold">แจ้ง Bug</span>
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
                  <Lightbulb className="w-6 h-6" />{" "}
                  <span className="font-bold">เสนอแนะ</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  หัวข้อเรื่อง
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-accent focus:outline-none"
                  placeholder="เช่น: อัปโหลดรูปไม่ได้"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  รายละเอียด
                </label>
                <textarea
                  rows={4}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-accent focus:outline-none resize-none"
                  placeholder="บอกรายละเอียดให้เราหน่อย..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  รูปภาพประกอบ ({selectedFiles.length}/5)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                />
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {previewUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
                    >
                      <img
                        src={url}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-accent hover:text-accent hover:bg-gray-50 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}{" "}
                ส่งรายงาน
              </button>
            </form>
          )}
        </div>
      )}

      {/* --- Tab 2: History List --- */}
      {activeTab === "history" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {loadingHistory ? (
            <div className="text-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : myFeedbacks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>คุณยังไม่เคยส่งรายการแจ้งปัญหา</p>
            </div>
          ) : (
            myFeedbacks.map((item) => {
              const statusConfig =
                FEEDBACK_STATUSES[
                  item.status as keyof typeof FEEDBACK_STATUSES
                ] || FEEDBACK_STATUSES.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
                >
                  {/* Icon Type */}
                  <div
                    className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === "bug"
                        ? "bg-red-50 text-red-500"
                        : "bg-blue-50 text-blue-500"
                    }`}
                  >
                    {item.type === "bug" ? (
                      <Bug className="w-5 h-5" />
                    ) : (
                      <Lightbulb className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900 truncate pr-2">
                        {item.title}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString("th-TH")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {item.description}
                    </p>

                    {/* Status Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${statusConfig.color
                        .replace("text-", "border-")
                        .replace("100", "200")} ${statusConfig.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
