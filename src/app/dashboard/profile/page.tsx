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
      <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าบัญชีผู้ใช้</h1>

      {/* แจ้งเตือนผลลัพธ์ */}

      {/* --- ส่วนที่ 1: ข้อมูลทั่วไป --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-accent" /> ข้อมูลส่วนตัว
        </h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล
            </label>
            <input
              type="text"
              disabled
              value={profile.email}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อที่แสดง (Display Name)
            </label>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) =>
                setProfile({ ...profile, display_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ตำแหน่งหลัก (Main Role)
            </label>
            <input
              type="text"
              disabled
              value={profile.main_role}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 uppercase"
            />
            <p className="text-xs text-gray-400 mt-1">
              หากต้องการเปลี่ยนตำแหน่ง กรุณาติดต่อ Admin
            </p>
          </div>
          <div className="pt-2 text-right">
            <button
              disabled={loading}
              className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2 ml-auto"
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-orange-500" /> เปลี่ยนรหัสผ่าน
        </h2>
        {msg.text && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 my-2 ${
              msg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5 font-bold">!</div>
            )}
            {msg.text}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div className="pt-2 text-right">
            <button
              disabled={loading}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 ml-auto"
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
