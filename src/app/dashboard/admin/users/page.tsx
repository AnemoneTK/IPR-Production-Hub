"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Shield,
  UserPlus,
  Search,
  Loader2,
  Mail,
  Lock,
  User,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Power,
  AlertTriangle,
  X,
} from "lucide-react";

// Config ตำแหน่งงาน
const ROLE_OPTIONS = [
  { value: "producer", label: "ผู้จัดการ (Producer)" },
  { value: "manager", label: "ผู้จัดการ (Manager)" },
  { value: "singer", label: "นักร้อง (Singer)" },
  { value: "mixer", label: "มิกซ์ (Mixer)" },
  { value: "artist", label: "นักวาด (Artist)" },
  { value: "translator", label: "แต่ง/แปลเพลง (Translator)" },
  { value: "editor", label: "ตัดต่อ (Editor)" },
  { value: "viewer", label: "อื่นๆ (Viewer)" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Modals & Forms State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Success Modal State
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [statusTarget, setStatusTarget] = useState<{
    user: any;
    type: "suspend" | "activate";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [createForm, setCreateForm] = useState({ email: "", role: "viewer" });
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Users
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin) {
        alert("Admin Only");
        window.location.href = "/dashboard";
        return;
      }
      setIsAdmin(true);
      fetchUsers();
    };
    init();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  // Logic การกรองข้อมูล
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.main_role === filterRole;
    return matchesSearch && matchesRole;
  });

  // 2. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error("Failed");

      setShowCreateModal(false);
      setSuccessModal({
        title: "สร้างบัญชีสำเร็จ!",
        message: `บัญชี ${createForm.email} ถูกสร้างเรียบร้อยแล้ว ระบบได้ส่งอีเมลแจ้งรหัสผ่านไปยังผู้ใช้แล้ว`,
      });
      setCreateForm({ email: "", role: "viewer" });
      fetchUsers();
    } catch (err) {
      alert("สร้างบัญชีไม่สำเร็จ");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Update User (Edit)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });
      if (!res.ok) throw new Error("Failed");

      setShowEditModal(false);
      setEditingUser(null);
      setSuccessModal({
        title: "แก้ไขข้อมูลสำเร็จ!",
        message: "ข้อมูลผู้ใช้งานได้รับการอัปเดตเรียบร้อยแล้ว",
      });
      fetchUsers();
    } catch (err) {
      alert("Error updating user");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Toggle Status
  const executeStatusChange = async () => {
    if (!statusTarget) return;
    setIsProcessing(true);
    try {
      const newUser = {
        ...statusTarget.user,
        is_active: !statusTarget.user.is_active,
      };
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error("Failed");
      fetchUsers();
      setStatusTarget(null);
      setSuccessModal({
        title: "สถานะเปลี่ยนแล้ว!",
        message: `บัญชีผู้ใช้ถูก ${
          newUser.is_active ? "เปิดใช้งาน" : "ระงับการใช้งาน"
        } เรียบร้อยแล้ว`,
      });
    } catch (e) {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Delete User
  const executeDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/users?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      setUsers(users.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessModal({
        title: "ลบบัญชีสำเร็จ!",
        message: "ข้อมูลผู้ใช้ถูกลบออกจากระบบถาวรแล้ว",
      });
    } catch (e) {
      alert("ลบไม่สำเร็จ");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />{" "}
            จัดการบัญชีผู้ใช้
          </h1>
          <p className="text-sm text-primary-light mt-1">
            บริหารจัดการสมาชิก สิทธิ์ และสถานะบัญชี
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> สร้างบัญชีใหม่
        </button>
      </div>

      {/* 🔥 Filter Bar: bg-surface, text-primary */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-primary-light w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ อีเมล..."
            className="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-primary focus:border-blue-500 outline-none transition-all placeholder:text-primary-light/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full md:w-56">
          <select
            className="w-full px-4 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-primary focus:border-blue-500 outline-none cursor-pointer"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">ทุกตำแหน่ง</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-primary-light ml-auto hidden md:block">
          แสดง {filteredUsers.length} จากทั้งหมด {users.length} ผู้ใช้
        </div>
      </div>

      {/* Users Table */}
      {/* 🔥 Table: bg-surface, border-border */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-subtle text-primary-light font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">ผู้ใช้</th>
                <th className="px-6 py-4">ตำแหน่ง</th>
                <th className="px-6 py-4">สิทธิ์</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-light" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-primary-light"
                  >
                    ไม่พบผู้ใช้ที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-surface-subtle transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            user.is_active
                              ? "bg-gradient-to-br from-blue-500 to-blue-600"
                              : "bg-gray-400 dark:bg-gray-600"
                          }`}
                        >
                          {user.display_name?.substring(0, 2).toUpperCase() ||
                            "U"}
                        </div>
                        <div>
                          <p
                            className={`font-semibold ${
                              user.is_active
                                ? "text-primary"
                                : "text-primary-light"
                            }`}
                          >
                            {user.display_name}
                          </p>
                          <p className="text-xs text-primary-light">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-surface-subtle text-primary-light px-2 py-1 rounded border border-border text-xs font-bold uppercase">
                        {user.main_role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {user.is_admin && (
                          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            ADMIN
                          </span>
                        )}
                        {user.is_producer && (
                          <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            PRODUCER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-medium text-xs">
                          <XCircle className="w-3 h-3" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() =>
                          setStatusTarget({
                            user,
                            type: user.is_active ? "suspend" : "activate",
                          })
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_active
                            ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                            : "text-primary-light hover:bg-surface-subtle"
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-2 text-primary-light hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Success Modal --- */}
      {successModal && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center border-t-4 border-green-500 relative">
            <button
              onClick={() => setSuccessModal(null)}
              className="absolute top-4 right-4 text-primary-light hover:text-primary"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">
              {successModal.title}
            </h3>
            <p className="text-primary-light text-sm mb-6">
              {successModal.message}
            </p>
            <button
              onClick={() => setSuccessModal(null)}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-500/30"
            >
              ตกลง, เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* --- Create Modal --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border">
            <h3 className="text-xl font-bold text-primary mb-4">
              เพิ่มสมาชิกใหม่
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary-light uppercase mb-1">
                  อีเมล
                </label>
                <input
                  type="email"
                  required
                  placeholder="example@ipr.com"
                  className="w-full p-3 bg-surface border border-border rounded-xl outline-none focus:border-blue-500 text-primary"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary-light uppercase mb-2">
                  ตำแหน่ง (Main Role)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {ROLE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        createForm.role === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                          : "border-border hover:border-accent/50 bg-surface"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={createForm.role === option.value}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, role: e.target.value })
                        }
                      />
                      <span className="text-sm font-bold text-primary">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-primary-light hover:bg-surface-subtle rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  สร้างบัญชี
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Edit Modal --- */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-border">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />{" "}
              แก้ไขข้อมูลผู้ใช้
            </h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary-light uppercase mb-1">
                  ชื่อที่แสดง
                </label>
                <input
                  type="text"
                  className="w-full p-2 bg-surface border border-border rounded-lg text-primary outline-none focus:border-accent"
                  value={editingUser.display_name}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      display_name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary-light uppercase mb-1">
                  ตำแหน่ง
                </label>
                <select
                  className="w-full p-2 bg-surface border border-border rounded-lg text-primary outline-none focus:border-accent"
                  value={editingUser.main_role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      main_role: e.target.value,
                    })
                  }
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer text-primary">
                  <input
                    type="checkbox"
                    checked={editingUser.is_admin}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        is_admin: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />{" "}
                  <span className="text-sm font-medium">Admin</span>
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-primary-light hover:bg-surface-subtle rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Status/Delete Modals --- */}
      {statusTarget && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-border scale-100 animate-in zoom-in-95 duration-200 text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                statusTarget.type === "suspend"
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              }`}
            >
              {statusTarget.type === "suspend" ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>
            <h3
              className={`text-xl font-bold mb-2 ${
                statusTarget.type === "suspend"
                  ? "text-red-700 dark:text-red-400"
                  : "text-green-700 dark:text-green-400"
              }`}
            >
              {statusTarget.type === "suspend"
                ? "ยืนยันระงับบัญชี?"
                : "ยืนยันเปิดใช้งาน?"}
            </h3>
            <p className="text-sm text-primary-light mb-6">
              คุณกำลังจะ{statusTarget.type === "suspend" ? "ปิด" : "เปิด"}
              การใช้งานบัญชีของ{" "}
              <span className="font-bold text-primary">
                {statusTarget.user.display_name}
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStatusTarget(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-surface-subtle text-primary font-medium rounded-xl hover:bg-border transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeStatusChange}
                disabled={isProcessing}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 ${
                  statusTarget.type === "suspend"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                <span>ยืนยัน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-red-100 dark:border-red-900/50 scale-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-red-700 dark:text-red-400">
              ลบบัญชีถาวร?
            </h3>
            <p className="text-sm text-primary-light mb-6">
              คุณต้องการลบบัญชี{" "}
              <span className="font-bold text-primary">
                {deleteTarget.email}
              </span>{" "}
              ออกจากระบบอย่างถาวรใช่ไหม?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-surface-subtle text-primary font-medium rounded-xl hover:bg-border transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDeleteUser}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>ลบถาวร</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
