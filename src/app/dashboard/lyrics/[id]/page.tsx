"use client";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Youtube,
  Loader2,
  FileText,
  Link as LinkIcon,
  RotateCcw,
  ExternalLink,
  Music,
  PlusCircle,
  Minus,
  CheckCircle2,
  AlertTriangle,
  X,
  Mic2,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

// Import Sub-components
import LyricEditor, {
  LyricBlock,
  ReferenceLink,
  Member, // เพิ่ม Import Member เพื่อให้ type ตรงกัน
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
const getYouTubeID = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const calculateMaxWidth = () => {
  if (typeof window !== "undefined") {
    return window.innerWidth / 2 - 100;
  }
  return 400;
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

export default function ScriptEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // --- States ---
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<"script" | "refs">("script");
  const [links, setLinks] = useState<ReferenceLink[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [isAddingLink, setIsAddingLink] = useState(false);

  // Sidebar
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Alert State
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
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // A. Fetch Script
      const { data: script, error: scriptError } = await supabase
        .from("scripts")
        .select("*")
        .eq("id", id)
        .single();

      if (scriptError) {
        console.error(scriptError);
        router.push("/dashboard/lyrics");
        return;
      }

      if (script) {
        setTitle(script.title);
        setProjectId(script.project_id);
        setLastSaved(new Date(script.updated_at));
        try {
          const content = JSON.parse(script.content);
          setBlocks(Array.isArray(content) ? (content as LyricBlock[]) : []);
        } catch {
          setBlocks([]);
        }
      }

      // B. Fetch Links
      const { data: linkData } = await supabase
        .from("reference_links")
        .select("*")
        .eq("script_id", id)
        .order("created_at", { ascending: false });

      setLinks((linkData as ReferenceLink[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [id, router]);

  // --- 2. Resize Logic ---
  useEffect(() => {
    requestAnimationFrame(() => setSidebarWidth(calculateMaxWidth()));
  }, []);

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

  const handleResetWidth = () => setSidebarWidth(calculateMaxWidth());

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

  // --- 3. Actions ---
  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("scripts")
      .update({
        title,
        content: JSON.stringify(blocks),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      showAlert("บันทึกไม่สำเร็จ", error.message, "error");
    } else {
      setLastSaved(new Date());
    }
    setIsSaving(false);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.url) return;
    const linkTitle =
      newLink.title ||
      (getYouTubeID(newLink.url) ? "YouTube Reference" : "Reference Link");

    const { data, error } = await supabase
      .from("reference_links")
      .insert({
        script_id: Number(id),
        url: newLink.url,
        title: linkTitle,
      })
      .select()
      .single();

    if (error) {
      showAlert("เพิ่มลิงก์ไม่สำเร็จ", error.message, "error");
    } else if (data) {
      setLinks([data as ReferenceLink, ...links]);
      setNewLink({ title: "", url: "" });
      setIsAddingLink(false);
      showAlert("สำเร็จ", "เพิ่มลิงก์เรียบร้อยแล้ว", "success");
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    const { error } = await supabase
      .from("reference_links")
      .delete()
      .eq("id", linkId);
    if (error) {
      showAlert("ลบไม่สำเร็จ", error.message, "error");
    } else {
      setLinks(links.filter((l) => l.id !== linkId));
    }
  };

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

  const updateBlock = (idx: number, newData: Partial<LyricBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[idx] = { ...newBlocks[idx], ...newData };
    setBlocks(newBlocks);
  };

  const deleteBlock = (idx: number) => {
    setBlocks(blocks.filter((_, i) => i !== idx));
  };

  const duplicateBlock = (idx: number) => {
    const blockToCopy = blocks[idx];
    const newBlock = {
      ...blockToCopy,
      id: crypto.randomUUID(),
      comments: [],
    };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
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
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBlocks(items);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-subtle">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  return (
    // 🔥 พื้นหลังหลัก: bg-surface-subtle
    <div className="flex flex-col h-screen overflow-hidden bg-surface-subtle relative">
      {/* Alert Modal */}
      {alertConfig.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          {/* 🔥 Modal: bg-surface, border-border */}
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
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
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
            <p className="text-sm text-primary-light mb-6">
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

      {/* Header */}
      {/* 🔥 Header: bg-surface, border-border */}
      <header className="bg-surface border-b border-border px-6 py-3 flex justify-between items-center z-50 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/dashboard/lyrics"
            className="p-2 text-primary-light hover:text-primary hover:bg-surface-subtle rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-primary bg-transparent outline-none placeholder:text-primary-light/50 w-full"
            placeholder="ตั้งชื่อเพลง..."
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          {lastSaved && (
            <span className="text-primary-light hidden sm:inline">
              บันทึกเมื่อ {lastSaved.toLocaleTimeString("th-TH")}
            </span>
          )}

          {/* Link to Singer View */}
          <Link
            href={`/singer/${id}`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all font-bold"
          >
            <Mic2 className="w-4 h-4" />
            <span className="hidden sm:inline">โหมดนักร้อง</span>
          </Link>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-all font-bold shadow-sm active:scale-95"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>บันทึก</span>
          </button>
        </div>
      </header>

      {/* Body Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side */}
        {/* 🔥 พื้นหลังเนื้อหา: bg-surface-subtle */}
        <div className="flex-1 flex flex-col bg-surface-subtle/50 overflow-hidden relative">
          {/* Sub Tabs */}
          <div className="sticky top-0 z-30 bg-surface/80 backdrop-blur-sm border-b border-border px-6 py-2 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveSubTab("script")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSubTab === "script"
                    ? "bg-surface text-primary shadow-sm ring-1 ring-border"
                    : "text-primary-light hover:bg-surface-subtle"
                }`}
              >
                <FileText className="w-4 h-4" /> เนื้อเพลง
              </button>
              <button
                onClick={() => setActiveSubTab("refs")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSubTab === "refs"
                    ? "bg-surface text-purple-600 dark:text-purple-300 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900"
                    : "text-primary-light hover:bg-surface-subtle"
                }`}
              >
                <LinkIcon className="w-4 h-4" /> ลิงก์ทั่วไป
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {/* Script View */}
            {activeSubTab === "script" && (
              <div className="max-w-3xl mx-auto w-full pb-20">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="script-blocks">
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
                                  onDelete={() => deleteBlock(index)}
                                  onDuplicate={() => duplicateBlock(index)}
                                  onMoveUp={() => moveBlock(index, "up")}
                                  onMoveDown={() => moveBlock(index, "down")}
                                  dragHandleProps={provided.dragHandleProps}
                                />

                                {/* Insert Button (Hover) */}
                                <div className="absolute left-0 right-0 -bottom-6 h-8 z-10 flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-all duration-200 pointer-events-none group-hover/block:pointer-events-auto">
                                  <div className="flex items-center gap-2 transform scale-75 hover:scale-100 transition-transform bg-surface-subtle/80 px-3 py-1 rounded-full backdrop-blur-sm border border-border shadow-sm">
                                    <button
                                      onClick={() =>
                                        addBlock("lyrics", index + 1)
                                      }
                                      className="flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 rounded-full text-xs font-bold hover:bg-blue-100 shadow-sm transition-colors"
                                      title="แทรกเนื้อร้อง"
                                    >
                                      <PlusCircle className="w-3 h-3" />{" "}
                                      เนื้อร้อง
                                    </button>
                                    <button
                                      onClick={() =>
                                        addBlock("interlude", index + 1)
                                      }
                                      className="flex items-center gap-1 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-300 rounded-full text-xs font-bold hover:bg-orange-100 shadow-sm transition-colors"
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

                {/* Big Add Buttons */}
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
                    className="py-4 border-2 border-dashed border-border rounded-xl text-primary-light hover:text-primary hover:border-border hover:bg-surface-subtle transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <Minus className="w-6 h-6" />
                    <span className="text-sm font-medium">เพิ่มตัวคั่น</span>
                  </button>
                </div>
              </div>
            )}

            {/* General References View */}
            {activeSubTab === "refs" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-purple-500" />{" "}
                    ลิงก์อ้างอิงทั่วไป
                  </h2>
                  <button
                    onClick={() => setIsAddingLink(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-surface hover:opacity-90 rounded-lg text-sm font-bold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มลิงก์
                  </button>
                </div>

                {isAddingLink && (
                  <div className="bg-surface p-5 rounded-xl border border-border shadow-lg animate-in fade-in slide-in-from-top-2">
                    <form
                      onSubmit={handleAddLink}
                      className="flex flex-col gap-3"
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder="ชื่อลิงก์..."
                        className="px-4 py-2 border border-border bg-surface-subtle rounded-lg outline-none focus:border-accent text-sm text-primary"
                        value={newLink.title}
                        onChange={(e) =>
                          setNewLink({ ...newLink, title: e.target.value })
                        }
                      />
                      <input
                        type="url"
                        placeholder="URL (https://...)"
                        className="px-4 py-2 border border-border bg-surface-subtle rounded-lg outline-none focus:border-accent text-sm text-primary"
                        value={newLink.url}
                        onChange={(e) =>
                          setNewLink({ ...newLink, url: e.target.value })
                        }
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingLink(false)}
                          className="px-4 py-2 text-primary-light hover:bg-surface-subtle rounded-lg text-sm"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-surface font-bold rounded-lg hover:opacity-90 text-sm"
                        >
                          เพิ่มลิงก์
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <ReferenceList
                    links={generalLinks}
                    onDelete={handleDeleteLink}
                    type="general"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resizer */}
        <div
          onMouseDown={startResizing}
          className={`w-1.5 cursor-col-resize bg-border hover:bg-accent/50 transition-colors z-40 flex items-center justify-center group ${
            isResizing ? "bg-accent" : ""
          }`}
        >
          <div
            className={`h-8 w-1 bg-primary-light/50 rounded-full transition-colors ${
              isResizing ? "bg-surface" : "group-hover:bg-surface"
            }`}
          />
        </div>

        {/* Right Sidebar (YouTube) */}
        {/* 🔥 Sidebar: bg-surface */}
        <div
          ref={sidebarRef}
          style={{ width: sidebarWidth }}
          className="bg-surface border-l border-border flex-shrink-0 flex flex-col shadow-xl z-30 h-full overflow-hidden"
        >
          <div className="p-4 border-b border-border bg-surface-subtle/50 flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Youtube className="w-5 h-5" /> YouTube
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetWidth}
                className="p-1.5 hover:bg-surface-subtle rounded-lg text-primary-light"
                title="รีเซ็ตความกว้าง"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsAddingLink(true)}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg"
                title="เพิ่มคลิป"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isAddingLink && activeSubTab === "script" && (
            <div className="p-4 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 animate-in fade-in">
              <form onSubmit={handleAddLink} className="flex flex-col gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="ชื่อคลิป..."
                  className="w-full text-sm px-2 py-1.5 bg-transparent border-b border-red-200 dark:border-red-800 outline-none text-red-900 dark:text-red-200 placeholder:text-red-300"
                  value={newLink.title}
                  onChange={(e) =>
                    setNewLink({ ...newLink, title: e.target.value })
                  }
                />
                <input
                  type="url"
                  placeholder="YouTube URL..."
                  className="w-full text-sm mb-3 px-2 py-1 bg-transparent border-b border-red-200 dark:border-red-800 outline-none text-red-600 dark:text-red-400 placeholder:text-red-300"
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
                  <button
                    type="submit"
                    className="text-red-700 dark:text-red-300 font-bold"
                  >
                    เพิ่มคลิป
                  </button>
                </div>
              </form>
            </div>
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
    </div>
  );
}
