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
  MoreHorizontal,
  Send,
  Quote,
  CheckCircle2,
  Mic,
  Eraser,
  Wind,
  Music,
  GripVertical,
  Copy,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  RotateCcw,
  Youtube,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

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

const CustomHighlight = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      commentId: {
        default: null,
        parseHTML: (e) => e.getAttribute("data-comment-id"),
        renderHTML: (a) =>
          a.commentId ? { "data-comment-id": a.commentId } : {},
      },
      color: {
        default: null,
        parseHTML: (e) => e.style.backgroundColor,
        renderHTML: (a) =>
          a.color
            ? { style: `background-color: ${a.color}; color: inherit` }
            : {},
      },
    };
  },
});

const getYouTubeID = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export default function LyricsTab({ projectId }: { projectId: number }) {
  // Data States
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  // UI States
  const [activeSubTab, setActiveSubTab] = useState<"script" | "refs">("script");
  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // --- Resizable Sidebar State ---
  const [sidebarWidth, setSidebarWidth] = useState(400); // ค่าชั่วคราว
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Filter Links
  const youtubeLinks = links.filter((l) => getYouTubeID(l.url));
  const generalLinks = links.filter((l) => !getYouTubeID(l.url));

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

  // 1.5 Set Initial Width (Default & Max)
  const calculateMaxWidth = () => {
    if (typeof window !== "undefined") {
      return window.innerWidth / 2 - 100;
    }
    return 400; // fallback
  };

  useEffect(() => {
    setSidebarWidth(calculateMaxWidth());
  }, []);

  // 2. Auto Save
  const handleSaveScript = useCallback(async () => {
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("scripts").upsert(
      {
        project_id: projectId,
        content: JSON.stringify(blocks),
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

  // --- Resizable Logic (Constraint Applied) ---
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        const maxWidth = calculateMaxWidth(); // คำนวณค่าสูงสุดปัจจุบัน

        if (newWidth > 350) {
          // ถ้ากว้างกว่า Max ให้ล็อคไว้ที่ Max (ไม่ให้เกิน)
          if (newWidth >= maxWidth) {
            setSidebarWidth(maxWidth);
          } else {
            // ถ้าน้อยกว่า Max (แต่มากกว่า 250) ให้ย่อได้ตามปกติ
            setSidebarWidth(newWidth);
          }
        }
      }
    },
    [isResizing]
  );

  const handleResetWidth = () => {
    setSidebarWidth(calculateMaxWidth());
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const createBlock = (type: "lyrics" | "interlude"): LyricBlock => ({
    id: Date.now().toString(),
    type,
    name: type === "interlude" ? "Interlude / Solo" : "",
    singers: [],
    htmlContent: "<p></p>",
    comments: [],
  });

  // Actions
  const addBlock = (type: "lyrics" | "interlude", index?: number) => {
    const newBlock = createBlock(type);
    if (typeof index === "number") {
      const newBlocks = [...blocks];
      newBlocks.splice(index, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
  };
  const updateBlock = (id: string, newData: Partial<LyricBlock>) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...newData } : b)));
  const deleteBlock = (id: string) =>
    setBlocks(blocks.filter((b) => b.id !== id));

  const duplicateBlock = (block: LyricBlock) => {
    const newBlock = { ...block, id: Date.now().toString(), comments: [] };
    const index = blocks.findIndex((b) => b.id === block.id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    )
      return;
    const items = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;
    setBlocks(items);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBlocks(items);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.title || !newLink.url) return;
    await supabase
      .from("reference_links")
      .insert({ project_id: projectId, ...newLink });
    setNewLink({ title: "", url: "" });
    setIsAddingLink(false);
    const { data } = await supabase
      .from("reference_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setLinks(data || []);
  };
  const handleDeleteLink = async (id: number) => {
    if (!confirm("ลบลิงก์นี้?")) return;
    await supabase.from("reference_links").delete().eq("id", id);
    setLinks(links.filter((l) => l.id !== id));
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px] overflow-hidden">
      {/* --- Main Content (Left Side) --- */}
      <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden relative">
        {/* Top Bar with Sub-Tabs */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-6 py-3 flex justify-between items-center shadow-sm">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab("script")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSubTab === "script"
                  ? "bg-blue-50 text-accent ring-1 ring-blue-100"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <FileText className="w-4 h-4" /> เนื้อเพลง & บท
            </button>
            <button
              onClick={() => setActiveSubTab("refs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSubTab === "refs"
                  ? "bg-purple-50 text-purple-600 ring-1 ring-purple-100"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <LinkIcon className="w-4 h-4" /> General References
            </button>
          </div>

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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeSubTab === "script" ? (
            /* --- Lyrics Script View --- */
            <>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="lyrics-list">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-0 pb-20"
                    >
                      {blocks.map((block, index) => (
                        <Draggable
                          key={block.id}
                          draggableId={block.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                marginBottom: "10px",
                                opacity: snapshot.isDragging ? 0.8 : 1,
                              }}
                              // 🔥 สำคัญ 1: เพิ่ม hover:z-20 ตรงนี้ เพื่อยกทั้งก้อนให้ลอยเหนือเพื่อนบ้านตอนเอาเมาส์ชี้
                              className="relative hover:z-20 group/block"
                            >
                              <BlockItem
                                index={index}
                                block={block}
                                members={members}
                                onUpdate={(newData: Partial<LyricBlock>) =>
                                  updateBlock(block.id, newData)
                                }
                                onDelete={() => deleteBlock(block.id)}
                                onDuplicate={() => duplicateBlock(block)}
                                onMoveUp={() => moveBlock(index, "up")}
                                onMoveDown={() => moveBlock(index, "down")}
                                dragHandleProps={provided.dragHandleProps}
                              />

                              {/* ส่วนปุ่มแทรก (Insert Button) */}
                              {/* 🔥 สำคัญ 2: ปรับตำแหน่งและความสูงให้รับเมาส์ง่ายขึ้น */}
                              <div className="absolute left-0 right-0 -bottom-5 h-10 z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200">
                                <div className="flex items-center justify-center gap-2 transform scale-y-75 opacity-0 hover:scale-y-100 hover:opacity-100 transition-all duration-200 w-full origin-center">
                                  <div className="h-px bg-blue-200 flex-1 opacity-50"></div>
                                  <button
                                    onClick={() =>
                                      addBlock("lyrics", index + 1)
                                    }
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-50 hover:border-blue-300 shadow-sm transition-colors hover:scale-105"
                                  >
                                    <PlusCircle className="w-3 h-3" /> เนื้อร้อง
                                  </button>
                                  <button
                                    onClick={() =>
                                      addBlock("interlude", index + 1)
                                    }
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-200 text-purple-600 rounded-full text-xs font-bold hover:bg-purple-50 hover:border-purple-300 shadow-sm transition-colors hover:scale-105"
                                  >
                                    <Music className="w-3 h-3" /> ดนตรี
                                  </button>
                                  <div className="h-px bg-blue-200 flex-1 opacity-50"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <div className="grid grid-cols-2 gap-3 pb-10">
                <button
                  onClick={() => addBlock("lyrics")}
                  className="py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-accent hover:border-accent/50 hover:bg-white transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" /> เพิ่มท่อนเนื้อร้อง
                </button>
                <button
                  onClick={() => addBlock("interlude")}
                  className="py-4 border-2 border-dashed border-purple-200 rounded-xl text-gray-400 hover:text-purple-500 hover:border-purple-300 hover:bg-purple-50/50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Music className="w-5 h-5" /> เพิ่มท่อนดนตรี
                </button>
              </div>
            </>
          ) : (
            /* --- General References View --- */
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  🔗 ลิงก์อ้างอิงทั่วไป
                </h2>
                <button
                  onClick={() => setIsAddingLink(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" /> เพิ่มลิงก์
                </button>
              </div>

              {isAddingLink && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-bold text-gray-700 mb-3">
                    เพิ่มลิงก์ใหม่
                  </h4>
                  <form onSubmit={handleAddLink} className="flex gap-3">
                    <input
                      autoFocus
                      type="text"
                      placeholder="ชื่อลิงก์..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-500"
                      value={newLink.title}
                      onChange={(e) =>
                        setNewLink({ ...newLink, title: e.target.value })
                      }
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-500"
                      value={newLink.url}
                      onChange={(e) =>
                        setNewLink({ ...newLink, url: e.target.value })
                      }
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700"
                    >
                      เพิ่ม
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingLink(false)}
                      className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                  </form>
                </div>
              )}

              {generalLinks.length === 0 ? (
                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  ยังไม่มีลิงก์อ้างอิง
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {generalLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-purple-200 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500">
                          <LinkIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-800 truncate">
                            {link.title}
                          </h4>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-gray-400 hover:text-purple-600 hover:underline truncate block"
                          >
                            {link.url}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- Resizer Handle --- */}
      <div
        onMouseDown={startResizing}
        className={`w-1.5 cursor-col-resize bg-gray-100 hover:bg-accent/50 transition-colors z-30 flex items-center justify-center group ${
          isResizing ? "bg-accent" : ""
        }`}
      >
        <div className="h-8 w-1 bg-gray-300 rounded-full group-hover:bg-accent" />
      </div>

      {/* --- Right Sidebar (YouTube Only) --- */}
      <div
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className="bg-white flex flex-col h-full border-l border-gray-100 overflow-hidden shadow-xl md:shadow-none z-20 flex-shrink-0"
      >
        <div className="p-6 border-b border-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-red-600 flex items-center gap-2 text-lg">
              <Youtube className="w-5 h-5" /> YouTube Monitor
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetWidth}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="รีเซ็ตความกว้าง (ครึ่งจอ)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsAddingLink(true);
                }}
                className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ฟอร์มเพิ่มลิงก์ใน Sidebar (เฉพาะ YouTube) */}
          {isAddingLink && activeSubTab === "script" && (
            <form
              onSubmit={handleAddLink}
              className="mt-4 bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2"
            >
              <input
                autoFocus
                type="text"
                placeholder="ชื่อคลิป..."
                className="w-full text-sm mb-2 px-2 py-1 bg-transparent border-b border-red-200 outline-none text-red-900 placeholder:text-red-300"
                value={newLink.title}
                onChange={(e) =>
                  setNewLink({ ...newLink, title: e.target.value })
                }
              />
              <input
                type="url"
                placeholder="YouTube URL..."
                className="w-full text-sm mb-3 px-2 py-1 bg-transparent border-b border-red-200 outline-none text-red-600 placeholder:text-red-300"
                value={newLink.url}
                onChange={(e) =>
                  setNewLink({ ...newLink, url: e.target.value })
                }
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddingLink(false)}
                  className="text-red-400 hover:text-red-600"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="text-red-700 font-bold">
                  เพิ่มคลิป
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3 custom-scrollbar bg-gray-50/50">
          {youtubeLinks.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              ไม่มีวิดีโอ YouTube
            </div>
          ) : (
            youtubeLinks.map((link) => (
              <ReferenceItem
                key={link.id}
                link={link}
                onDelete={handleDeleteLink}
                isResizing={isResizing} // 🔥 ส่ง isResizing ลงไปเพื่อปิด pointer-events
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ReferenceItem({ link, onDelete, isResizing }: any) {
  const youtubeId = getYouTubeID(link.url);

  return (
    <div className="group bg-white p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-sm transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1 mr-2">
          <div
            className="font-bold text-gray-800 text-sm truncate"
            title={link.title}
          >
            {link.title}
          </div>
        </div>
        <button
          onClick={() => onDelete(link.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {youtubeId && (
        <div className="mt-1 rounded-lg overflow-hidden bg-black aspect-video relative group/video shadow-sm">
          {/* 🔥 ปรับ Pointer Event ที่ Iframe ตามสถานะการย่อขยาย */}
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="animate-in fade-in"
            style={{ pointerEvents: isResizing ? "none" : "auto" }}
          />
        </div>
      )}
    </div>
  );
}

function BlockItem({
  index,
  block,
  members,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  dragHandleProps,
}: any) {
  const [showMemberSelect, setShowMemberSelect] = useState(false);
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
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          insertBreathMark();
          return true;
        }
        return false;
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

  const insertBreathMark = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        ' <span style="color: #3b82f6; font-weight: bold;">/</span> '
      )
      .run();
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
    const newComment: Comment = {
      id: Date.now().toString(),
      user_id: user?.id || "",
      user_name: profile?.display_name || "Me",
      text: commentInput,
      quoted_text: quoteText || undefined,
      created_at: new Date().toISOString(),
    };
    onUpdate({ comments: [...(block.comments || []), newComment] });
    setCommentInput("");
    setQuoteText(null);
  };

  // 🔥 Fix: Ensure textToFind is defined before usage
  const deleteComment = (comment: Comment) => {
    if (editor && comment.quoted_text) {
      const textToFind = comment.quoted_text; // เก็บค่าลงตัวแปรก่อน
      const { doc } = editor.state;

      doc.descendants((node, pos) => {
        if (node.isText && node.text && node.text.includes(textToFind)) {
          const start = pos + node.text.indexOf(textToFind);
          const end = start + textToFind.length; // ใช้ตัวแปรที่เก็บไว้
          editor
            .chain()
            .setTextSelection({ from: start, to: end })
            .unsetHighlight()
            .run();
          return false;
        }
      });
    }
    onUpdate({
      comments: (block.comments || []).filter(
        (c: Comment) => c.id !== comment.id
      ),
    });
  };

  const singerMembers = members.filter((m: any) => m.roles?.includes("singer"));

  return (
    <div
      className={`group relative rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md ${
        isInterlude
          ? "bg-purple-50 border-purple-200"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`flex justify-between items-center p-2 pl-3 border-b rounded-t-xl ${
          isInterlude
            ? "bg-purple-100 border-purple-200"
            : "bg-gray-50/50 border-gray-50"
        }`}
      >
        <div className="relative flex items-center gap-2 flex-1 flex-wrap">
          {/* Drag Handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-black/5"
            title="ลากเพื่อย้าย"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <input
            type="text"
            placeholder={
              isInterlude ? "ชื่อท่อนดนตรี..." : `ท่อนที่ ${index + 1}`
            }
            className={`bg-transparent font-bold text-sm w-32 outline-none placeholder:text-gray-400 focus:text-accent ${
              isInterlude ? "text-purple-700" : "text-gray-700"
            }`}
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

        <div className="flex gap-1 items-center">
          {!isInterlude && (
            <button
              onClick={insertBreathMark}
              className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors mr-1"
              title="แทรกจุดหายใจ (/)"
            >
              <Wind className="w-4 h-4" />
            </button>
          )}

          <div className="flex flex-col gap-0.5 mr-2 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveUp}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={onMoveDown}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
            title="ทำซ้ำ"
          >
            <Copy className="w-4 h-4" />
          </button>

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
