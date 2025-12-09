"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Save,
  Loader2,
  Mic,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  RefreshCcw,
  Users,
  Check,
  Type,
  X,
  AlertTriangle, // เพิ่มไอคอน
  CheckCircle2, // เพิ่มไอคอน
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

// --- Types ---
interface Member {
  id: string;
  display_name: string;
  avatar_url?: string;
  assigned_color: string;
  roles: string[];
}

type HarmoType = "low" | "high" | "low_octave" | "high_octave";

interface HarmoAssignment {
  userId: string;
  type: HarmoType;
}

interface ArrangeRow {
  id: string;
  type: "line" | "section";
  text: string;
  note?: string;
  roles: {
    main: string[];
    support: string[];
    adlib: string[];
    harmo: HarmoAssignment[];
  };
}

const ROLES = [
  {
    key: "main",
    label: "Main Vocal",
    icon: Mic,
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  {
    key: "support",
    label: "Support",
    icon: Users,
    bg: "bg-teal-100",
    text: "text-teal-800",
    border: "border-teal-300",
  },
  {
    key: "harmo",
    label: "Harmony",
    icon: ArrowUp,
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-300",
  },
  {
    key: "adlib",
    label: "Ad-libs",
    icon: Sparkles,
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
];

const DoubleArrowUp = ({ className }: { className?: string }) => (
  <div className={`flex -space-x-1 ${className}`}>
    <ArrowUp className="w-3 h-3 stroke-[3]" />
    <ArrowUp className="w-3 h-3 stroke-[3]" />
  </div>
);
const DoubleArrowDown = ({ className }: { className?: string }) => (
  <div className={`flex -space-x-1 ${className}`}>
    <ArrowDown className="w-3 h-3 stroke-[3]" />
    <ArrowDown className="w-3 h-3 stroke-[3]" />
  </div>
);

export default function ArrangementTab({ projectId }: { projectId: number }) {
  const [rows, setRows] = useState<ArrangeRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scriptId, setScriptId] = useState<number | null>(null);
  const [rawContent, setRawContent] = useState<string>("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 🔥 Alert & Modal States
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ show: false, type: "success", title: "", message: "" });

  const [showImportConfirm, setShowImportConfirm] = useState(false); // สำหรับยืนยันการดึงเนื้อเพลง

  const singerMembers = members.filter((m) => m.roles.includes("singer"));

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    // 1. Members
    const { data: memberData } = await supabase
      .from("project_members")
      .select("profiles(id, display_name), assigned_color, roles")
      .eq("project_id", projectId);

    const cleanMembers =
      memberData?.map((m: any) => ({
        ...m.profiles,
        assigned_color: m.assigned_color || "#bfdbfe",
        roles: m.roles || [],
      })) || [];
    setMembers(cleanMembers);

    // 2. Script
    const { data: scriptData } = await supabase
      .from("scripts")
      .select("id, content, arrangement, updated_at")
      .eq("project_id", projectId)
      .maybeSingle();

    if (scriptData) {
      setScriptId(scriptData.id);
      setRawContent(scriptData.content || "");
      if (
        scriptData.arrangement &&
        Array.isArray(scriptData.arrangement) &&
        scriptData.arrangement.length > 0
      ) {
        setRows(scriptData.arrangement);
      }
      setLastSaved(new Date(scriptData.updated_at));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Auto Save ---
  const handleSave = useCallback(
    async (manual = false) => {
      if (!scriptId) return;
      setIsSaving(true);
      const { error } = await supabase
        .from("scripts")
        .update({ arrangement: rows, updated_at: new Date().toISOString() })
        .eq("id", scriptId);

      setIsSaving(false);
      if (error) {
        console.error("Save error:", error);
        if (manual) showAlert("บันทึกไม่สำเร็จ", error.message, "error");
      } else {
        setLastSaved(new Date());
        if (manual)
          showAlert("บันทึกสำเร็จ", "ข้อมูลถูกบันทึกเรียบร้อยแล้ว", "success");
      }
    },
    [scriptId, rows]
  );

  // Auto save trigger
  useEffect(() => {
    if (rows.length === 0) return;
    const timeout = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [rows, handleSave]);

  // --- Actions ---

  // 1. กดปุ่มดึงเนื้อเพลง (Trigger)
  const handleImportClick = () => {
    if (!rawContent) {
      showAlert("ไม่พบข้อมูล", "ไม่พบเนื้อเพลงต้นฉบับในหน้า Lyrics", "error");
      return;
    }
    // ถ้ามีข้อมูลอยู่แล้ว ให้ถามยืนยันก่อน
    if (rows.length > 0) {
      setShowImportConfirm(true);
    } else {
      executeImportLyrics(); // ถ้าว่างอยู่ ดึงเลย
    }
  };

  // 2. ฟังก์ชันดึงเนื้อเพลงจริง (Execute)
  const executeImportLyrics = () => {
    try {
      const parsedBlocks = JSON.parse(rawContent);

      // 1. สร้างโครงสร้างใหม่
      const incomingRows: ArrangeRow[] = [];
      if (Array.isArray(parsedBlocks)) {
        parsedBlocks.forEach((block: any) => {
          if (block.name) {
            incomingRows.push({
              id: crypto.randomUUID(),
              type: "section",
              text: block.name,
              roles: { main: [], support: [], harmo: [], adlib: [] },
            });
          }
          if (block.type === "lyrics" || block.type === "interlude") {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = block.htmlContent
              .replace(/<p>/g, "\n")
              .replace(/<br>/g, "\n")
              .replace(/<\/p>/g, "");
            const cleanText = tempDiv.innerText || tempDiv.textContent || "";
            const lines = cleanText
              .split(/\r?\n/)
              .filter((line) => line.trim() !== "");
            lines.forEach((line) => {
              incomingRows.push({
                id: crypto.randomUUID(),
                type: "line",
                text: line.trim(),
                roles: { main: [], support: [], harmo: [], adlib: [] },
              });
            });
          }
        });
      }

      // 2. Merge Logic
      let remainingOldRows = [...rows];
      const mergedRows = incomingRows.map((newRow) => {
        const matchIndex = remainingOldRows.findIndex(
          (oldRow) => oldRow.type === newRow.type && oldRow.text === newRow.text
        );
        if (matchIndex !== -1) {
          const matchedOldRow = remainingOldRows[matchIndex];
          remainingOldRows.splice(matchIndex, 1);
          return {
            ...newRow,
            roles: matchedOldRow.roles,
            note: matchedOldRow.note,
          };
        }
        return newRow;
      });

      setRows(mergedRows);
      setShowImportConfirm(false);
      showAlert("สำเร็จ", "ดึงเนื้อเพลงและผสานข้อมูลเรียบร้อย", "success");
    } catch (e) {
      console.error(e);
      showAlert("ผิดพลาด", "ไม่สามารถอ่านไฟล์เนื้อเพลงได้", "error");
    }
  };

  const handleAddSection = () => {
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        type: "section",
        text: "New Section",
        roles: { main: [], support: [], harmo: [], adlib: [] },
      },
    ]);
  };

  const handleTextChange = (
    id: string,
    field: "text" | "note",
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(rows);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setRows(items);
  };

  // --- Toggle Logic ---
  const toggleSimpleRole = (
    rowId: string,
    roleKey: "main" | "support" | "adlib",
    userId: string
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const currentList = row.roles[roleKey];
        const newList = currentList.includes(userId)
          ? currentList.filter((id) => id !== userId)
          : [...currentList, userId];
        return { ...row, roles: { ...row.roles, [roleKey]: newList } };
      })
    );
  };

  const toggleHarmoRole = (
    rowId: string,
    userId: string,
    type: HarmoType | null
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const currentHarmo = row.roles.harmo;
        const filtered = currentHarmo.filter((h) => h.userId !== userId);
        if (type) {
          filtered.push({ userId, type });
        }
        return { ...row, roles: { ...row.roles, harmo: filtered } };
      })
    );
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* 🔥 Alert Modal */}
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

      {/* 🔥 Import Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-orange-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              ดึงเนื้อเพลงใหม่?
            </h3>
            <p className="text-sm text-gray-500 mt-2 mb-6 leading-relaxed">
              ระบบจะพยายาม <strong>"คงการตั้งค่าเดิม"</strong>{" "}
              ไว้สำหรับบรรทัดที่เนื้อร้องตรงกัน <br />
              แต่บรรทัดที่เปลี่ยนไปอาจจะต้องตั้งค่าใหม่
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportConfirm(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeImportLyrics}
                className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/30"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800 hidden md:block">
            Arrangement
          </h2>
          <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
          <button
            onClick={handleImportClick} // 🔥 เปลี่ยนมาเรียก function นี้
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">ดึงเนื้อเพลงใหม่</span>
          </button>
          <button
            onClick={handleAddSection}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">เพิ่ม Section</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              บันทึกล่าสุด: {lastSaved.toLocaleTimeString("th-TH")}
            </span>
          )}
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            บันทึก
          </button>
        </div>
      </div>

      {/* Main Content (Horizontal Scrollable) */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-white relative">
        <div className="min-w-max pb-20">
          {/* Table Header (Sticky) */}
          <div className="flex sticky top-0 z-30 bg-white border-b-2 border-gray-200 shadow-sm text-xs font-bold uppercase tracking-wider">
            <div className="w-10 p-3 text-center border-r border-gray-200 sticky left-0 bg-white z-40 text-gray-400">
              #
            </div>
            <div className="w-[500px] p-3 border-r border-gray-200 sticky left-10 bg-white z-40 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] text-gray-600">
              เนื้อร้อง / ท่อน
            </div>

            {/* Role Columns Header */}
            {ROLES.map((role) => (
              <div
                key={role.key}
                className={`flex flex-col border-r ${role.border}`}
              >
                <div
                  className={`p-2 text-center border-b ${role.border} flex items-center justify-center gap-2 h-10 ${role.bg} ${role.text}`}
                >
                  <role.icon className="w-4 h-4" /> {role.label}
                </div>
                <div className="flex bg-gray-50/50">
                  {/* 🔥 แสดงเฉพาะ Singer */}
                  {singerMembers.map((m) => (
                    <div
                      key={m.id}
                      className={`w-20 p-2 text-center border-r ${role.border} border-opacity-30 last:border-0 flex flex-col items-center gap-1`}
                    >
                      <div
                        className="w-6 h-6 mx-auto rounded-full text-[9px] flex items-center justify-center text-white font-bold shadow-sm ring-1 ring-white"
                        style={{ backgroundColor: m.assigned_color }}
                      >
                        {m.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <span
                        className="truncate w-full text-[10px] font-semibold text-gray-600"
                        title={m.display_name}
                      >
                        {m.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="w-[200px] p-3 text-center bg-gray-50 text-gray-600 border-b border-gray-200">
              หมายเหตุ
            </div>
            <div className="w-10 bg-gray-50 border-b border-gray-200"></div>
          </div>

          {/* Table Body */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="matrix-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {rows.map((row, index) => (
                    <Draggable key={row.id} draggableId={row.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{ ...provided.draggableProps.style }}
                          className={`flex items-stretch border-b border-gray-100 transition-colors ${
                            row.type === "section"
                              ? "bg-gray-100/80 border-gray-300"
                              : "bg-white hover:bg-gray-50/50"
                          } ${
                            snapshot.isDragging
                              ? "shadow-xl z-50 ring-2 ring-accent"
                              : ""
                          }`}
                        >
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className={`w-10 flex items-center justify-center text-gray-300 cursor-grab hover:text-gray-500 border-r border-gray-200 sticky left-0 z-10 ${
                              row.type === "section"
                                ? "bg-gray-100"
                                : "bg-white"
                            }`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Text / Lyric */}
                          <div
                            className={`w-[500px] p-2 border-r border-gray-200 sticky left-10 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] ${
                              row.type === "section"
                                ? "bg-gray-100"
                                : "bg-white"
                            }`}
                          >
                            {row.type === "section" ? (
                              <div className="flex items-center gap-2 h-full">
                                <div className="h-px bg-gray-300 w-4"></div>
                                <input
                                  value={row.text}
                                  onChange={(e) =>
                                    handleTextChange(
                                      row.id,
                                      "text",
                                      e.target.value
                                    )
                                  }
                                  className="font-black text-gray-800 bg-transparent outline-none uppercase tracking-widest text-xs flex-1 text-center"
                                />
                                <div className="h-px bg-gray-300 w-4"></div>
                              </div>
                            ) : (
                              <textarea
                                value={row.text}
                                onChange={(e) =>
                                  handleTextChange(
                                    row.id,
                                    "text",
                                    e.target.value
                                  )
                                }
                                rows={1}
                                className="w-full bg-transparent outline-none text-gray-900 text-sm font-medium leading-relaxed resize-none overflow-hidden py-1"
                                style={{ minHeight: "32px" }}
                              />
                            )}
                          </div>

                          {/* Matrix Cells */}
                          {row.type === "line" ? (
                            ROLES.map((role) => (
                              <div
                                key={role.key}
                                className="flex border-r border-gray-200"
                              >
                                {singerMembers.map((m) => (
                                  <div
                                    key={m.id}
                                    className="w-20 flex items-center justify-center border-r border-gray-100 last:border-0 relative group/cell p-1"
                                  >
                                    {role.key === "harmo" ? (
                                      <HarmoCell
                                        row={row}
                                        userId={m.id}
                                        memberColor={m.assigned_color}
                                        onToggle={(type: HarmoType | null) =>
                                          toggleHarmoRole(row.id, m.id, type)
                                        }
                                      />
                                    ) : (
                                      <SimpleCell
                                        isSelected={(row.roles as any)[
                                          role.key
                                        ].includes(m.id)}
                                        memberColor={m.assigned_color}
                                        onClick={() =>
                                          toggleSimpleRole(
                                            row.id,
                                            role.key as any,
                                            m.id
                                          )
                                        }
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))
                          ) : (
                            <div className="flex-1 bg-gray-100/50 border-r border-gray-200"></div>
                          )}

                          {/* Note Column */}
                          {row.type === "line" && (
                            <div className="w-[200px] p-2 border-l border-gray-200 bg-white">
                              <div className="flex items-center gap-2 h-full bg-gray-50 rounded-lg px-2 border border-transparent hover:border-gray-200 hover:bg-white transition-all">
                                <input
                                  value={row.note || ""}
                                  onChange={(e) =>
                                    handleTextChange(
                                      row.id,
                                      "note",
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-transparent outline-none text-gray-600 text-xs placeholder:text-gray-300"
                                  placeholder="..."
                                />
                              </div>
                            </div>
                          )}

                          {/* Delete */}
                          <div
                            className={`w-10 flex items-center justify-center border-l border-gray-200 ${
                              row.type === "section"
                                ? "bg-gray-100"
                                : "bg-white"
                            }`}
                          >
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-gray-300 hover:text-red-500 p-1.5 transition-all hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
        </div>

        {rows.length === 0 && (
          <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mt-4 mx-4">
            <Type className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>ยังไม่มีข้อมูลการจัดวาง</p>
            <button
              onClick={handleImportLyrics}
              className="mt-2 text-accent hover:underline text-sm font-medium"
            >
              ดึงเนื้อเพลงจาก Tab Lyrics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub Components ---

const SimpleCell = ({ isSelected, memberColor, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full h-full rounded-md flex items-center justify-center transition-all duration-200 border ${
      isSelected
        ? "border-transparent shadow-sm scale-95"
        : "border-transparent hover:border-gray-200 hover:bg-gray-50"
    }`}
    style={{
      backgroundColor: isSelected ? memberColor : "transparent",
    }}
  >
    {isSelected && (
      <Check className="w-5 h-5 text-white drop-shadow-md stroke-[3]" />
    )}
  </button>
);

const HarmoCell = ({ row, userId, memberColor, onToggle }: any) => {
  const assignment = row.roles.harmo.find(
    (h: HarmoAssignment) => h.userId === userId
  );
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: HarmoType) => {
    if (type === "high")
      return <ArrowUp className="w-4 h-4 stroke-[3] text-rose-500" />;
    if (type === "low")
      return <ArrowDown className="w-4 h-4 stroke-[3] text-sky-500" />;
    if (type === "high_octave")
      return <DoubleArrowUp className="text-pink-500" />;
    if (type === "low_octave")
      return <DoubleArrowDown className="text-cyan-500" />;
    return null;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-full rounded-md flex items-center justify-center transition-all duration-200 border ${
          assignment
            ? "border-transparent shadow-sm scale-95"
            : "border-transparent hover:border-gray-200 hover:bg-gray-50"
        }`}
        style={{
          backgroundColor: assignment ? memberColor : "transparent",
        }}
      >
        {assignment ? (
          <div className="bg-white/90 rounded-full p-0.5 shadow-sm">
            {getIcon(assignment.type)}
          </div>
        ) : (
          <Plus className="w-3 h-3 text-gray-200 opacity-0 group-hover/cell:opacity-100" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-[60] p-1.5 flex flex-col gap-1 w-32 animate-in fade-in zoom-in-95">
            <div className="text-[10px] text-gray-400 text-center uppercase font-bold py-1 border-b border-gray-100 mb-1">
              Select Harmony
            </div>
            <HarmoOption
              label="High"
              icon={<ArrowUp className="w-3 h-3 text-rose-500" />}
              onClick={() => {
                onToggle("high");
                setIsOpen(false);
              }}
            />
            <HarmoOption
              label="Low"
              icon={<ArrowDown className="w-3 h-3 text-sky-500" />}
              onClick={() => {
                onToggle("low");
                setIsOpen(false);
              }}
            />
            <HarmoOption
              label="Hi Oct"
              icon={<DoubleArrowUp className="text-pink-500" />}
              onClick={() => {
                onToggle("high_octave");
                setIsOpen(false);
              }}
            />
            <HarmoOption
              label="Lo Oct"
              icon={<DoubleArrowDown className="text-cyan-500" />}
              onClick={() => {
                onToggle("low_octave");
                setIsOpen(false);
              }}
            />
            <div className="h-px bg-gray-100 my-1"></div>
            <button
              onClick={() => {
                onToggle(null);
                setIsOpen(false);
              }}
              className="text-xs text-red-500 hover:bg-red-50 p-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const HarmoOption = ({ label, icon, onClick }: any) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between px-2 py-1.5 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors w-full font-medium"
  >
    <span>{label}</span>
    {icon}
  </button>
);
