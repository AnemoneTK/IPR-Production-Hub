"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Settings,
  Type,
  AlignLeft,
  AlignCenter,
  Moon,
  Sun,
  Music,
  Loader2,
  UploadCloud,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// Types
interface LyricBlock {
  id: string;
  type: "lyrics" | "interlude" | "separator";
  name: string;
  htmlContent: string;
}

interface AudioFile {
  id: number;
  name: string;
  file_url: string;
  script_id?: number;
}

export default function SingerViewPage() {
  const params = useParams();
  const id = params.id as string;

  // Data State
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [playableUrl, setPlayableUrl] = useState<string>("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);

  // Settings State
  const [fontSize, setFontSize] = useState(24);
  const [textAlign, setTextAlign] = useState<"left" | "center">("center");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showSettings, setShowSettings] = useState(false);

  // Alert & Modal States
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ show: false, type: "success", title: "", message: "" });

  const [deleteTarget, setDeleteTarget] = useState<AudioFile | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error"
  ) => {
    setAlertConfig({ show: true, title, message, type });
    if (type === "success") {
      setTimeout(
        () => setAlertConfig((prev) => ({ ...prev, show: false })),
        2000
      );
    }
  };

  // Fetch Data
  const fetchData = useCallback(async () => {
    const { data: script } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", id)
      .single();

    if (script) {
      setTitle(script.title);
      try {
        const content = JSON.parse(script.content);
        setBlocks(Array.isArray(content) ? content : []);
      } catch {
        setBlocks([]);
      }

      let query = supabase
        .from("files")
        .select("id, name, file_url, script_id")
        .ilike("file_type", "audio%")
        .order("created_at", { ascending: false });

      if (id) {
        query = query.or(
          `script_id.eq.${id},project_id.eq.${script.project_id || 0}`
        );
      }

      const { data: files } = await query;

      if (files && files.length > 0) {
        const relevantFiles = files.filter(
          (f) => f.script_id === Number(id) || !f.script_id
        );
        setAudioFiles(relevantFiles);

        if (!selectedAudio && relevantFiles.length > 0) {
          setSelectedAudio(relevantFiles[0].file_url);
        }
      }
    }
    setLoading(false);
  }, [id, selectedAudio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Effect: Signed URL
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!selectedAudio) {
        setPlayableUrl("");
        return;
      }

      try {
        const res = await fetch("/api/get-signed-url", {
          method: "POST",
          body: JSON.stringify({ fileUrl: selectedAudio }),
        });
        const data = await res.json();
        if (data.signedUrl) {
          setPlayableUrl(data.signedUrl);
        }
      } catch (error) {
        console.error("Error fetching signed url:", error);
      }
    };

    fetchSignedUrl();
  }, [selectedAudio]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      showAlert("ผิดพลาด", "กรุณาอัปโหลดไฟล์เสียงเท่านั้น", "error");
      return;
    }

    setIsUploading(true);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type }),
      });

      if (!uploadRes.ok) throw new Error("Get upload URL failed");
      const { url, fileName } = await uploadRes.json();

      const r2Res = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!r2Res.ok) throw new Error("Upload to R2 failed");

      const saveRes = await fetch("/api/singer-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileName,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          scriptId: id,
        }),
      });

      if (!saveRes.ok) throw new Error("Save database failed");

      showAlert("สำเร็จ", "อัปโหลดไฟล์เสียงเรียบร้อย", "success");
      fetchData();
    } catch (error: any) {
      console.error(error);
      showAlert("ผิดพลาด", "อัปโหลดไม่สำเร็จ: " + error.message, "error");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Handle Delete File
  const handleDeleteClick = (file: AudioFile) => {
    setDeleteTarget(file);
  };

  const confirmDeleteFile = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch("/api/singer-delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: deleteTarget.file_url,
          fileId: deleteTarget.id,
        }),
      });

      if (!res.ok) throw new Error("ลบไฟล์ไม่สำเร็จ");

      const updatedFiles = audioFiles.filter((f) => f.id !== deleteTarget.id);
      setAudioFiles(updatedFiles);

      if (selectedAudio === deleteTarget.file_url) {
        setSelectedAudio(
          updatedFiles.length > 0 ? updatedFiles[0].file_url : ""
        );
      }

      showAlert("สำเร็จ", "ลบไฟล์เรียบร้อยแล้ว", "success");
    } catch (error: any) {
      showAlert("ผิดพลาด", error.message, "error");
    }
    setDeleteTarget(null);
  };
  const handleCloseTab = () => {
    window.close();
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );

  return (
    // 🔥 พื้นหลังหลัก: bg-slate-950 (Midnight Soft)
    <div
      className={`min-h-screen transition-colors duration-300 flex flex-col relative ${
        theme === "dark"
          ? "bg-slate-950 text-slate-100"
          : "bg-white text-slate-900"
      }`}
    >
      {/* --- Custom Alert Modal --- */}
      {alertConfig.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border scale-100 animate-in zoom-in-95 duration-200 relative ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-200"
            }`}
          >
            <button
              onClick={() =>
                setAlertConfig((prev) => ({ ...prev, show: false }))
              }
              className={`absolute top-4 right-4 ${
                theme === "dark"
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                alertConfig.type === "success"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {alertConfig.type === "success" ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <h3
              className={`text-lg font-bold mb-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {alertConfig.title}
            </h3>
            <p
              className={`text-sm mb-6 leading-relaxed ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {alertConfig.message}
            </p>

            <button
              onClick={() =>
                setAlertConfig((prev) => ({ ...prev, show: false }))
              }
              className={`w-full py-2.5 rounded-xl font-bold text-white transition-all active:scale-95 ${
                alertConfig.type === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border scale-100 animate-in zoom-in-95 duration-200 relative ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-red-100"
            }`}
          >
            <button
              onClick={() => setDeleteTarget(null)}
              className={`absolute top-4 right-4 ${
                theme === "dark"
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3
              className={`text-lg font-bold mb-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              ลบไฟล์เสียง?
            </h3>
            <p
              className={`text-sm mb-6 leading-relaxed ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              คุณต้องการลบไฟล์ <br />
              <span
                className={`font-bold ${
                  theme === "dark" ? "text-slate-200" : "text-slate-900"
                }`}
              >
                "{deleteTarget.name}"
              </span>{" "}
              <br />
              ใช่ไหม? (ไม่สามารถกู้คืนได้)
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className={`flex-1 py-2.5 font-medium rounded-xl transition-colors ${
                  theme === "dark"
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteFile}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบไฟล์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Top Bar --- */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 flex justify-between items-center backdrop-blur-md border-b ${
          theme === "dark"
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white/90 border-slate-200"
        }`}
      >
        <button
          onClick={handleCloseTab}
          className={`p-2 rounded-full transition-colors ${
            theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"
          }`}
          title="ปิดหน้านี้"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">
          {title}
        </h1>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-full transition-colors ${
            showSettings
              ? "bg-blue-500 text-white"
              : theme === "dark"
              ? "hover:bg-slate-800"
              : "hover:bg-slate-100"
          }`}
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* --- Settings Panel --- */}
      {showSettings && (
        <div
          className={`fixed top-[60px] left-0 right-0 z-40 p-6 border-b shadow-xl animate-in slide-in-from-top-5 max-h-[80vh] overflow-y-auto ${
            theme === "dark"
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Theme & Font */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase opacity-50">
                  การแสดงผล
                </label>
                <div className="flex gap-4">
                  <div className="flex bg-slate-200/20 rounded-lg p-1">
                    <button
                      onClick={() => setTheme("light")}
                      className={`p-2 rounded-md ${
                        theme === "light"
                          ? "bg-white shadow text-black"
                          : "text-slate-500"
                      }`}
                    >
                      <Sun className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`p-2 rounded-md ${
                        theme === "dark"
                          ? "bg-slate-700 shadow text-white"
                          : "text-slate-500"
                      }`}
                    >
                      <Moon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex bg-slate-200/20 rounded-lg p-1">
                    <button
                      onClick={() => setTextAlign("left")}
                      className={`p-2 rounded-md ${
                        textAlign === "left"
                          ? theme === "dark"
                            ? "bg-slate-700 shadow"
                            : "bg-white shadow"
                          : "text-slate-500"
                      }`}
                    >
                      <AlignLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTextAlign("center")}
                      className={`p-2 rounded-md ${
                        textAlign === "center"
                          ? theme === "dark"
                            ? "bg-slate-700 shadow"
                            : "bg-white shadow"
                          : "text-slate-500"
                      }`}
                    >
                      <AlignCenter className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase opacity-50">
                  ขนาดตัวอักษร
                </label>
                <div className="flex items-center gap-3">
                  <Type className="w-4 h-4 opacity-50" />
                  <input
                    type="range"
                    min="16"
                    max="64"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="w-8 text-sm text-right">{fontSize}px</span>
                </div>
              </div>
            </div>

            <hr
              className={`border-t ${
                theme === "dark" ? "border-slate-800" : "border-slate-200"
              }`}
            />

            {/* Audio Management */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase opacity-50 flex items-center gap-2">
                <Music className="w-4 h-4" /> ไฟล์เสียงในเพลงนี้
              </label>

              <div
                className={`relative group border-2 border-dashed rounded-xl p-6 transition-all text-center cursor-pointer ${
                  theme === "dark"
                    ? "border-slate-700 hover:border-blue-500 bg-slate-800/30"
                    : "border-slate-300 hover:border-blue-500 bg-white"
                }`}
              >
                <input
                  type="file"
                  accept="audio/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center gap-2 opacity-70 group-hover:opacity-100 group-hover:text-blue-500 transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                  <span className="text-xs font-medium">
                    {isUploading
                      ? "กำลังอัปโหลด..."
                      : "คลิก หรือ ลากไฟล์เสียงมาวางที่นี่"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {audioFiles.map((f) => (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      theme === "dark"
                        ? "bg-slate-800/50 border-slate-700"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        onClick={() => setSelectedAudio(f.file_url)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
                          selectedAudio === f.file_url
                            ? "bg-blue-500 text-white"
                            : "bg-slate-200/20"
                        }`}
                      >
                        <Music className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-sm truncate cursor-pointer ${
                          selectedAudio === f.file_url
                            ? "font-bold text-blue-500"
                            : ""
                        }`}
                        onClick={() => setSelectedAudio(f.file_url)}
                      >
                        {f.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(f)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Lyrics Content --- */}
      <div className="flex-1 overflow-y-auto px-4 py-24 md:px-8 max-w-4xl mx-auto w-full">
        <div style={{ textAlign: textAlign }} className="space-y-8">
          {blocks.map((block) => (
            <div key={block.id} className="space-y-2">
              {/* ชื่อท่อน */}
              {block.name && block.type !== "separator" && (
                <div
                  className={`text-sm font-bold uppercase tracking-wider mb-2 ${
                    theme === "dark" ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {block.name}
                </div>
              )}

              {/* Separator */}
              {block.type === "separator" ? (
                <div className="flex items-center gap-4 py-6 opacity-60">
                  <div
                    className={`h-[2px] flex-1 rounded-full ${
                      theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                    }`}
                  ></div>
                  <span
                    className={`text-base font-bold uppercase tracking-widest ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {block.name}
                  </span>
                  <div
                    className={`h-[2px] flex-1 rounded-full ${
                      theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                    }`}
                  ></div>
                </div>
              ) : /* Interlude */
              block.type === "interlude" ? (
                <div
                  className={`py-4 rounded-xl border-2 border-dashed font-medium text-lg italic opacity-70 ${
                    theme === "dark"
                      ? "border-slate-700 bg-slate-800/50 text-purple-300"
                      : "border-slate-300 bg-slate-50 text-purple-600"
                  }`}
                >
                  🎵 {block.name || "ดนตรี / Solo"}
                </div>
              ) : (
                /* Lyrics Text */
                <div
                  className={`leading-relaxed whitespace-pre-wrap outline-none [&_*]:!text-inherit [&_mark]:!text-slate-900 [&_mark]:!bg-yellow-200`}
                  style={{ fontSize: `${fontSize}px` }}
                  dangerouslySetInnerHTML={{ __html: block.htmlContent }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="h-32"></div>
      </div>

      {/* --- Audio Player --- */}
      {playableUrl && (
        <div
          className={`fixed bottom-0 left-0 right-0 p-4 border-t backdrop-blur-lg ${
            theme === "dark"
              ? "bg-slate-900/90 border-slate-800"
              : "bg-white/90 border-slate-200"
          }`}
        >
          <div className="max-w-3xl mx-auto">
            <audio
              key={playableUrl}
              controls
              preload="auto"
              playsInline
              className="w-full h-10 rounded-lg"
              controlsList="nodownload"
            >
              <source src={playableUrl} type="audio/mpeg" />
              Browser ของคุณไม่รองรับการเล่นเสียง
            </audio>
          </div>
        </div>
      )}
    </div>
  );
}
