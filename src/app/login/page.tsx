"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. ส่งอีเมลและรหัสผ่านไปเช็คกับ Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // --- แก้ไขจุดที่ 1: เช็ค Error ก่อนทำอย่างอื่น ---
      if (error) {
        throw error;
      }

      // --- แก้ไขจุดที่ 2: เช็คว่ามี User จริงไหม (กัน TypeScript ฟ้อง null) ---
      if (!data.user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      // 2. ดึงข้อมูล Profile เพื่อเช็คว่า Active ไหม
      // (ถึงตรงนี้ data.user.id จะไม่แดงแล้ว เพราะเราเช็คด้านบนแล้ว)
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", data.user.id)
        .single();

      // เช็คสถานะการระงับบัญชี
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut(); // เตะออกทันที
        router.push("/suspended"); // ส่งไปหน้าแจ้งเตือน
        return;
      }

      // 3. ถ้าผ่านทุกด่าน ค่อยไป Dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login Error:", error.message);
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setErrorMsg("เกิดข้อผิดพลาด: " + error.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      {/* การ์ด Login */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="pt-10 pb-6 px-8 text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-accent">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
          <p className="text-gray-500 text-sm mt-2">IPR Production Hub</p>
        </div>

        {/* Form */}
        <div className="p-8 pt-2">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3 text-gray-400 w-5 h-5 group-focus-within:text-accent transition-colors" />
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-100 rounded-xl focus:border-accent focus:bg-blue-50/30 focus:outline-none transition-all text-gray-800 placeholder:text-gray-300"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3 text-gray-400 w-5 h-5 group-focus-within:text-accent transition-colors" />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-100 rounded-xl focus:border-accent focus:bg-blue-50/30 focus:outline-none transition-all text-gray-800 placeholder:text-gray-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Error Message Display */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-pulse">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover active:scale-[0.98] text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">
            ติดปัญหาการเข้าใช้งาน?{" "}
            <span className="text-accent cursor-pointer hover:underline">
              ติดต่อ Admin
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
