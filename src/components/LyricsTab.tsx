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
  Quote,
  CheckCircle2,
  Mic,
  Eraser,
  Wind,
  Music,
} from "lucide-react";

// Tiptap Imports
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";

// --- Interfaces ---
interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  quoted_text?: string;
  created_at: string;
}

interface SingerData {
  user_id: string;
  is_recorded: boolean;
}

interface LyricBlock {
  id: string;
  type: "lyrics" | "interlude";
  name: string;
  singers: SingerData[];
  htmlContent: string;
  comments: Comment[];
}

const HIGHLIGHT_COLORS = [
  { color: "#fef08a", label: "เหลือง" },
  { color: "#bbf7d0", label: "เขียว" },
  { color: "#bfdbfe", label: "ฟ้า" },
  { color: "#fbcfe8", label: "ชมพู" },
  { color: "#fed7aa", label: "ส้ม" },
  { color: "inherit", label: "ล้างสี" },
];

// Custom Highlight Extension
const CustomHighlight = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
      color: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor,
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          return {
            style: `background-color: ${attributes.color}; color: inherit`,
          };
        },
      },
    };
  },
});

export default function LyricsTab({ projectId }: { projectId: number }) {
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
      const { data: memberData } = await supabase
        .from("project_members")
        .select(
          "user_id, roles, assigned_color, profiles(id, display_name, avatar_url)"
        )
        .eq("project_id", projectId);

      const formattedMembers =
        memberData?.map((m: any) => ({
          ...(m.profiles || {}),
          roles: m.roles || [],
          assigned_color: m.assigned_color || "#bfdbfe",
        })) || [];
      setMembers(formattedMembers);

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
                type: b.type || "lyrics",
                singers: (b.singers || []).map((s: any) =>
                  typeof s === "string" ? { user_id: s, is_recorded: false } : s
                ),
                htmlContent: b.htmlContent || b.text || "",
                comments: b.comments || [],
              }))
            : [];
          setBlocks(formatted.length > 0 ? formatted : [createBlock("lyrics")]);
        } catch {
          setBlocks([createBlock("lyrics")]);
        }
        setLastSaved(new Date(scriptData.updated_at));
      } else {
        setBlocks([createBlock("lyrics")]);
      }

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

  const createBlock = (type: "lyrics" | "interlude"): LyricBlock => ({
    id: Date.now().toString(),
    type,
    name: type === "interlude" ? "Solo / Interlude" : "",
    singers: [],
    htmlContent: "<p></p>",
    comments: [],
  });

  const addBlock = (type: "lyrics" | "interlude") =>
    setBlocks([...blocks, createBlock(type)]);
  const updateBlock = (id: string, newData: Partial<LyricBlock>) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...newData } : b)));
  const deleteBlock = (id: string) =>
    setBlocks(blocks.filter((b) => b.id !== id));

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
                onDelete={() => deleteBlock(block.id)}
              />
            ))}

            <div className="grid grid-cols-2 gap-3 pb-10">
              <button
                onClick={() => addBlock("lyrics")}
                className="py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-accent hover:border-accent/50 hover:bg-white transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" /> เพิ่มท่อนเนื้อร้อง
              </button>
              <button
                onClick={() => addBlock("interlude")}
                className="py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50/50 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Music className="w-5 h-5" /> เพิ่มท่อนดนตรี
              </button>
            </div>
          </div>
        </div>
      </div>
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

