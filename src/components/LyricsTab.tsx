"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Save,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  User,
  MessageSquare,
  X,
  Check,
  Highlighter,
  MoreHorizontal,
  AlertTriangle,
  Send,
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
  name: string;
  singers: string[];
  htmlContent: string;
  comments: Comment[];
}

// สีไฮไลท์
const HIGHLIGHT_COLORS = [
  { color: "#fef08a", label: "เหลือง" },
  { color: "#bbf7d0", label: "เขียว" },
  { color: "#bfdbfe", label: "ฟ้า" },
  { color: "#fbcfe8", label: "ชมพู" },
  { color: "#fed7aa", label: "ส้ม" },
  { color: "transparent", label: "ล้างสี" },
];

export default function LyricsTab({ projectId }: { projectId: number }) {
  // Global States
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [isAddingLink, setIsAddingLink] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 1. Load Data
  useEffect(() => {
    const fetchData = async () => {
      // 1.1 Members
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

      // 1.2 Lyrics
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
                name: b.name || "",
                htmlContent: b.htmlContent || b.text || "",
                comments: b.comments || [],
              }))
            : [];
          setBlocks(
            formatted.length > 0
              ? formatted
              : [
                  {
                    id: Date.now().toString(),
                    name: "",
                    singers: [],
                    htmlContent: "",
                    comments: [],
                  },
                ]
          );
        } catch {
          setBlocks([
            {
              id: Date.now().toString(),
              name: "",
              singers: [],
              htmlContent: "",
              comments: [],
            },
          ]);
        }
        setLastSaved(new Date(scriptData.updated_at));
      } else {
        setBlocks([
          {
            id: Date.now().toString(),
            name: "",
            singers: [],
            htmlContent: "",
            comments: [],
          },
        ]);
      }

      // 1.3 Links
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
      {
        id: Date.now().toString(),
        name: "",
        singers: [],
        htmlContent: "",
        comments: [],
      },
    ]);
  const updateBlock = (id: string, newData: Partial<LyricBlock>) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...newData } : b)));

  // ฟังก์ชันลบ (ลบจาก State เลย เพราะการยืนยันทำที่ Child แล้ว)
  const deleteBlockDirectly = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
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
    <div className="flex flex-col md:flex-row h-full min-h-[600px] divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-hidden">
      {/* Editor Side */}
      <div className="flex-1 bg-gray-50/30 overflow-y-auto relative custom-scrollbar">
        <div className="p-6">
          <div className="sticky top-0 -mt-6 -mx-6 px-6 py-3 bg-white/90 backdrop-blur-md z-20 border-b border-gray-200/60 flex justify-between items-center shadow-sm">
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

          <div className="space-y-6 pb-20 mt-6">
            {blocks.map((block, index) => (
              <BlockItem
                key={block.id}
                index={index}
                block={block}
                members={members}
                onUpdate={(newData: Partial<LyricBlock>) =>
                  updateBlock(block.id, newData)
                }
                onDelete={() => deleteBlockDirectly(block.id)}
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
      </div>

      {/* References Side */}
      <div className="w-full md:w-80 lg:w-96 bg-white flex flex-col h-full border-l border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
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
              className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2"
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
                onChange={(e) =>
                  setNewLink({ ...newLink, url: e.target.value })
                }
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
        </div>
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-2 custom-scrollbar">
          {links.length === 0 && !isAddingLink && (
            <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
              ยังไม่มีลิงก์อ้างอิง
            </div>
          )}
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
    </div>
  );
}

// --- Sub-Component: Block Item ---
function BlockItem({ index, block, members, onUpdate, onDelete }: any) {
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [showHighlighter, setShowHighlighter] = useState(false);
  const [showComments, setShowComments] = useState(
    (block.comments || []).length > 0
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

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

  const applyHighlight = (color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (!contentRef.current?.contains(selection.anchorNode)) {
      contentRef.current?.focus();
      return;
    }
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, color);
    if (contentRef.current)
      onUpdate({ htmlContent: contentRef.current.innerHTML });
    setShowHighlighter(false);
  };

  const handleContentChange = () => {
    if (contentRef.current)
      onUpdate({ htmlContent: contentRef.current.innerHTML });
  };

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

  return (
    <div className="group relative rounded-xl border border-gray-200 shadow-sm bg-white transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center p-3 pb-2 border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
        <div className="relative flex items-center gap-2 flex-1">
          <input
            type="text"
            placeholder={`ท่อนที่ ${index + 1}`}
            className="bg-transparent font-bold text-gray-700 text-sm w-32 outline-none placeholder:text-gray-400 focus:text-accent focus:placeholder:text-accent/50"
            value={block.name || ""}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
          <div className="h-4 w-px bg-gray-300 mx-1"></div>
          <button
            onClick={() => setShowMemberSelect(!showMemberSelect)}
            className={`flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-full hover:border-accent hover:text-accent transition-colors shadow-sm`}
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
            <div className="absolute top-full left-20 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden p-1">
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

        <div className="flex gap-1 relative">
          <div className="relative">
            <button
              onClick={() => setShowHighlighter(!showHighlighter)}
              className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
              title="ไฮไลท์ข้อความ"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            {showHighlighter && (
              <div className="absolute top-full right-0 mt-2 p-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 flex gap-2">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.color}
                    className="w-6 h-6 rounded-full border shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyHighlight(c.color);
                    }}
                  />
                ))}
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => setShowHighlighter(false)}
                ></div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className={`p-1.5 rounded-lg transition-colors ${
                showDeleteConfirm
                  ? "bg-red-50 text-red-500"
                  : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {showDeleteConfirm && (
              <>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-red-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 text-center border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-800">
                      ยืนยันลบท่อนนี้?
                    </p>
                  </div>
                  <div className="flex">
                    <button
                      onClick={onDelete}
                      className="flex-1 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      ลบ
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
                <div
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setShowDeleteConfirm(false)}
                ></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        contentEditable
        className="w-full p-4 text-base leading-relaxed text-gray-800 outline-none min-h-[80px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 cursor-text whitespace-pre-wrap break-words"
        data-placeholder="พิมพ์เนื้อเพลงที่นี่..."
        onInput={handleContentChange}
        onBlur={handleContentChange}
        dangerouslySetInnerHTML={{ __html: block.htmlContent || "" }}
        style={{ lineHeight: "1.8" }}
      />

      {/* Footer */}
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
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
