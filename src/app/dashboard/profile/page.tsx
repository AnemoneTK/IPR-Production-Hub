"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Lock, Save, Loader2, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // ข้อมูลฟอร์ม
  const [profile, setProfile] = useState({
    id: "",
    email: "",
    display_name: "",
    main_role: "",
  });

  // ข้อมูลเปลี่ยนรหัส
  const [passwords, setPasswords] = useState({
    new: "",
    confirm: "",
  });

  // 1. โหลดข้อมูลเมื่อเข้าหน้า
  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) {
          setProfile({
            id: user.id,
            email: user.email || "",
            display_name: data.display_name || "",
            main_role: data.main_role || "member",
          });
        }
      }
    };
    fetchProfile();
  }, []);

  // 2. บันทึกข้อมูลทั่วไป (ชื่อ)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: profile.display_name })
        .eq("id", profile.id);

      if (error) throw error;
      setMsg({ type: "success", text: "อัปเดตข้อมูลสำเร็จ!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 3. เปลี่ยนรหัสผ่าน
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new.length < 6) {
      setMsg({ type: "error", text: "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร" });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setMsg({ type: "error", text: "รหัสผ่านไม่ตรงกัน" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });
      if (error) throw error;

      setMsg({ type: "success", text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!" });
      setPasswords({ new: "", confirm: "" }); // ล้างช่อง
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <h1 className="text-2xl font-bold text-primary">ตั้งค่าบัญชีผู้ใช้</h1>

      {/* --- ส่วนที่ 1: ข้อมูลทั่วไป --- */}
      {/* 🔥 แก้: bg-white -> bg-surface, border-gray -> border-border */}
      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
        <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-accent" /> ข้อมูลส่วนตัว
        </h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              อีเมล
            </label>
            <input
              type="text"
              disabled
              value={profile.email}
              className="w-full px-4 py-2 bg-surface-subtle border border-border rounded-lg text-primary-light cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              ชื่อที่แสดง (Display Name)
            </label>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) =>
                setProfile({ ...profile, display_name: e.target.value })
              }
              // 🔥 แก้: Input พื้นหลังสี surface, ตัวหนังสือ text-primary
              className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-primary focus:border-accent focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              ตำแหน่งหลัก (Main Role)
            </label>
            <input
              type="text"
              disabled
              value={profile.main_role}
              className="w-full px-4 py-2 bg-surface-subtle border border-border rounded-lg text-primary-light uppercase"
            />
            <p className="text-xs text-primary-light mt-1">
              หากต้องการเปลี่ยนตำแหน่ง กรุณาติดต่อ Admin
            </p>
          </div>
          <div className="pt-2 text-right">
            <button
              disabled={loading}
              className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2 ml-auto shadow-sm transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              บันทึกชื่อ
            </button>
          </div>
        </form>
      </div>

      {/* --- ส่วนที่ 2: เปลี่ยนรหัสผ่าน --- */}
      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
        <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-orange-500" /> เปลี่ยนรหัสผ่าน
        </h2>

        {/* 🔥 แก้: Alert Box สี Dark Mode */}
        {msg.text && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 my-2 border ${
              msg.type === "success"
                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5 font-bold flex items-center justify-center">
                !
              </div>
            )}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
              className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-primary focus:border-orange-500 focus:outline-none placeholder:text-primary-light/50 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-primary focus:border-orange-500 focus:outline-none placeholder:text-primary-light/50 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div className="pt-2 text-right">
            <button
              disabled={loading}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 ml-auto shadow-sm transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              เปลี่ยนรหัสผ่าน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
