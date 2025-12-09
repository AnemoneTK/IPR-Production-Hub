"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
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
  Minus, // 🔥 เพิ่มไอคอน Minus สำหรับตัวคั่น
  CheckCircle2,
  AlertTriangle,
  X,
  Mic2, // เพิ่มไอคอนไมค์สำหรับปุ่ม Singer View
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

// 🔥 เปลี่ยนมาใช้ LyricEditor ตัวใหม่ที่แยกไฟล์แล้ว
import LyricEditor, {
  LyricBlock,
  ReferenceLink,
} from "@/components/lyrics/LyricEditor";
import ReferenceList from "@/components/lyrics/ReferenceList";

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

// 🔥 Update createBlock ให้รองรับ separator
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

  // ❌ ลบ state members ออกแล้ว เพราะไม่ได้ใช้ในหน้านี้ (ใช้ใน ArrangementTab แทน)

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

  // 🔥 Update addBlock ให้รองรับ separator
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
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 relative">
      {/* Alert Modal */}
      {alertConfig.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-gray-100 scale-100 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() =>
                setAlertConfig((prev) => ({ ...prev, show: false }))
              }
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {alertConfig.title}
            </h3>
            <p className="text-sm text-gray-500 mb-6">{alertConfig.message}</p>
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
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center z-50 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/dashboard/lyrics"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300 w-full"
            placeholder="ตั้งชื่อเพลง..."
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          {lastSaved && (
            <span className="text-gray-400 hidden sm:inline">
              บันทึกเมื่อ {lastSaved.toLocaleTimeString("th-TH")}
            </span>
          )}

          {/* Link to Singer View */}
          <Link
            href={`/singer/${id}`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all font-bold"
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
        <div className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden relative">
          {/* Sub Tabs */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-2 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveSubTab("script")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSubTab === "script"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:bg-gray-200/50"
                }`}
              >
                <FileText className="w-4 h-4" /> เนื้อเพลง
              </button>
              <button
                onClick={() => setActiveSubTab("refs")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSubTab === "refs"
                    ? "bg-white text-purple-600 shadow-sm ring-1 ring-purple-100"
                    : "text-gray-500 hover:bg-gray-200/50"
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
                                  // ❌ members ไม่ต้องส่งแล้ว
                                  onUpdate={(data) => updateBlock(index, data)}
                                  onDelete={() => deleteBlock(index)}
                                  onDuplicate={() => duplicateBlock(index)}
                                  onMoveUp={() => moveBlock(index, "up")}
                                  onMoveDown={() => moveBlock(index, "down")}
                                  dragHandleProps={provided.dragHandleProps}
                                />

                                {/* Insert Button */}
                                <div className="absolute left-0 right-0 -bottom-6 h-8 z-10 flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-all duration-200 pointer-events-none group-hover/block:pointer-events-auto">
                                  <div className="flex items-center gap-2 transform scale-75 hover:scale-100 transition-transform bg-gray-50/80 px-3 py-1 rounded-full backdrop-blur-sm border border-gray-200 shadow-sm">
                                    <button
                                      onClick={() =>
                                        addBlock("lyrics", index + 1)
                                      }
                                      className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 shadow-sm transition-colors"
                                      title="แทรกเนื้อร้อง"
                                    >
                                      <PlusCircle className="w-3 h-3" />{" "}
                                      เนื้อร้อง
                                    </button>
                                    <button
                                      onClick={() =>
                                        addBlock("interlude", index + 1)
                                      }
                                      className="flex items-center gap-1 px-3 py-1 bg-orange-50 border border-orange-200 text-orange-600 rounded-full text-xs font-bold hover:bg-orange-100 shadow-sm transition-colors"
                                      title="แทรกดนตรี"
                                    >
                                      <Music className="w-3 h-3" /> ดนตรี
                                    </button>
                                    {/* 🔥 เพิ่มปุ่มตัวคั่นตรงนี้ */}
                                    <button
                                      onClick={() =>
                                        addBlock("separator", index + 1)
                                      }
                                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 border border-gray-300 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200 shadow-sm transition-colors"
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
                    className="py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-accent hover:border-accent/50 hover:bg-white transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-sm font-medium">
                      เพิ่มท่อนเนื้อร้อง
                    </span>
                  </button>
                  <button
                    onClick={() => addBlock("interlude")}
                    className="py-4 border-2 border-dashed border-purple-200 rounded-xl text-gray-400 hover:text-purple-500 hover:border-purple-200 hover:bg-purple-50 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <Music className="w-6 h-6" />
                    <span className="text-sm font-medium">เพิ่มท่อนดนตรี</span>
                  </button>
                  <button
                    onClick={() => addBlock("separator")}
                    className="py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-2"
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
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-purple-500" />{" "}
                    ลิงก์อ้างอิงทั่วไป
                  </h2>
                  <button
                    onClick={() => setIsAddingLink(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มลิงก์
                  </button>
                </div>

                {isAddingLink && (
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <form
                      onSubmit={handleAddLink}
                      className="flex flex-col gap-3"
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder="ชื่อลิงก์..."
                        className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent text-sm"
                        value={newLink.title}
                        onChange={(e) =>
                          setNewLink({ ...newLink, title: e.target.value })
                        }
                      />
                      <input
                        type="url"
                        placeholder="URL (https://...)"
                        className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent text-sm"
                        value={newLink.url}
                        onChange={(e) =>
                          setNewLink({ ...newLink, url: e.target.value })
                        }
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingLink(false)}
                          className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 text-sm"
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
          className={`w-1.5 cursor-col-resize bg-gray-200 hover:bg-blue-300 transition-colors z-40 flex items-center justify-center group ${
            isResizing ? "bg-accent" : ""
          }`}
        >
          <div
            className={`h-8 w-1 bg-gray-400 rounded-full transition-colors ${
              isResizing ? "bg-white" : "group-hover:bg-white"
            }`}
          />
        </div>

        {/* Right Sidebar (YouTube) */}
        <div
          ref={sidebarRef}
          style={{ width: sidebarWidth }}
          className="bg-white border-l border-gray-200 flex-shrink-0 flex flex-col shadow-xl z-30 h-full overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold text-red-600 flex items-center gap-2">
              <Youtube className="w-5 h-5" /> YouTube
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetWidth}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
                title="รีเซ็ตความกว้าง"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsAddingLink(true)}
                className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg"
                title="เพิ่มคลิป"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isAddingLink && activeSubTab === "script" && (
            <div className="p-4 border-b border-red-100 bg-red-50 animate-in fade-in">
              <form onSubmit={handleAddLink} className="flex flex-col gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="ชื่อคลิป..."
                  className="w-full text-sm px-2 py-1.5 bg-transparent border-b border-red-200 outline-none text-red-900"
                  value={newLink.title}
                  onChange={(e) =>
                    setNewLink({ ...newLink, title: e.target.value })
                  }
                />
                <input
                  type="url"
                  placeholder="YouTube URL..."
                  className="w-full text-sm mb-3 px-2 py-1 bg-transparent border-b border-red-200 outline-none text-red-600"
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
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/30">
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
