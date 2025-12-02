"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Save,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Mic,
  User,
  MessageSquare,
  X,
  Check,
  MoreHorizontal,
} from "lucide-react";

// --- Interfaces ---
interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

interface LyricBlock {
  id: string;
  singers: string[];
  text: string;
  comments: Comment[];
}

export default function LyricsTab({ projectId }: { projectId: number }) {
  // Global States
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [isAddingLink, setIsAddingLink] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 1. Load Data
  useEffect(() => {
    const fetchData = async () => {
      // 1.1 ดึง Members (Defensive check included)
      const { data: memberData } = await supabase
        .from("project_members")
        .select("roles, profiles(id, display_name, avatar_url)")
        .eq("project_id", projectId);

      const formattedMembers =
        memberData?.map((m: any) => ({
          ...(m.profiles || {}),
          roles: m.roles || [],
        })) || [];

      setMembers(formattedMembers);

      // 1.2 ดึง Lyrics Content
      const { data: scriptData } = await supabase
        .from("scripts")
        .select("content, updated_at")
        .eq("project_id", projectId)
        .single();

      if (scriptData?.content) {
        try {
          const parsed = JSON.parse(scriptData.content);
          const formatted = Array.isArray(parsed)
            ? parsed.map((b: any) => ({
                ...b,
                // ดึงค่า text กลับมา (รองรับทั้งแบบเก่าและแบบ htmlContent)
                text: b.text || b.htmlContent?.replace(/<[^>]+>/g, "") || "",
                comments: b.comments || [],
              }))
            : [];
          setBlocks(
            formatted.length > 0
              ? formatted
              : [
                  {
                    id: Date.now().toString(),
                    singers: [],
                    text: "",
                    comments: [],
                  },
                ]
          );
        } catch {
          setBlocks([
            { id: Date.now().toString(), singers: [], text: "", comments: [] },
          ]);
        }
        setLastSaved(new Date(scriptData.updated_at));
      } else {
        setBlocks([
          { id: Date.now().toString(), singers: [], text: "", comments: [] },
        ]);
      }

      // 1.3 ดึง Links
      const { data: linkData } = await supabase
        .from("reference_links")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setLinks(linkData || []);
    };
    fetchData();
  }, [projectId]);

  // 2. Auto Save
  const handleSaveScript = useCallback(async () => {
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    if (!error) setLastSaved(new Date());
    setIsSaving(false);
  }, [blocks, projectId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (blocks.length > 0) handleSaveScript();
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [blocks, handleSaveScript]);

  // Actions
  const addBlock = () =>
    setBlocks([
      ...blocks,
      { id: Date.now().toString(), singers: [], text: "", comments: [] },
    ]);
  const updateBlock = (id: string, newData: Partial<LyricBlock>) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...newData } : b)));
  const confirmDeleteBlock = () => {
    if (deleteTargetId) {
      setBlocks(blocks.filter((b) => b.id !== deleteTargetId));
      setDeleteTargetId(null);
    }
  };

  // Links Actions
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.title || !newLink.url) return;
    const { error } = await supabase
      .from("reference_links")
      .insert({ project_id: projectId, ...newLink });
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
      {/* Editor Side */}
      <div className="flex-1 p-6 flex flex-col bg-gray-50/30">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/80 backdrop-blur z-20 py-2 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            🎤 เนื้อเพลง & คิวร้อง
          </h3>
          <div className="flex items-center gap-3 text-xs">
            {isSaving ? (
              <span className="text-accent flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> บันทึก...
              </span>
            ) : (
              lastSaved && (
                <span className="text-gray-400">
                  ล่าสุด {lastSaved.toLocaleTimeString("th-TH")}
                </span>
              )
            )}
            <button
              onClick={handleSaveScript}
              className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors font-medium"
            >
              <Save className="w-4 h-4" /> บันทึก
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-6 pb-20">
          {blocks.map((block, index) => (
            <BlockItem
              key={block.id}
              index={index}
              block={block}
              members={members}
              onUpdate={(newData: Partial<LyricBlock>) =>
                updateBlock(block.id, newData)
              }
              onDelete={() => setDeleteTargetId(block.id)}
            />
          ))}
          <button
            onClick={addBlock}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-accent hover:border-accent/50 hover:bg-white transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" /> เพิ่มท่อนใหม่
          </button>
        </div>
      </div>

      {/* References Side */}
      <div className="w-full md:w-80 lg:w-96 p-6 bg-white flex flex-col h-full sticky top-0 border-l border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            🔗 References
          </h3>
          <button
            onClick={() => setIsAddingLink(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {isAddingLink && (
          <form
            onSubmit={handleAddLink}
            className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100"
          >
            <input
              autoFocus
              type="text"
              placeholder="ชื่อลิงก์..."
              className="w-full text-sm mb-2 px-2 py-1 bg-transparent border-b outline-none"
              value={newLink.title}
              onChange={(e) =>
                setNewLink({ ...newLink, title: e.target.value })
              }
            />
            <input
              type="url"
              placeholder="URL..."
              className="w-full text-sm mb-3 px-2 py-1 bg-transparent border-b outline-none text-blue-600"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddingLink(false)}
                className="text-gray-500"
              >
                ยกเลิก
              </button>
              <button type="submit" className="text-accent font-bold">
                เพิ่ม
              </button>
            </div>
          </form>
        )}
        <div className="flex-1 overflow-y-auto space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-start justify-between bg-white p-3 rounded-lg border border-gray-100 hover:border-accent/30 hover:shadow-sm transition-all group"
            >
              <div className="min-w-0">
                <div className="font-medium text-gray-700 text-sm truncate">
                  {link.title}
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5 truncate"
                >
                  <LinkIcon className="w-3 h-3" /> {link.url}
                </a>
              </div>
              <button
                onClick={() => handleDeleteLink(link.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900">
              ลบท่อนนี้?
            </h3>
            <p className="text-sm text-center text-gray-500 mt-2 mb-6">
              คุณแน่ใจหรือไม่ที่จะลบท่อนเนื้อเพลงนี้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteBlock}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/30"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Component: Block Item ---
function BlockItem({ index, block, members, onUpdate, onDelete }: any) {
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [showComments, setShowComments] = useState(
    (block.comments || []).length > 0
  );
  const [commentInput, setCommentInput] = useState("");

  // 1. กรองเฉพาะคนที่มี Role 'singer' (Safety Check included)
  const singerMembers = members.filter((m: any) =>
    (m.roles || []).includes("singer")
  );

  const toggleSinger = (userId: string) => {
    const currentSingers = block.singers || [];
    const newSingers = currentSingers.includes(userId)
      ? currentSingers.filter((id: string) => id !== userId)
      : [...currentSingers, userId];
    onUpdate({ singers: newSingers });
  };

  // Comment functions
  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user?.id)
      .single();
    const newComment: Comment = {
      id: Date.now().toString(),
      user_id: user?.id || "",
      user_name: profile?.display_name || "Me",
      text: commentInput,
      created_at: new Date().toISOString(),
    };
    onUpdate({ comments: [...(block.comments || []), newComment] });
    setCommentInput("");
    setShowComments(true);
  };
  const deleteComment = (commentId: string) => {
    onUpdate({
      comments: (block.comments || []).filter(
        (c: Comment) => c.id !== commentId
      ),
    });
  };

  // --- ส่วนที่แก้ไขเพื่อแก้ Error ---
  // ใช้ (block.text || '') เพื่อกัน undefined ก่อน split
  const rowCount = Math.max(2, (block.text || "").split("\n").length);

  return (
    <div className="group relative rounded-xl border border-gray-200 shadow-sm bg-white transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start p-3 pb-0 border-b border-gray-50 bg-gray-50/50 rounded-t-xl h-12">
        <div className="relative flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 mr-1 select-none">
            #{index + 1}
          </span>
          <button
            onClick={() => setShowMemberSelect(!showMemberSelect)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-full hover:border-accent hover:text-accent transition-colors shadow-sm"
          >
            <User className="w-3 h-3" />
            {block.singers?.length > 0
              ? `${block.singers.length} คน`
              : "เลือกคนร้อง"}
          </button>
          <div className="flex -space-x-1 overflow-hidden">
            {(block.singers || []).map((singerId: string) => {
              const member = members.find((m: any) => m.id === singerId);
              return (
                <div
                  key={singerId}
                  className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[9px] font-bold text-blue-600 cursor-help"
                  title={member?.display_name}
                >
                  {member?.display_name?.substring(0, 2).toUpperCase()}
                </div>
              );
            })}
          </div>
          {showMemberSelect && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden p-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 px-3 py-2 bg-gray-50 mb-1">
                เลือกนักร้อง (Singers Only)
              </div>
              {singerMembers.length > 0 ? (
                singerMembers.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => toggleSinger(m.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-200 text-[9px] flex items-center justify-center font-bold text-gray-500">
                        {m.display_name?.substring(0, 2)}
                      </div>
                      <span className="truncate">{m.display_name}</span>
                    </div>
                    {block.singers?.includes(m.id) && (
                      <Check className="w-3 h-3 text-accent" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-center text-gray-400">
                  ยังไม่มีตำแหน่ง Singer ในทีม
                </div>
              )}
              <div
                className="fixed inset-0 z-[-1]"
                onClick={() => setShowMemberSelect(false)}
              ></div>
            </div>
          )}
        </div>

        {/* ปุ่มลบ */}
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content: Textarea (แก้ปัญหาพิมพ์แล้วเด้งหน้าสุด + แก้ Error split) */}
      <textarea
        className="w-full p-4 text-base leading-relaxed text-gray-800 placeholder:text-gray-400/70 outline-none resize-none min-h-[80px] bg-transparent"
        placeholder="พิมพ์เนื้อเพลงที่นี่..."
        // ใส่ logic คำนวณบรรทัดที่แก้แล้ว
        rows={rowCount}
        value={block.text || ""} // กัน undefined
        onChange={(e) => onUpdate({ text: e.target.value })}
      />

      {/* Footer: Comments */}
      <div className="px-4 pb-3 border-t border-dashed border-gray-100 pt-2">
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${
            (block.comments || []).length > 0
              ? "text-accent"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <MessageSquare className="w-3 h-3" /> {(block.comments || []).length}{" "}
          Comments
        </button>
        {showComments && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1">
            {(block.comments || []).map((c: Comment) => (
              <div
                key={c.id}
                className="flex gap-2 text-xs group/comment bg-gray-50 p-2 rounded-lg border border-gray-100"
              >
                <div className="font-bold text-gray-700 whitespace-nowrap">
                  {c.user_name}:
                </div>
                <div className="text-gray-600 flex-1">{c.text}</div>
                <button
                  onClick={() => deleteComment(c.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <form onSubmit={addComment} className="flex gap-2 relative">
              <input
                type="text"
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-accent outline-none"
                placeholder="เขียนโน้ต..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="text-accent hover:text-accent-hover disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
