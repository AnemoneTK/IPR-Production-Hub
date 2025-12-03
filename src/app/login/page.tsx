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

  // เก็บ State ไว้เป็น UI (แต่เบื้องหลัง Supabase จะจำให้อัตโนมัติอยู่แล้ว)
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. ล็อกอิน (ใช้ค่า Default ของ Supabase คือจำใน LocalStorage)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      // 2. เช็ค Active
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", data.user.id)
        .single();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        router.push("/suspended");
        return;
      }

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
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="pt-10 pb-6 px-8 text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-accent">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
          <p className="text-gray-500 text-sm mt-2">IPR Production Hub</p>
        </div>

        <div className="p-8 pt-2">
          <form onSubmit={handleLogin} className="space-y-5">
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

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm checked:border-accent checked:bg-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <svg
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                  Remember Me
                </span>
              </label>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-pulse">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

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

        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">ระบบภายในสำหรับทีมงาน IPR Hub</p>
        </div>
      </div>
    </div>
  );
}
