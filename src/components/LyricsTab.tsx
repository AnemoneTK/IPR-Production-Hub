"use client";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Save,
  Plus,
  Link as LinkIcon,
  Loader2,
  FileText,
  RotateCcw,
  Youtube,
  Music,
  PlusCircle,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Mic2,
  UploadCloud,
  Minus,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";

// Import Sub-components
import LyricEditor, {
  LyricBlock,
  Member,
  ReferenceLink,
} from "@/components/lyrics/LyricEditor";
import ReferenceList from "@/components/lyrics/ReferenceList";

// --- Interface for Raw Data (Supabase) ---
interface ProjectMemberResponse {
  user_id: string;
  roles: string[];
  assigned_color: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

// --- Helper Functions ---
const getYouTubeID = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const createBlock = (
  type: "lyrics" | "interlude" | "separator"
): LyricBlock => ({
  id: crypto.randomUUID(),
  type,
  name:
    type === "interlude"
      ? "Interlude / Solo"
      : type === "separator"
      ? "ชื่อท่อน"
      : "",
  singers: [],
  htmlContent: "<p></p>",
  comments: [],
});

const calculateMaxWidth = () => {
  if (typeof window !== "undefined") return window.innerWidth / 2 - 100;
  return 400;
};

export default function LyricsTab({ projectId }: { projectId: number }) {
  // --- States ---
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [links, setLinks] = useState<ReferenceLink[]>([]);
  const [scriptId, setScriptId] = useState<number | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<"script" | "refs">("script");
  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Sidebar
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ show: false, type: "success", title: "", message: "" });

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

  const youtubeLinks = links.filter((l) => getYouTubeID(l.url));
  const generalLinks = links.filter((l) => !getYouTubeID(l.url));

  // --- 1. Fetch Data ---
  const fetchData = useCallback(async () => {
    // โหลด Members
    const { data: memberData } = await supabase
      .from("project_members")
      .select(
        "user_id, roles, assigned_color, profiles(id, display_name, avatar_url)"
      )
      .eq("project_id", projectId);

    const rawMembers = (memberData || []) as unknown as ProjectMemberResponse[];
    setMembers(
      rawMembers.map((m) => ({
        id: m.profiles?.id || "unknown",
        display_name: m.profiles?.display_name || "Unknown Member",
        avatar_url: m.profiles?.avatar_url || undefined,
        roles: m.roles || [],
        assigned_color: m.assigned_color || "#bfdbfe",
      }))
    );

    // โหลด Script
    const { data: scriptData } = await supabase
      .from("scripts")
      .select("id, content, updated_at")
      .eq("project_id", projectId)
      .maybeSingle();

    let currentScriptId = null;

    if (scriptData) {
      currentScriptId = scriptData.id;
      setScriptId(scriptData.id);
      if (scriptData.content) {
        try {
          const parsed = JSON.parse(scriptData.content);
          const formatted: LyricBlock[] = Array.isArray(parsed)
            ? parsed.map((b: any) => ({
                ...b,
                type: b.type || "lyrics",
                singers: b.singers || [],
                htmlContent: b.htmlContent || b.text || "",
                comments: b.comments || [],
              }))
            : [];
          setBlocks(formatted.length > 0 ? formatted : [createBlock("lyrics")]);
        } catch {
          setBlocks([createBlock("lyrics")]);
        }
      } else {
        setBlocks([createBlock("lyrics")]);
      }
      setLastSaved(new Date(scriptData.updated_at));
    } else {
      setBlocks([createBlock("lyrics")]);
    }

    // โหลด Links
    if (currentScriptId) {
      const { data: linkData } = await supabase
        .from("reference_links")
        .select("*")
        .eq("script_id", currentScriptId)
        .order("created_at", { ascending: false });
      setLinks((linkData as ReferenceLink[]) || []);
    } else {
      setLinks([]);
    }

    setLoading(false);
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      showAlert(
        "ไฟล์ไม่ถูกต้อง",
        "กรุณาอัปโหลดเฉพาะไฟล์เสียง (MP3, WAV, etc.)",
        "error"
      );
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId.toString());

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      showAlert("สำเร็จ", "อัปโหลดไฟล์เสียงเรียบร้อย", "success");
    } catch (error: any) {
      showAlert("ผิดพลาด", "อัปโหลดไม่สำเร็จ: " + error.message, "error");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // --- 2. Setup Realtime Subscription ---
  useEffect(() => {
    fetchData();

    const memberChannel = supabase
      .channel(`realtime:members:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_members",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          console.log("Members updated, refreshing...");
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
    };
  }, [projectId, fetchData]);

  // --- 3. Sidebar Init ---
  useEffect(() => {
    requestAnimationFrame(() => setSidebarWidth(calculateMaxWidth()));
  }, []);

  // --- 4. Auto Save Logic ---
  const handleSaveScript = useCallback(async () => {
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      project_id: projectId,
      content: JSON.stringify(blocks),
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (scriptId) {
      result = await supabase
        .from("scripts")
        .update(payload)
        .eq("id", scriptId)
        .select("id")
        .single();
    } else {
      const { data: existing } = await supabase
        .from("scripts")
        .select("id")
        .eq("project_id", projectId)
        .maybeSingle();
      if (existing) {
        result = await supabase
          .from("scripts")
          .update(payload)
          .eq("id", existing.id)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("scripts")
          .insert(payload)
          .select("id")
          .single();
      }
    }

    if (!result.error && result.data) {
      setScriptId(result.data.id);
      setLastSaved(new Date());
    } else if (result.error) {
      console.error("Save Error:", result.error);
      showAlert("บันทึกไม่สำเร็จ", result.error.message, "error");
    }

    setIsSaving(false);
  }, [blocks, projectId, scriptId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (blocks.length > 0) handleSaveScript();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [blocks, handleSaveScript]);

  // --- 5. Resizing Logic ---
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        let newWidth = window.innerWidth - e.clientX;
        const maxWidth = calculateMaxWidth();
        if (newWidth < 350) newWidth = 350;
        if (newWidth > maxWidth) newWidth = maxWidth;
        setSidebarWidth(newWidth);
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

  // --- 6. Block Actions ---
  const addBlock = (
    type: "lyrics" | "interlude" | "separator",
    index?: number
  ) => {
    const newBlock = createBlock(type);
    const newBlocks = [...blocks];
    if (typeof index === "number") newBlocks.splice(index, 0, newBlock);
    else newBlocks.push(newBlock);
    setBlocks(newBlocks);
  };

  const updateBlock = (index: number, newData: Partial<LyricBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...newData };
    setBlocks(newBlocks);
  };

  const deleteBlock = (id: string) =>
    setBlocks(blocks.filter((b) => b.id !== id));

  const duplicateBlock = (index: number) => {
    const newBlock = {
      ...blocks[index],
      id: crypto.randomUUID(),
      comments: [],
    };
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
    const newBlocks = [...blocks];
    const target = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[target]] = [
      newBlocks[target],
      newBlocks[index],
    ];
    setBlocks(newBlocks);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setBlocks(items);
  };

  // --- 7. Link Actions ---
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.url) return;

    if (!scriptId) {
      showAlert(
        "กำลังบันทึก...",
        "ระบบกำลังบันทึกข้อมูลเพลง กรุณาลองใหม่อีกครั้ง",
        "error"
      );
      await handleSaveScript();
      return;
    }

    const linkTitle =
      newLink.title ||
      (getYouTubeID(newLink.url) ? "YouTube Reference" : "Reference Link");

    const { data, error } = await supabase
      .from("reference_links")
      .insert({
        script_id: scriptId,
        url: newLink.url,
        title: linkTitle,
      })
      .select()
      .single();

    if (error) {
      console.error("Link Error:", error);
      showAlert("เพิ่มลิงก์ไม่สำเร็จ", error.message, "error");
      return;
    }

    if (data) {
      setLinks([data as ReferenceLink, ...links]);
      setNewLink({ title: "", url: "" });
      setIsAddingLink(false);
      showAlert("สำเร็จ", "เพิ่มลิงก์เรียบร้อยแล้ว", "success");
    }
  };

  const handleDeleteLink = async (id: number) => {
    const { error } = await supabase
      .from("reference_links")
      .delete()
      .eq("id", id);
    if (!error) {
      setLinks(links.filter((l) => l.id !== id));
    } else {
      showAlert("ผิดพลาด", "ลบลิงก์ไม่สำเร็จ", "error");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-primary-light">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px] overflow-hidden relative">
      {/* Alert Modal */}
      {alertConfig.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-border scale-100 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() =>
                setAlertConfig((prev) => ({ ...prev, show: false }))
              }
              className="absolute top-4 right-4 text-primary-light hover:text-primary"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                alertConfig.type === "success"
                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {alertConfig.type === "success" ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">
              {alertConfig.title}
            </h3>
            <p className="text-sm text-primary-light mb-6 leading-relaxed">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-surface-subtle/30 overflow-hidden relative">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border/60 px-6 py-3 flex justify-between items-center shadow-sm">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab("script")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSubTab === "script"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-800"
                  : "text-primary-light hover:bg-surface-subtle"
              }`}
            >
              <FileText className="w-4 h-4" /> เนื้อเพลง & บท
            </button>
            <button
              onClick={() => setActiveSubTab("refs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSubTab === "refs"
                  ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 ring-1 ring-purple-100 dark:ring-purple-800"
                  : "text-primary-light hover:bg-surface-subtle"
              }`}
            >
              <LinkIcon className="w-4 h-4" /> General References
            </button>
            <Link
              href={`/singer/${scriptId}`}
              target="_blank"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                !scriptId
                  ? "pointer-events-none opacity-50 bg-surface-subtle text-primary-light/50"
                  : "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              }`}
            >
              <Mic2 className="w-4 h-4" />
              <span className="hidden sm:inline">Singer View</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {isSaving ? (
              <span className="text-accent flex gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> บันทึก...
              </span>
            ) : (
              lastSaved && (
                <span className="text-primary-light">
                  ล่าสุด {lastSaved.toLocaleTimeString("th-TH")}
                </span>
              )
            )}
            <button
              onClick={handleSaveScript}
              className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" /> บันทึก
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeSubTab === "script" ? (
            <div className="max-w-3xl mx-auto w-full pb-20">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="lyrics-list">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
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
                                opacity: snapshot.isDragging ? 0.8 : 1,
                              }}
                              className="group/block relative hover:z-20"
                            >
                              <LyricEditor
                                index={index}
                                block={block}
                                onUpdate={(data) => updateBlock(index, data)}
                                onDelete={() => deleteBlock(block.id)}
                                onDuplicate={() => duplicateBlock(index)}
                                onMoveUp={() => moveBlock(index, "up")}
                                onMoveDown={() => moveBlock(index, "down")}
                                dragHandleProps={provided.dragHandleProps}
                              />

                              {/* Insert Buttons */}
                              <div className="absolute left-0 right-0 -bottom-6 h-8 z-10 flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-all duration-200 pointer-events-none group-hover/block:pointer-events-auto">
                                <div className="flex items-center gap-2 transform scale-75 hover:scale-100 transition-transform bg-surface-subtle/80 px-3 py-1 rounded-full backdrop-blur-sm border border-border shadow-sm">
                                  <button
                                    onClick={() =>
                                      addBlock("lyrics", index + 1)
                                    }
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 rounded-full text-xs font-bold hover:bg-blue-100 shadow-sm transition-colors"
                                    title="แทรกเนื้อร้อง"
                                  >
                                    <PlusCircle className="w-3 h-3" /> เนื้อร้อง
                                  </button>
                                  <button
                                    onClick={() =>
                                      addBlock("interlude", index + 1)
                                    }
                                    className="flex items-center gap-1 px-3 py-1 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-300 rounded-full text-xs font-bold hover:bg-orange-100 shadow-sm transition-colors"
                                    title="แทรกดนตรี"
                                  >
                                    <Music className="w-3 h-3" /> ดนตรี
                                  </button>
                                  <button
                                    onClick={() =>
                                      addBlock("separator", index + 1)
                                    }
                                    className="flex items-center gap-1 px-3 py-1 bg-surface-subtle border border-border text-primary-light rounded-full text-xs font-bold hover:bg-surface shadow-sm transition-colors"
                                    title="แทรกตัวคั่น"
                                  >
                                    <Minus className="w-3 h-3" /> ตัวคั่น
                                  </button>
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
              <div className="grid grid-cols-3 gap-4 mt-8">
                <button
                  onClick={() => addBlock("lyrics")}
                  className="py-4 border-2 border-dashed border-border rounded-xl text-primary-light hover:text-accent hover:border-accent/50 hover:bg-surface transition-all flex flex-col items-center justify-center gap-2"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">
                    เพิ่มท่อนเนื้อร้อง
                  </span>
                </button>
                <button
                  onClick={() => addBlock("interlude")}
                  className="py-4 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl text-primary-light hover:text-purple-500 dark:hover:text-purple-300 hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex flex-col items-center justify-center gap-2"
                >
                  <Music className="w-6 h-6" />
                  <span className="text-sm font-medium">เพิ่มท่อนดนตรี</span>
                </button>
                <button
                  onClick={() => addBlock("separator")}
                  className="py-4 border-2 border-dashed border-border rounded-xl text-primary-light hover:text-primary hover:border-primary/30 hover:bg-surface-subtle transition-all flex flex-col items-center justify-center gap-2"
                >
                  <Minus className="w-6 h-6" />
                  <span className="text-sm font-medium">เพิ่มตัวคั่น</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-primary flex gap-2">
                  <LinkIcon className="w-5 h-5 text-purple-500" />{" "}
                  ลิงก์อ้างอิงทั่วไป
                </h2>
                <button
                  onClick={() => setIsAddingLink(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-light text-surface rounded-lg font-medium shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> เพิ่มลิงก์
                </button>
              </div>
              {isAddingLink && (
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-top-2">
                  <form onSubmit={handleAddLink} className="flex gap-3">
                    <input
                      autoFocus
                      type="text"
                      placeholder="ชื่อลิงก์..."
                      className="flex-1 px-4 py-2 bg-surface-subtle border border-border text-primary rounded-lg outline-none focus:border-accent"
                      value={newLink.title}
                      onChange={(e) =>
                        setNewLink({ ...newLink, title: e.target.value })
                      }
                    />
                    <input
                      type="url"
                      placeholder="URL..."
                      className="flex-1 px-4 py-2 bg-surface-subtle border border-border text-primary rounded-lg outline-none focus:border-accent"
                      value={newLink.url}
                      onChange={(e) =>
                        setNewLink({ ...newLink, url: e.target.value })
                      }
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary text-surface rounded-lg hover:bg-primary-light"
                    >
                      เพิ่ม
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingLink(false)}
                      className="px-4 py-2 text-primary-light hover:bg-surface-subtle rounded-lg"
                    >
                      ยกเลิก
                    </button>
                  </form>
                </div>
              )}
              <ReferenceList
                links={generalLinks}
                onDelete={handleDeleteLink}
                type="general"
              />
            </div>
          )}
        </div>
      </div>

      <div
        onMouseDown={startResizing}
        className={`w-1.5 cursor-col-resize bg-border hover:bg-accent/50 transition-colors z-30 flex items-center justify-center group ${
          isResizing ? "bg-accent" : ""
        }`}
      >
        <div className="h-8 w-1 bg-primary-light rounded-full group-hover:bg-accent" />
      </div>

      <div
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className="bg-surface flex flex-col h-full border-l border-border shadow-xl z-20 flex-shrink-0"
      >
        <div className="p-6 border-b border-border bg-surface-subtle/50 flex justify-between items-center">
          <h3 className="font-bold text-red-600 flex items-center gap-2 text-lg">
            <Youtube className="w-5 h-5" /> YouTube Monitor
          </h3>
          <div className="flex gap-1">
            <button
              onClick={handleResetWidth}
              className="p-1.5 hover:bg-surface-subtle rounded-lg text-primary-light"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAddingLink(true)}
              className="p-1.5 hover:bg-surface-subtle rounded-lg text-primary-light hover:text-red-500"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isAddingLink && activeSubTab === "script" && (
          <form
            onSubmit={handleAddLink}
            className="p-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 animate-in fade-in"
          >
            <input
              autoFocus
              type="text"
              placeholder="ชื่อคลิป..."
              className="w-full text-sm mb-2 px-2 py-1 bg-transparent border-b border-red-200 dark:border-red-800 outline-none text-red-900 dark:text-red-200 placeholder:text-red-300 dark:placeholder:text-red-700"
              value={newLink.title}
              onChange={(e) =>
                setNewLink({ ...newLink, title: e.target.value })
              }
            />
            <input
              type="url"
              placeholder="YouTube URL..."
              className="w-full text-sm mb-3 px-2 py-1 bg-transparent border-b border-red-200 dark:border-red-800 outline-none text-red-600 dark:text-red-400 placeholder:text-red-300 dark:placeholder:text-red-700"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddingLink(false)}
                className="text-red-400 hover:text-red-600"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="text-red-700 font-bold dark:text-red-300"
              >
                เพิ่มคลิป
              </button>
            </div>
          </form>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-surface-subtle/30">
          <ReferenceList
            links={youtubeLinks}
            onDelete={handleDeleteLink}
            isResizing={isResizing}
            type="youtube"
          />
        </div>
      </div>
    </div>
  );
}
