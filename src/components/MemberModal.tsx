"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  X,
  Search,
  Plus,
  Trash2,
  Shield,
  Music,
  Mic,
  Palette,
  Video,
  User,
  HelpCircle,
  Languages,
  Eye,
  Briefcase,
  AlertTriangle,
  Loader2,
  Filter,
} from "lucide-react";

// สีสำหรับเลือก (Pastel Palette)
const MEMBER_COLORS = [
  "#fecaca",
  "#fdba74",
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#c7d2fe",
  "#e9d5ff",
  "#fbcfe8",
  "#e2e8f0",
];

// 🔥 ปรับสี Role ให้รองรับ Dark Mode
const ROLE_CONFIG: any = {
  producer: {
    label: "Producer",
    icon: Shield,
    color: "text-orange-600 dark:text-orange-300",
    bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  },
  manager: {
    label: "Manager",
    icon: Briefcase,
    color: "text-teal-600 dark:text-teal-300",
    bg: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
  },
  mixer: {
    label: "Mixer",
    icon: Music,
    color: "text-blue-600 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  singer: {
    label: "Singer",
    icon: Mic,
    color: "text-pink-600 dark:text-pink-300",
    bg: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
  },
  artist: {
    label: "Artist",
    icon: Palette,
    color: "text-purple-600 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  },
  editor: {
    label: "Editor",
    icon: Video,
    color: "text-green-600 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
  translator: {
    label: "Translator",
    icon: Languages,
    color: "text-indigo-600 dark:text-indigo-300",
    bg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
  },
  member: {
    label: "General",
    icon: User,
    color: "text-primary-light",
    bg: "bg-surface-subtle border-border",
  },
};

export default function MemberModal({
  projectId,
  onClose,
}: {
  projectId: number;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterRole, setFilterRole] = useState("all");

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: memberData } = await supabase
      .from("project_members")
      .select("*, profiles(id, display_name, email, avatar_url, main_role)")
      .eq("project_id", projectId);

    const { data: userData } = await supabase
      .from("profiles")
      .select("id, display_name, email, main_role, avatar_url")
      .order("display_name");

    setMembers(memberData || []);
    setAllUsers(userData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const getAvailableUsers = () => {
    const nonMembers = allUsers.filter(
      (user) => !members.some((m) => m.user_id === user.id)
    );

    let filtered = nonMembers;

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.display_name?.toLowerCase().includes(lowerTerm) ||
          user.email?.toLowerCase().includes(lowerTerm)
      );
    }

    if (filterRole !== "all") {
      filtered = filtered.filter(
        (u) => (u.main_role || "member") === filterRole
      );
    }

    const priority: any = {
      singer: 1,
      mixer: 2,
      producer: 3,
      artist: 4,
      member: 99,
    };

    return filtered.sort((a, b) => {
      const roleA = a.main_role || "member";
      const roleB = b.main_role || "member";
      const pA = priority[roleA] || 50;
      const pB = priority[roleB] || 50;

      if (pA !== pB) return pA - pB;
      return (a.display_name || "").localeCompare(b.display_name || "");
    });
  };

  const availableUsers = getAvailableUsers();

  const handleAddMember = async (user: any) => {
    const initialRole = user.main_role || "member";
    const { error } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: user.id,
      roles: [initialRole],
    });
    if (error) alert("เพิ่มไม่สำเร็จ: " + error.message);
    else fetchData();
  };

  const promptDeleteMember = (member: any) => {
    setDeleteTarget(member);
  };

  const confirmDeleteMember = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
    } else {
      fetchData();
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const toggleRole = async (
    memberId: number,
    currentRoles: string[],
    roleToToggle: string
  ) => {
    let newRoles = [...(currentRoles || [])];
    if (newRoles.includes(roleToToggle)) {
      if (newRoles.length > 1)
        newRoles = newRoles.filter((r) => r !== roleToToggle);
      else return;
    } else {
      newRoles.push(roleToToggle);
    }
    setMembers(
      members.map((m) => (m.id === memberId ? { ...m, roles: newRoles } : m))
    );
    const { error } = await supabase
      .from("project_members")
      .update({ roles: newRoles })
      .eq("id", memberId);
    if (error) {
      alert("บันทึกไม่สำเร็จ");
      fetchData();
    }
  };

  const changeMemberColor = async (memberId: number, color: string) => {
    setMembers(
      members.map((m) =>
        m.id === memberId ? { ...m, assigned_color: color } : m
      )
    );
    await supabase
      .from("project_members")
      .update({ assigned_color: color })
      .eq("id", memberId);
  };

  const renderZone = (roleKey: string) => {
    const config = ROLE_CONFIG[roleKey];
    if (!config) return null;
    const Icon = config.icon;
    const zoneMembers = members.filter((m) => m.roles?.includes(roleKey));
    if (zoneMembers.length === 0) return null;

    return (
      <div className="mb-6 last:mb-0 animate-in fade-in slide-in-from-bottom-2">
        <h4
          className={`text-xs font-bold flex items-center gap-2 mb-2 uppercase tracking-wider ${config.color}`}
        >
          <Icon className="w-3 h-3" /> ทีม {config.label}
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {zoneMembers.map((m) => (
            <MemberCard
              key={m.id + roleKey}
              m={m}
              toggleRole={toggleRole}
              onDeleteClick={() => promptDeleteMember(m)}
              changeMemberColor={changeMemberColor}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      {/* 🔥 แก้: bg-white -> bg-surface */}
      <div className="bg-surface w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-border">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface-subtle/50">
          <div>
            <h3 className="font-bold text-xl text-primary">จัดการทีมงาน</h3>
            <p className="text-xs text-primary-light mt-1">
              เพิ่มสมาชิกและกำหนดหน้าที่รับผิดชอบ
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-light hover:text-primary p-1 hover:bg-surface-subtle rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left: Available Users */}
          <div className="w-full md:w-80 bg-surface border-r border-border flex flex-col z-10">
            <div className="p-4 border-b border-border bg-surface-subtle/50 space-y-3">
              <label className="text-xs font-bold text-primary-light uppercase block">
                รายชื่อในระบบ
              </label>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-primary-light w-4 h-4" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ..."
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-sm text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder:text-primary-light/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter Dropdown */}
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 text-primary-light w-4 h-4" />
                <select
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-sm text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="all">ทุกตำแหน่ง</option>
                  <option value="singer">🎤 นักร้อง (Singer)</option>
                  <option value="mixer">🎧 มิกซ์ (Mixer)</option>
                  <option value="producer">🛡️ โปรดิวเซอร์ (Producer)</option>
                  <option value="artist">🎨 อาร์ต (Artist)</option>
                  <option value="member">👤 ทั่วไป (Member)</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-surface-subtle/30">
              {loading ? (
                <div className="text-center py-8 text-primary-light text-xs">
                  Loading...
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-xs text-primary-light">
                    {searchTerm
                      ? "ไม่พบรายชื่อที่ค้นหา"
                      : "เพื่อนทุกคนอยู่ในทีมแล้ว"}
                  </p>
                </div>
              ) : (
                availableUsers.map((user) => {
                  const roleKey = user.main_role || "member";
                  const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG["member"];
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-100 dark:hover:border-blue-800 border border-transparent rounded-xl transition-all group text-left mb-1 bg-surface shadow-sm dark:shadow-none"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-primary-light font-bold text-xs group-hover:bg-blue-200 group-hover:text-blue-700 dark:group-hover:bg-blue-800 dark:group-hover:text-blue-200">
                        {user.display_name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {user.display_name}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] mt-1">
                          <span
                            className={`uppercase px-1.5 py-0.5 rounded border font-bold tracking-wide ${config.bg} ${config.color}`}
                          >
                            {config.label}
                          </span>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-primary-light group-hover:text-accent" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Current Team */}
          <div className="flex-1 overflow-y-auto p-5 bg-surface">
            {loading ? (
              <div className="text-center py-10 text-primary-light">
                กำลังโหลด...
              </div>
            ) : (
              <>
                {renderZone("producer")}
                {renderZone("manager")}
                {renderZone("mixer")}
                {renderZone("singer")}
                {renderZone("artist")}
                {renderZone("translator")}
                {renderZone("editor")}
                {renderZone("viewer")}
                {renderZone("member")}
                {members.filter((m) => !m.roles || m.roles.length === 0)
                  .length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary-light">
                      <HelpCircle className="w-3 h-3" /> Unassigned
                    </h4>
                    {members
                      .filter((m) => !m.roles || m.roles.length === 0)
                      .map((m) => (
                        <MemberCard
                          key={m.id}
                          m={m}
                          toggleRole={toggleRole}
                          onDeleteClick={() => promptDeleteMember(m)}
                          changeMemberColor={changeMemberColor}
                        />
                      ))}
                  </div>
                )}
                {members.length === 0 && (
                  <div className="text-center py-20 text-primary-light border-2 border-dashed border-border rounded-xl">
                    ยังไม่มีสมาชิกในทีม
                    <br />
                    เลือกเพิ่มจากฝั่งซ้ายได้เลย
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100 dark:border-red-900/50 scale-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary">
              ยืนยันการลบสมาชิก?
            </h3>
            <p className="text-sm text-primary-light mt-2 mb-6 leading-relaxed">
              คุณต้องการลบ{" "}
              <span className="font-bold text-primary">
                "{deleteTarget.profiles?.display_name}"
              </span>{" "}
              ออกจากทีมใช่ไหม?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-surface-subtle text-primary font-medium rounded-xl hover:bg-border transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteMember}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>ลบออก</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component MemberCard
function MemberCard({ m, toggleRole, onDeleteClick, changeMemberColor }: any) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl shadow-sm dark:shadow-none hover:border-accent/30 transition-all group">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 font-bold text-xs shadow-inner border-2 border-white dark:border-surface-subtle ring-1 ring-border hover:scale-105 transition-transform"
            style={{ backgroundColor: m.assigned_color || "#e2e8f0" }}
            title="เปลี่ยนสีประจำตัว"
          >
            {m.profiles?.display_name?.substring(0, 2).toUpperCase()}
          </button>
          {showColorPicker && (
            <>
              <div className="absolute top-full left-0 mt-2 bg-surface p-2 rounded-xl shadow-xl border border-border grid grid-cols-3 gap-1 z-50 w-24 animate-in fade-in zoom-in-95">
                {MEMBER_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      changeMemberColor(m.id, color);
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </div>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowColorPicker(false)}
              ></div>
            </>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">
            {m.profiles?.display_name}
          </p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {Object.keys(ROLE_CONFIG)
              .filter((k) => k !== "member")
              .map((rKey) => {
                const config = ROLE_CONFIG[rKey];
                const isActive = m.roles?.includes(rKey);
                return (
                  <button
                    key={rKey}
                    onClick={() => toggleRole(m.id, m.roles, rKey)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all duration-200 font-medium ${
                      isActive
                        ? `${config.bg} ${config.color} shadow-sm dark:shadow-none ring-1 ring-opacity-20 ring-current`
                        : `bg-surface border-border ${config.color} opacity-50 hover:opacity-100 hover:bg-surface-subtle`
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
      {!m.roles?.includes("producer") && (
        <button
          onClick={onDeleteClick}
          className="p-2 text-primary-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
