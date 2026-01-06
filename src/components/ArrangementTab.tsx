// src/components/ArrangementTab.tsx
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
  AlertTriangle,
  CheckCircle2,
  Underline as UnderlineIcon,
  Settings2,
  Eye,
  EyeOff,
  Languages,
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
  subText?: string;
  note?: string;
  roles: {
    main: string[];
    support: string[];
    adlib: string[];
    harmo: HarmoAssignment[];
  };
}

// Helper Icons
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

// Config สี Roles
const ROLES_CONFIG = [
  {
    key: "main",
    label: "Main",
    fullLabel: "Main Vocal",
    icon: Mic,
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-800",
  },
  {
    key: "support",
    label: "Support",
    fullLabel: "Support",
    icon: Users,
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-800 dark:text-teal-300",
    border: "border-teal-300 dark:border-teal-800",
  },
  {
    key: "harmo",
    label: "Harmo",
    fullLabel: "Harmony",
    icon: ArrowUp,
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
    border: "border-purple-300 dark:border-purple-800",
  },
  {
    key: "adlib",
    label: "Ad-lib",
    fullLabel: "Ad-libs",
    icon: Sparkles,
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-800 dark:text-orange-300",
    border: "border-orange-300 dark:border-orange-800",
  },
];

export default function ArrangementTab({ projectId }: { projectId: number }) {
  const [rows, setRows] = useState<ArrangeRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scriptId, setScriptId] = useState<number | null>(null);
  const [rawContent, setRawContent] = useState<string>("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // View States
  const [showSubLyrics, setShowSubLyrics] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string>("all");
  const [visibleRoles, setVisibleRoles] = useState<string[]>([
    "main",
    "support",
    "harmo",
    "adlib",
  ]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ show: false, type: "success", title: "", message: "" });

  const [showImportConfirm, setShowImportConfirm] = useState(false);

  const singerMembers = members.filter((m) => m.roles.includes("singer"));
  const filteredSingers =
    filterMemberId === "all"
      ? singerMembers
      : singerMembers.filter((m) => m.id === filterMemberId);

  const filteredRoles = ROLES_CONFIG.filter((r) =>
    visibleRoles.includes(r.key)
  );

  // 🔥 ปรับขนาดเซลล์ให้ใหญ่ขึ้น (5rem = w-20) เพื่อให้อ่านง่าย
  const CELL_WIDTH_REM = 5;
  const roleContainerWidth = `${filteredSingers.length * CELL_WIDTH_REM}rem`;

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
        const hasSubText = scriptData.arrangement.some((r: any) => !!r.subText);
        if (hasSubText) setShowSubLyrics(true);
      }
      setLastSaved(new Date(scriptData.updated_at));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        if (manual) showAlert("บันทึกไม่สำเร็จ", error.message, "error");
      } else {
        setLastSaved(new Date());
        if (manual)
          showAlert("บันทึกสำเร็จ", "ข้อมูลถูกบันทึกเรียบร้อยแล้ว", "success");
      }
    },
    [scriptId, rows]
  );

  useEffect(() => {
    if (rows.length === 0) return;
    const timeout = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [rows, handleSave]);

  const handleImportClick = () => {
    if (!rawContent) {
      showAlert("ไม่พบข้อมูล", "ไม่พบเนื้อเพลงต้นฉบับในหน้า Lyrics", "error");
      return;
    }
    if (rows.length > 0) {
      setShowImportConfirm(true);
    } else {
      executeImportLyrics();
    }
  };

  const executeImportLyrics = () => {
    try {
      const parsedBlocks = JSON.parse(rawContent);
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
            subText: matchedOldRow.subText,
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

  const handleRowUpdate = (
    id: string,
    field: "text" | "note" | "subText",
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

  const toggleRoleVisibility = (roleKey: string) => {
    setVisibleRoles((prev) =>
      prev.includes(roleKey)
        ? prev.filter((r) => r !== roleKey)
        : [...prev, roleKey]
    );
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );

  return (
    // 🔥 แก้ไข 1: เปลี่ยนจาก h-full เป็น min-h-screen เพื่อให้ Scroll หน้าจอได้ปกติ
    <div className="min-h-screen flex flex-col bg-surface relative">
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

      {/* Import Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-orange-200 dark:border-orange-800 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600 dark:text-orange-400">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary">
              ดึงเนื้อเพลงใหม่?
            </h3>
            <p className="text-sm text-primary-light mt-2 mb-6 leading-relaxed">
              ระบบจะพยายาม <strong>"คงการตั้งค่าเดิม"</strong>{" "}
              ไว้สำหรับบรรทัดที่เนื้อร้องตรงกัน <br />
              แต่บรรทัดที่เปลี่ยนไปอาจจะต้องตั้งค่าใหม่
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportConfirm(false)}
                className="flex-1 py-2.5 bg-surface-subtle text-primary font-medium rounded-xl hover:bg-border transition-colors"
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
      <div className="sticky top-0 z-50 bg-surface border-b border-border px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-primary hidden lg:block mr-2">
            Arrangement
          </h2>
          <div className="h-6 w-px bg-border hidden lg:block mr-2"></div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              showFilterPanel
                ? "bg-accent/10 text-accent border-accent"
                : "bg-surface-subtle text-primary-light border-transparent hover:bg-border"
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">มุมมอง</span>
          </button>

          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-subtle text-primary-light rounded-lg hover:bg-border text-sm font-medium transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">รีเซ็ตเนื้อ</span>
          </button>
          <button
            onClick={handleAddSection}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-subtle text-primary-light rounded-lg hover:bg-border text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">เพิ่ม Section</span>
          </button>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {lastSaved && (
            <span className="text-xs text-primary-light hidden sm:inline">
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

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-surface-subtle border-b border-border px-6 py-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Toggle Columns */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-primary-light uppercase">
                แสดงคอลัมน์
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowSubLyrics(!showSubLyrics)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    showSubLyrics
                      ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300"
                      : "bg-surface text-primary-light border-border"
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" /> เนื้อรอง (JP/MV)
                </button>
              </div>
            </div>

            {/* Filter Roles */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-primary-light uppercase">
                แสดงไลน์ร้อง
              </h4>
              <div className="flex flex-wrap gap-2">
                {ROLES_CONFIG.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => toggleRoleVisibility(role.key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      visibleRoles.includes(role.key)
                        ? `${role.bg} ${role.text} ${role.border}`
                        : "bg-surface text-primary-light border-border opacity-60 grayscale"
                    }`}
                  >
                    {visibleRoles.includes(role.key) ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    {role.fullLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Members */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-primary-light uppercase">
                โฟกัสสมาชิก
              </h4>
              <select
                className="bg-surface border border-border text-primary text-xs rounded-lg px-3 py-1.5 outline-none focus:border-accent"
                value={filterMemberId}
                onChange={(e) => setFilterMemberId(e.target.value)}
              >
                <option value="all">แสดงทุกคน</option>
                {singerMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {/* 🔥 แก้ไข 2: ใช้ overflow-x-auto ที่นี่แทน overflow-auto ของ parent เพื่อให้ scroll แยกกัน */}
      <div className="flex-1 overflow-x-auto custom-scrollbar bg-surface relative">
        <div className="min-w-max pb-20">
          {/* Table Header */}
          {/* 🔥 แก้ไข 3: ปรับ top เป็นค่าที่เหมาะสม (เช่น 60px) เพื่อให้ Sticky ต่อจาก Toolbar */}
          <div className="flex sticky top-0 z-40 bg-surface border-b-2 border-border shadow-sm text-sm font-bold uppercase tracking-wider">
            {/* Fixed Width Columns */}
            <div className="w-10 min-w-[2.5rem] shrink-0 p-3 text-center border-r border-border sticky left-0 bg-surface z-40 text-primary-light">
              #
            </div>
            {/* Lyrics Header - ขยายขนาด */}
            <div className="w-[200px] min-w-[200px] md:w-[300px] md:min-w-[300px] lg:w-[400px] lg:min-w-[400px] shrink-0 p-3 border-r border-border sticky left-10 bg-surface z-40 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] text-primary-light">
              เนื้อร้องหลัก (Romanized)
            </div>

            {/* Sub Lyrics Header */}
            {showSubLyrics && (
              <div className="w-[150px] min-w-[150px] md:w-[200px] md:min-w-[200px] lg:w-[300px] lg:min-w-[300px] shrink-0 p-3 border-r border-border bg-surface-subtle text-pink-600 dark:text-pink-400">
                เนื้อรอง (Original / MV)
              </div>
            )}

            {filteredRoles.map((role) => (
              <div
                key={role.key}
                style={{
                  width: roleContainerWidth,
                  minWidth: roleContainerWidth,
                }}
                className={`flex flex-col border-r shrink-0 ${role.border}`}
              >
                <div
                  className={`p-2 text-center border-b ${role.border} flex items-center justify-center gap-2 h-10 ${role.bg} ${role.text} truncate overflow-hidden whitespace-nowrap px-1`}
                  title={role.fullLabel}
                >
                  <role.icon className="w-4 h-4 shrink-0" />{" "}
                  <span className="truncate">{role.label}</span>
                </div>
                <div className="flex bg-surface-subtle/50 h-full">
                  {filteredSingers.map((m) => (
                    <div
                      key={m.id}
                      className={`w-20 min-w-[5rem] shrink-0 p-2 text-center border-r ${role.border} border-opacity-30 last:border-0 flex flex-col items-center gap-1`}
                    >
                      <div
                        className="w-6 h-6 mx-auto rounded-full text-[10px] flex items-center justify-center text-white font-bold shadow-sm ring-1 ring-white dark:ring-0"
                        style={{ backgroundColor: m.assigned_color }}
                      >
                        {m.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <span
                        className="truncate w-full text-[10px] font-semibold text-primary-light"
                        title={m.display_name}
                      >
                        {m.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Note Header */}
            <div className="w-[150px] min-w-[150px] lg:w-[200px] lg:min-w-[200px] shrink-0 p-3 text-center bg-surface-subtle text-primary-light border-r border-border">
              หมายเหตุ
            </div>
            {/* Delete Placeholder */}
            <div className="w-8 min-w-[2rem] shrink-0 bg-surface-subtle border-b border-border"></div>
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
                          className={`flex items-stretch border-b border-border transition-colors ${
                            row.type === "section"
                              ? "bg-surface-subtle border-border"
                              : "bg-surface hover:bg-surface-subtle/30"
                          } ${
                            snapshot.isDragging
                              ? "shadow-xl z-50 ring-2 ring-accent"
                              : ""
                          }`}
                        >
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className={`w-10 min-w-[2.5rem] shrink-0 flex items-center justify-center text-primary-light cursor-grab hover:text-primary border-r border-border sticky left-0 z-10 ${
                              row.type === "section"
                                ? "bg-surface-subtle"
                                : "bg-surface"
                            }`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Main Text */}
                          <div
                            className={`w-[200px] min-w-[200px] md:w-[300px] md:min-w-[300px] lg:w-[400px] lg:min-w-[400px] shrink-0 p-2 border-r border-border sticky left-10 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] ${
                              row.type === "section"
                                ? "bg-surface-subtle"
                                : "bg-surface"
                            }`}
                          >
                            {row.type === "section" ? (
                              <div className="flex items-center gap-2 h-full">
                                <div className="h-px bg-border w-4"></div>
                                <input
                                  value={row.text}
                                  onChange={(e) =>
                                    handleRowUpdate(
                                      row.id,
                                      "text",
                                      e.target.value
                                    )
                                  }
                                  className="font-black text-primary bg-transparent outline-none uppercase tracking-widest text-sm flex-1 text-center"
                                />
                                <div className="h-px bg-border w-4"></div>
                              </div>
                            ) : (
                              <RichTextCell
                                text={row.text}
                                onChange={(val) =>
                                  handleRowUpdate(row.id, "text", val)
                                }
                              />
                            )}
                          </div>

                          {/* Sub Text (Original/MV) */}
                          {showSubLyrics && (
                            <div className="w-[150px] min-w-[150px] md:w-[200px] md:min-w-[200px] lg:w-[300px] lg:min-w-[300px] shrink-0 p-2 border-r border-border bg-surface-subtle/30">
                              {row.type === "section" ? (
                                <div className="h-full bg-border/20"></div>
                              ) : (
                                <RichTextCell
                                  text={row.subText || ""}
                                  onChange={(val) =>
                                    handleRowUpdate(row.id, "subText", val)
                                  }
                                />
                              )}
                            </div>
                          )}

                          {/* Matrix Cells */}
                          {filteredRoles.map((role) => (
                            <div
                              key={role.key}
                              style={{
                                width: roleContainerWidth,
                                minWidth: roleContainerWidth,
                              }}
                              className="flex border-r border-border shrink-0"
                            >
                              {filteredSingers.map((m) => (
                                <div
                                  key={m.id}
                                  className={`w-20 min-w-[5rem] shrink-0 border-r border-border last:border-0 relative group/cell ${
                                    row.type === "line"
                                      ? "p-0.5 flex items-center justify-center"
                                      : "bg-surface-subtle/20"
                                  }`}
                                >
                                  {row.type === "line" &&
                                    (role.key === "harmo" ? (
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
                                    ))}
                                </div>
                              ))}
                            </div>
                          ))}

                          {/* Note Column */}
                          <div
                            className={`w-[150px] min-w-[150px] lg:w-[200px] lg:min-w-[200px] shrink-0 p-2 border-r border-border ${
                              row.type === "section"
                                ? "bg-surface-subtle"
                                : "bg-surface"
                            }`}
                          >
                            {row.type === "line" && (
                              <div className="flex items-center gap-2 h-full bg-surface-subtle rounded-lg px-2 border border-transparent hover:border-border hover:bg-surface transition-all">
                                <input
                                  value={row.note || ""}
                                  onChange={(e) =>
                                    handleRowUpdate(
                                      row.id,
                                      "note",
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-transparent outline-none text-primary text-xs placeholder:text-primary-light"
                                  placeholder="..."
                                />
                              </div>
                            )}
                          </div>

                          {/* Delete */}
                          <div
                            className={`w-8 min-w-[2rem] shrink-0 flex items-center justify-center ${
                              row.type === "section"
                                ? "bg-surface-subtle"
                                : "bg-surface"
                            }`}
                          >
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-primary-light hover:text-red-500 p-1 transition-all hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          <div className="text-center py-20 text-primary-light border-2 border-dashed border-border rounded-xl mt-4 mx-4">
            <Type className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>ยังไม่มีข้อมูลการจัดวาง</p>
            <button
              onClick={handleImportClick}
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

// ... (Sub Components)
const RichTextCell = ({
  text,
  onChange,
}: {
  text: string;
  onChange: (val: string) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  useEffect(() => {
    if (ref.current) {
      if (
        document.activeElement !== ref.current &&
        ref.current.innerHTML !== text
      ) {
        ref.current.innerHTML = text;
      }
    }
  }, [text]);

  const handleBlur = () => {
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
    setTimeout(() => setShowToolbar(false), 200);
  };

  const checkSelection = () => {
    const selection = window.getSelection();
    if (
      selection &&
      selection.toString().length > 0 &&
      ref.current?.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const HEADER_HEIGHT_OFFSET = 180;
      let topPos = rect.top - 40 + window.scrollY;
      if (rect.top < HEADER_HEIGHT_OFFSET) {
        topPos = rect.bottom + 10 + window.scrollY;
      }
      setToolbarPos({
        top: topPos,
        left: rect.left + rect.width / 2 - 15 + window.scrollX,
      });
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
    }
  };

  const handleUnderline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand("underline");
  };

  return (
    <div className="relative w-full h-full">
      {showToolbar &&
        portalContainer &&
        createPortal(
          <div
            className="fixed z-[9999] bg-gray-900 text-white rounded-lg shadow-xl px-2 py-1 flex items-center animate-in fade-in zoom-in-95 pointer-events-auto"
            style={{ top: toolbarPos.top, left: toolbarPos.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              onMouseDown={handleUnderline}
              className="hover:bg-gray-700 p-1.5 rounded flex items-center justify-center transition-colors"
              title="ขีดเส้นใต้"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
          </div>,
          portalContainer
        )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={checkSelection}
        onKeyUp={checkSelection}
        onBlur={handleBlur}
        className="w-full h-full bg-transparent outline-none text-primary text-sm font-medium leading-relaxed py-1 min-h-[32px] break-words whitespace-pre-wrap cursor-text"
      />
    </div>
  );
};

const SimpleCell = ({ isSelected, memberColor, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full h-full rounded-md flex items-center justify-center transition-all duration-200 border ${
      isSelected
        ? "border-transparent shadow-sm scale-95"
        : "border-transparent hover:border-border hover:bg-surface-subtle"
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
            : "border-transparent hover:border-border hover:bg-surface-subtle"
        }`}
        style={{
          backgroundColor: assignment ? memberColor : "transparent",
        }}
      >
        {assignment ? (
          <div className="bg-white/90 dark:bg-black/50 rounded-full p-0.5 shadow-sm">
            {getIcon(assignment.type)}
          </div>
        ) : (
          <Plus className="w-4 h-4 text-primary-light opacity-0 group-hover/cell:opacity-100" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-surface border border-border rounded-xl shadow-2xl z-[60] p-1.5 flex flex-col gap-1 w-32 animate-in fade-in zoom-in-95">
            <div className="text-[10px] text-primary-light text-center uppercase font-bold py-1 border-b border-border mb-1">
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
            <div className="h-px bg-border my-1"></div>
            <button
              onClick={() => {
                onToggle(null);
                setIsOpen(false);
              }}
              className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-colors"
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
    className="flex items-center justify-between px-2 py-1.5 text-xs text-primary hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 rounded-lg transition-colors w-full font-medium"
  >
    <span>{label}</span>
    {icon}
  </button>
);
