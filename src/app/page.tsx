"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, AlertCircle, ServerCrash } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState("กำลังตรวจสอบสถานะเซิร์ฟเวอร์...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function initializeSystem() {
      try {
        // ลอง ping database ด้วยการดึงข้อมูลง่ายๆ
        // ใช้ .count() จะเบากว่าการ select * และเร็วกว่า
        const { error } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true });

        if (error) throw error;

        // ถ้าผ่านฉลุย ให้ดีดไปหน้า Login ทันที
        setStatus("ระบบพร้อมใช้งาน! กำลังพาไปหน้า Login...");
        setTimeout(() => {
          router.replace("/login"); // ใช้ replace เพื่อไม่ให้กด Back กลับมาหน้านี้ได้
        }, 800); // หน่วงเวลานิดนึงให้คนเห็นโลโก้ก่อนไป (เพื่อความสมูท)
      } catch (err: any) {
        console.error("Connection Failed:", err);
        setIsError(true);
        setStatus("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่ภายหลัง");
      }
    }

    initializeSystem();
  }, [router]);

  // กรณี Error (เซิร์ฟเวอร์ล่ม / เน็ตหลุด)
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ServerCrash className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            ระบบขัดข้องชั่วคราว
          </h1>
          <p className="text-gray-500 mb-6 text-sm">{status}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            ลองเชื่อมต่อใหม่
          </button>
        </div>
      </div>
    );
  }

  // กรณี Loading (Splash Screen สวยๆ)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-white">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
        {/* โลโก้แอป (ถ้ามีรูปก็ใส่ตรงนี้ได้) */}
        <div className="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10 shadow-2xl shadow-accent/20">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <span className="font-bold text-lg">IPR</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2 tracking-tight">
          IPR Production Hub
        </h1>
        <div className="flex items-center gap-3 text-gray-400 text-sm mt-4 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span>{status}</span>
        </div>
      </div>

      {/* Footer เล็กๆ */}
      <div className="absolute bottom-8 text-xs text-gray-500">
        v1.0.0 • Initializing Application
      </div>
    </div>
  );
}
