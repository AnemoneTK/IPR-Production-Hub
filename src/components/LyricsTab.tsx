"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Save,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Mic,
  User,
  GripVertical,
} from "lucide-react";

// กำหนดโครงสร้างของท่อนเนื้อเพลง
interface LyricBlock {
  id: string;
  singer: string;
  text: string;
}

export default function LyricsTab({ projectId }: { projectId: number }) {
  // --- States ---
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [links, setLinks] = useState<any[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [isAddingLink, setIsAddingLink] = useState(false);

  // --- 1. โหลดข้อมูล ---
  useEffect(() => {
    const fetchData = async () => {
      // 1.1 โหลดเนื้อเพลง
      const { data: scriptData } = await supabase
        .from("scripts")
        .select("content, updated_at")
        .eq("project_id", projectId)
        .single();

      if (scriptData?.content) {
        try {
          // ลองแปลง Text กลับเป็น JSON Array
          const parsed = JSON.parse(scriptData.content);
          if (Array.isArray(parsed)) {
            setBlocks(parsed);
          } else {
            // ถ้าของเก่าเป็น Text ธรรมดา ให้แปลงเป็นบล็อกแรกบล็อกเดียว
            setBlocks([
              {
                id: Date.now().toString(),
                singer: "General",
                text: scriptData.content,
              },
            ]);
          }
        } catch (e) {
          // กันเหนียวกรณีแปลงไม่ได้
          setBlocks([
            {
              id: Date.now().toString(),
              singer: "General",
              text: scriptData.content,
            },
          ]);
        }
        setLastSaved(new Date(scriptData.updated_at));
      } else {
        // ถ้ายังไม่มีข้อมูลเลย ให้สร้างบล็อกเปล่าๆ รอไว้
        setBlocks([{ id: Date.now().toString(), singer: "", text: "" }]);
      }

      // 1.2 โหลดลิงก์ (เหมือนเดิม)
      const { data: linkData } = await supabase
        .from("reference_links")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setLinks(linkData || []);
    };
    fetchData();
  }, [projectId]);

  // --- 2. ระบบ Auto-Save ---
  // ใช้ useCallback เพื่อป้องกัน function ถูกสร้างใหม่ตลอดเวลา
  const handleSaveScript = useCallback(async () => {
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // แปลง Array บล็อก ให้กลายเป็น Text JSON เพื่อเก็บลง DB
    const contentToSave = JSON.stringify(blocks);

    const { error } = await supabase.from("scripts").upsert(
      {
        project_id: projectId,
        content: contentToSave,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );

    if (!error) {
      setLastSaved(new Date());
    }
    setIsSaving(false);
  }, [blocks, projectId]); // dependency คือ blocks (ถ้า blocks เปลี่ยน ฟังก์ชันนี้จะอัปเดต)

  // Trigger Auto-save เมื่อ blocks เปลี่ยน (Debounce 2 วินาที)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (blocks.length > 0) handleSaveScript();
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [blocks, handleSaveScript]);

  // --- Helpers ---

  // เพิ่มท่อนใหม่
  const addBlock = () => {
    setBlocks([...blocks, { id: Date.now().toString(), singer: "", text: "" }]);
  };

  // ลบท่อน
  const deleteBlock = (id: string) => {
    if (blocks.length === 1) return; // เหลือไว้อันนึงเสมอ
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  // แก้ไขข้อมูลในบล็อก
  const updateBlock = (id: string, field: "singer" | "text", value: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  // ฟังก์ชันสุ่มสีพาสเทลจากชื่อคนร้อง (เพื่อให้สีเดิมตลอดถ้าชื่อเหมือนเดิม)
  const getSingerColor = (name: string) => {
    if (!name) return "bg-gray-100 border-gray-200";
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash % 360);
    return `bg-[hsl(${hue},70%,96%)] border-[hsl(${hue},40%,80%)]`;
  };

  // --- Reference Functions (เหมือนเดิม) ---
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.title || !newLink.url) return;
    const { error } = await supabase.from("reference_links").insert({
      project_id: projectId,
      title: newLink.title,
      url: newLink.url,
    });
    if (!error) {
      setNewLink({ title: "", url: "" });
      setIsAddingLink(false);
      const { data } = await supabase
        .from("reference_links")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setLinks(data || []);
    }
  };
  const handleDeleteLink = async (id: number) => {
    if (!confirm("ลบลิงก์นี้?")) return;
    await supabase.from("reference_links").delete().eq("id", id);
    setLinks(links.filter((l) => l.id !== id));
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px] divide-y md:divide-y-0 md:divide-x divide-gray-100">
      {/* --- ฝั่งซ้าย: Lyrics Blocks --- */}
      <div className="flex-1 p-6 flex flex-col bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2 border-b border-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            🎤 เนื้อเพลง & คิวร้อง
          </h3>
          <div className="flex items-center gap-3 text-xs">
            {isSaving ? (
              <span className="text-accent flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> กำลังบันทึก...
              </span>
            ) : lastSaved ? (
              <span className="text-gray-400">
                บันทึกล่าสุด {lastSaved.toLocaleTimeString("th-TH")}
              </span>
            ) : null}
            <button
              onClick={handleSaveScript}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors font-medium"
            >
              <Save className="w-4 h-4" /> บันทึกทันที
            </button>
          </div>
        </div>

        {/* Blocks List */}
        <div className="flex-1 space-y-4 pb-20">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className={`flex gap-3 group relative transition-all duration-300`}
            >
              {/* Index Number */}
              <div className="pt-3 text-xs text-gray-300 font-mono w-6 text-right flex-shrink-0">
                {index + 1}
              </div>

              {/* Card */}
              <div
                className={`flex-1 rounded-xl border p-4 shadow-sm transition-all ${getSingerColor(
                  block.singer
                )}`}
              >
                {/* Singer Input */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-white/50 rounded-md text-gray-500">
                    <User className="w-3 h-3" />
                  </div>
                  <input
                    type="text"
                    placeholder="ระบุคนร้อง (เช่น Verse 1, นาย A)"
                    className="bg-transparent font-bold text-sm text-gray-700 placeholder:text-gray-400/70 outline-none w-full"
                    value={block.singer}
                    onChange={(e) =>
                      updateBlock(block.id, "singer", e.target.value)
                    }
                  />
                </div>

                {/* Lyrics Textarea */}
                <textarea
                  className="w-full bg-white/40 focus:bg-white rounded-lg p-2 text-base leading-relaxed text-gray-800 placeholder:text-gray-400 outline-none resize-none transition-colors border border-transparent focus:border-accent/20 min-h-[80px]"
                  placeholder="พิมพ์เนื้อเพลงท่อนนี้..."
                  rows={Math.max(2, block.text.split("\n").length)}
                  value={block.text}
                  onChange={(e) =>
                    updateBlock(block.id, "text", e.target.value)
                  }
                />
              </div>

              {/* Delete Button (Show on Hover) */}
              <button
                onClick={() => deleteBlock(block.id)}
                className="absolute -right-8 top-4 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="ลบท่อนนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Add Button */}
          <button
            onClick={addBlock}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-accent hover:border-accent/50 hover:bg-accent/5 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" /> เพิ่มท่อนใหม่
          </button>
        </div>
      </div>

      {/* --- ฝั่งขวา: References (เหมือนเดิมเป๊ะ) --- */}
      <div className="w-full md:w-80 lg:w-96 p-6 bg-gray-50/50 flex flex-col h-full sticky top-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            🔗 References
          </h3>
          <button
            onClick={() => setIsAddingLink(true)}
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {isAddingLink && (
          <form
            onSubmit={handleAddLink}
            className="mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2"
          >
            <input
              autoFocus
              type="text"
              placeholder="ชื่อลิงก์..."
              className="w-full text-sm mb-3 px-2 py-1 border-b border-gray-100 outline-none font-medium"
              value={newLink.title}
              onChange={(e) =>
                setNewLink({ ...newLink, title: e.target.value })
              }
            />
            <input
              type="url"
              placeholder="https://..."
              className="w-full text-sm mb-4 px-2 py-1 border-b border-gray-100 outline-none text-blue-600"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddingLink(false)}
                className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover shadow-sm"
              >
                เพิ่ม
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {links.length === 0 && !isAddingLink && (
            <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              ยังไม่มีลิงก์อ้างอิง
            </div>
          )}
          {links.map((link) => (
            <div
              key={link.id}
              className="group flex items-start justify-between bg-white p-3 rounded-xl border border-gray-100 hover:border-accent/30 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <h4 className="font-medium text-gray-700 text-sm truncate">
                  {link.title}
                </h4>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1 truncate"
                >
                  <LinkIcon className="w-3 h-3" /> {link.url}
                </a>
              </div>
              <button
                onClick={() => handleDeleteLink(link.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