function BlockItem({ index, block, members, onUpdate, onDelete }: any) {
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [showHighlighter, setShowHighlighter] = useState(false);
  const [showComments, setShowComments] = useState(
    (block.comments || []).length > 0
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [quoteText, setQuoteText] = useState<string | null>(null);

  const isInterlude = block.type === "interlude";

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      CustomHighlight.configure({ multicolor: true }),
      BubbleMenuExtension,
    ],
    content: block.htmlContent || "<p></p>",
    onUpdate: ({ editor }) => {
      onUpdate({ htmlContent: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm w-full p-4 outline-none min-h-[80px] focus:prose-p:text-gray-900 text-gray-700 max-w-none",
      },
    },
  });

  useEffect(() => {
    if (
      editor &&
      block.htmlContent !== editor.getHTML() &&
      editor.isEmpty &&
      block.htmlContent
    ) {
      editor.commands.setContent(block.htmlContent);
    }
  }, [block.id, editor]);

  const toggleSinger = (userId: string) => {
    const currentSingers = block.singers || [];
    const exists = currentSingers.find((s: any) => s.user_id === userId);
    let newSingers;
    if (exists)
      newSingers = currentSingers.filter((s: any) => s.user_id !== userId);
    else
      newSingers = [...currentSingers, { user_id: userId, is_recorded: false }];
    onUpdate({ singers: newSingers });
  };

  const toggleRecorded = (userId: string) => {
    const newSingers = block.singers.map((s: any) =>
      s.user_id === userId ? { ...s, is_recorded: !s.is_recorded } : s
    );
    onUpdate({ singers: newSingers });
  };

  const highlightWithSingerColor = (color: string) => {
    if (!editor) return;
    editor.chain().focus().setMark("highlight", { color: color }).run();
  };

  // 🔥 ฟังก์ชันแทรกจุดหายใจ
  const insertBreathMark = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(" 💨 ").run();
  };

  const handleQuote = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (text) {
      setQuoteText(text);
      setShowComments(true);
      editor.chain().focus().setMark("highlight", { color: "#fef08a" }).run();
    }
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
    const newId = Date.now().toString();
    const newComment: Comment = {
      id: newId,
      user_id: user?.id || "",
      user_name: profile?.display_name || "Me",
      text: commentInput,
      quoted_text: quoteText || undefined,
      created_at: new Date().toISOString(),
    };

    // ถ้าเป็นการ Quote ให้ฝัง ID ลงไปใน Highlight
    if (quoteText && editor) {
      editor
        .chain()
        .focus()
        .setMark("highlight", { color: "#fef08a", commentId: newId })
        .run();
    }

    onUpdate({ comments: [...(block.comments || []), newComment] });
    setCommentInput("");
    setQuoteText(null);
  };

  const deleteComment = (comment: Comment) => {
    if (editor && comment.quoted_text) {
      // ค้นหาและลบ Highlight ตาม ID
      const { doc } = editor.state;
      doc.descendants((node, pos) => {
        const marks = node.marks.filter(
          (m) => m.type.name === "highlight" && m.attrs.commentId === comment.id
        );
        if (marks.length > 0) {
          editor
            .chain()
            .setTextSelection({ from: pos, to: pos + node.nodeSize })
            .unsetHighlight()
            .run();
        }
      });
    }
    onUpdate({
      comments: (block.comments || []).filter(
        (c: Comment) => c.id !== comment.id
      ),
    });
  };

  const singerMembers = members.filter((m: any) =>
    (m.roles || []).includes("singer")
  );

  return (
    <div
      className={`group relative rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md ${
        isInterlude ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`flex justify-between items-center p-2 pl-3 border-b rounded-t-xl ${
          isInterlude
            ? "bg-gray-100 border-gray-200"
            : "bg-gray-50/50 border-gray-50"
        }`}
      >
        <div className="relative flex items-center gap-2 flex-1 flex-wrap">
          <input
            type="text"
            placeholder={
              isInterlude ? "ชื่อท่อนดนตรี..." : `ท่อนที่ ${index + 1}`
            }
            className="bg-transparent font-bold text-gray-700 text-sm w-32 outline-none placeholder:text-gray-400 focus:text-accent"
            value={block.name || ""}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />

          {!isInterlude && (
            <>
              <div className="h-4 w-px bg-gray-300 mx-1"></div>
              <button
                onClick={() => setShowMemberSelect(!showMemberSelect)}
                className={`flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-full hover:border-accent hover:text-accent transition-colors shadow-sm`}
              >
                <User className="w-3 h-3" />{" "}
                {block.singers?.length > 0
                  ? `${block.singers.length} คน`
                  : "เลือกคนร้อง"}
              </button>
              <div className="flex gap-2 flex-wrap">
                {(block.singers || []).map((s: any) => {
                  const member = members.find((m: any) => m.id === s.user_id);
                  return (
                    <button
                      key={s.user_id}
                      onClick={() => toggleRecorded(s.user_id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all shadow-sm`}
                      style={{
                        backgroundColor: s.is_recorded
                          ? "#dcfce7"
                          : member?.assigned_color || "#e2e8f0",
                        borderColor: s.is_recorded ? "#86efac" : "transparent",
                        opacity: s.is_recorded ? 1 : 0.9,
                      }}
                      title={s.is_recorded ? "อัดเสร็จแล้ว" : "ยังไม่อัด"}
                    >
                      {member?.display_name || "Unknown"}
                      {s.is_recorded && (
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-green-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {showMemberSelect && !isInterlude && (
            <div className="absolute top-full left-28 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden p-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 px-3 py-2 bg-gray-50 mb-1">
                เลือกนักร้อง
              </div>
              {singerMembers.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => toggleSinger(m.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm border border-white"
                      style={{ backgroundColor: m.assigned_color || "#bfdbfe" }}
                    >
                      {m.display_name?.substring(0, 2)}
                    </div>
                    <span className="truncate">{m.display_name}</span>
                  </div>
                  {block.singers?.some((s: any) => s.user_id === m.id) && (
                    <Check className="w-3 h-3 text-accent" />
                  )}
                </button>
              ))}
              <div
                className="fixed inset-0 z-[-1]"
                onClick={() => setShowMemberSelect(false)}
              ></div>
            </div>
          )}
        </div>

        {/* Right Tools */}
        <div className="flex gap-1 items-center">
          {/* 🔥 ปุ่มแทรกจุดหายใจ (อยู่ใน Header) */}
          {!isInterlude && (
            <button
              onClick={insertBreathMark}
              className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors mr-1"
              title="แทรกจุดหายใจ"
            >
              <Wind className="w-4 h-4" />
            </button>
          )}

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
                      highlightWithSingerColor(c.color);
                      setShowHighlighter(false);
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

      {/* Content Editor */}
      <div className="relative">
        {isInterlude ? (
          <div className="w-full h-16 flex items-center justify-center bg-gray-50 text-gray-400 text-sm font-medium">
            🎵 ท่อนดนตรี (Interlude / Solo)
          </div>
        ) : (
          <>
            {editor && (
              <BubbleMenu
                editor={editor}
                tippyOptions={{ duration: 100 }}
                className="flex flex-col gap-1 p-1.5 bg-white rounded-xl shadow-xl border border-gray-100 min-w-[160px]"
              >
                <div className="text-[10px] font-bold text-gray-400 uppercase px-2 pb-1 border-b border-gray-50 mb-1">
                  ไฮไลท์ตามคนร้อง
                </div>
                {block.singers && block.singers.length > 0 ? (
                  block.singers.map((s: any) => {
                    const member = members.find((m: any) => m.id === s.user_id);
                    if (!member) return null;
                    return (
                      <button
                        key={s.user_id}
                        onClick={() =>
                          highlightWithSingerColor(member.assigned_color)
                        }
                        className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg text-xs text-left w-full transition-colors group/btn"
                      >
                        <div
                          className="w-4 h-4 rounded-full border shadow-sm flex-shrink-0"
                          style={{ backgroundColor: member.assigned_color }}
                        />
                        <span className="truncate font-medium text-gray-700">
                          {member.display_name}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-400 px-2 py-2 text-center">
                    ยังไม่เลือกคนร้อง
                  </div>
                )}

                <div className="h-px bg-gray-100 my-1"></div>
                <div className="flex items-center justify-between px-1 pt-1">
                  <button
                    onClick={() =>
                      editor.chain().focus().unsetHighlight().run()
                    }
                    className="p-1.5 text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50 flex items-center gap-1 transition-colors"
                    title="ล้างสีไฮไลท์"
                  >
                    <Eraser className="w-4 h-4" />{" "}
                    <span className="text-[10px] font-bold">ล้าง</span>
                  </button>
                  <button
                    onClick={handleQuote}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="คอมเมนต์"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </BubbleMenu>
            )}
            <EditorContent editor={editor} />
          </>
        )}
      </div>

      {/* Footer */}
      {!isInterlude && (
        <div className="px-4 pb-3 border-t border-dashed border-gray-100 pt-2">
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              (block.comments || []).length > 0
                ? "text-accent"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <MessageSquare className="w-3 h-3" />{" "}
            {(block.comments || []).length} Comments
          </button>
          {showComments && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1">
              {quoteText && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-yellow-50 p-2.5 rounded-lg border border-yellow-100">
                  <Quote className="w-4 h-4 text-yellow-600 flex-shrink-0" />{" "}
                  <span className="italic truncate flex-1">"{quoteText}"</span>
                  <button
                    onClick={() => setQuoteText(null)}
                    className="hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={addComment} className="flex gap-2 relative">
                <input
                  type="text"
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                  placeholder={quoteText ? "แสดงความเห็น..." : "เขียนโน้ต..."}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="text-accent hover:text-accent-hover disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              {(block.comments || []).map((c: Comment) => (
                <div
                  key={c.id}
                  className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm group/comment"
                >
                  {c.quoted_text && (
                    <div className="mb-1.5 pl-2 border-l-2 border-yellow-300 text-gray-500 italic text-xs bg-yellow-50/50 p-1 rounded">
                      "{c.quoted_text}"
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <div>
                      <span className="font-bold text-gray-800 mr-1.5">
                        {c.user_name}:
                      </span>
                      <span className="text-gray-700">{c.text}</span>
                    </div>
                    <button
                      onClick={() => deleteComment(c)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 self-start"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
