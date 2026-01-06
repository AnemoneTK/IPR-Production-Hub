// src/app/dashboard/admin/users/page.tsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  User,
  Shield,
  Loader2,
  Save,
  X,
  CheckCircle2,
  HelpCircle,
  Edit,
  Briefcase,
  AlertCircle,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  main_role: string;
  is_admin: boolean;
  discord_id: string | null;
  is_producer: boolean;
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // State สำหรับ Modal แก้ไข
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    display_name: "",
    main_role: "",
    discord_id: "",
    is_admin: false,
    is_producer: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      display_name: user.display_name || "",
      main_role: user.main_role || "user",
      discord_id: user.discord_id || "",
      is_admin: user.is_admin || false,
      is_producer: user.is_producer || false,
    });
  };

  // 🔥🔥🔥 แก้ไขฟังก์ชันนี้ให้เรียก API แทน 🔥🔥🔥
  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsSaving(true);

    const updates = {
      display_name: formData.display_name,
      main_role: formData.main_role,
      discord_id: formData.discord_id.trim() || null,
      is_admin: formData.is_admin,
      is_producer: formData.is_producer,
    };

    try {
      // เรียก API ที่เราสร้างขึ้น (Bypass RLS)
      const response = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: editingUser.id,
          updates: updates,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update");
      }

      // ถ้าสำเร็จ อัปเดตข้อมูลในหน้าเว็บทันที
      setProfiles((prev) =>
        prev.map((p) => (p.id === editingUser.id ? { ...p, ...updates } : p))
      );
      setEditingUser(null);
      alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
    } catch (error: any) {
      console.error("Save error:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-surface min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <User className="w-6 h-6" /> จัดการผู้ใช้
          </h1>
          <p className="text-primary-light text-sm mt-1">
            แก้ไขบทบาท, สิทธิ์ Admin, และ Discord ID ของสมาชิก
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-light" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ อีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 text-primary"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle border-b border-border text-primary-light font-medium">
              <tr>
                <th className="px-6 py-4">ผู้ใช้งาน</th>
                <th className="px-6 py-4">บทบาท (Role)</th>
                <th className="px-6 py-4">Discord ID</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProfiles.map((profile) => (
                <tr
                  key={profile.id}
                  className="hover:bg-surface-subtle/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-primary-light" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-primary flex items-center gap-2">
                          {profile.display_name || "ไม่ระบุชื่อ"}
                          {profile.is_admin && (
                            <Shield className="w-3 h-3 text-orange-500 fill-orange-500/20" />
                          )}
                        </div>
                        <div className="text-xs text-primary-light">
                          {profile.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                      {profile.main_role || "User"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-primary">
                    {profile.discord_id ? (
                      <div className="flex items-center gap-1">
                        <span className="bg-surface-subtle px-2 py-1 rounded border border-border">
                          {profile.discord_id.substring(0, 4)}...
                          {profile.discord_id.substring(
                            profile.discord_id.length - 4
                          )}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      </div>
                    ) : (
                      <span className="text-primary-light/50 italic text-[10px]">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEditClick(profile)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-subtle border border-border hover:border-accent text-primary rounded-lg transition-all text-xs font-medium shadow-sm"
                    >
                      <Edit className="w-3 h-3" /> แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal แก้ไขข้อมูลผู้ใช้ --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Edit className="w-5 h-5 text-accent" /> แก้ไขข้อมูลผู้ใช้
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-primary-light hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* 1. General Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-primary uppercase mb-1.5 block">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-primary focus:border-accent outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-primary uppercase mb-1.5 block">
                      Role
                    </label>
                    <select
                      value={formData.main_role}
                      onChange={(e) =>
                        setFormData({ ...formData, main_role: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-primary focus:border-accent outline-none text-sm cursor-pointer"
                    >
                      <option value="user">User</option>
                      <option value="singer">Singer</option>
                      <option value="producer">Producer</option>
                      <option value="mixer">Mixer</option>
                      <option value="artist">Artist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-primary uppercase mb-1.5 block">
                      Producer Status
                    </label>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          is_producer: !formData.is_producer,
                        })
                      }
                      className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.is_producer
                          ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 text-purple-700 dark:text-purple-300"
                          : "bg-surface-subtle border-border text-primary-light"
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                      {formData.is_producer ? "Is Producer" : "Normal User"}
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* 2. Discord Integration */}
              <div>
                <label className="text-xs font-bold text-primary uppercase mb-1.5 flex items-center gap-1">
                  Discord User ID
                  <span className="text-[10px] font-normal text-primary-light/70 normal-case">
                    (สำหรับแจ้งเตือนงาน)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น 897364521098765432"
                    value={formData.discord_id}
                    onChange={(e) =>
                      setFormData({ ...formData, discord_id: e.target.value })
                    }
                    className="w-full pl-4 pr-10 py-2.5 bg-surface-subtle border border-border rounded-xl text-primary focus:border-accent outline-none font-mono text-sm"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 group cursor-help">
                    <HelpCircle className="w-4 h-4 text-primary-light" />
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-black text-white text-xs p-2 rounded hidden group-hover:block z-20 leading-relaxed shadow-lg">
                      คลิกขวาที่ชื่อใน Discord {">"} Copy User ID <br />{" "}
                      (ต้องเปิด Developer Mode ในตั้งค่า Discord ก่อน)
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Admin Zone */}
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-700 dark:text-red-400">
                        Admin Privileges
                      </h4>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70">
                        สิทธิ์เข้าถึงหน้า Admin ทั้งหมด
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.is_admin}
                      onChange={(e) =>
                        setFormData({ ...formData, is_admin: e.target.checked })
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border bg-surface-subtle flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setEditingUser(null)}
                className="px-5 py-2.5 text-sm font-medium text-primary hover:bg-surface rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveUser}
                disabled={isSaving}
                className="px-6 py-2.5 text-sm font-bold text-white bg-accent hover:bg-accent-hover rounded-xl flex items-center gap-2 shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
