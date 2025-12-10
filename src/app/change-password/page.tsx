"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Lock, Save, Loader2 } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (newPassword.length < 6) {
      setMsg("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      // 1. เปลี่ยนรหัสผ่านในระบบ Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) throw authError;

      // 2. ดึง User ID ปัจจุบัน
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 3. ปลดล็อคสถานะ must_change_password เป็น false
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);

        if (dbError) throw dbError;
      }

      // 4. สำเร็จ! ดีดกลับไป Dashboard
      router.push("/dashboard");
    } catch (error: any) {
      setMsg(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-primary">
            กรุณาตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-gray-500 mt-2">
            เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสผ่านจากค่าเริ่มต้น (1234)
            เป็นรหัสของคุณเอง
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border-2 border-border rounded-lg focus:border-accent focus:outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ตั้งรหัสผ่านใหม่..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border-2 border-border rounded-lg focus:border-accent focus:outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="พิมพ์อีกครั้ง..."
            />
          </div>

          {msg && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            บันทึกรหัสผ่านใหม่
          </button>
        </form>
      </div>
    </div>
  );
}
