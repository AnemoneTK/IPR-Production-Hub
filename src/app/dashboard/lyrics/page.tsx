"use client";
import Link from "next/link";
import { Music, Mic2, ArrowLeft, Hammer, FileText } from "lucide-react";

export default function LyricsPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      {/* Animation Icon */}
      <div className="relative mb-8 group cursor-default">
        {/* วงกลมพื้นหลัง */}
        <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-sm transition-transform group-hover:scale-105">
          <Music className="w-14 h-14 text-blue-500 opacity-80" />
        </div>

        {/* ไอคอนตกแต่งลอยๆ */}
        <div className="absolute -top-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 animate-bounce delay-100">
          <Hammer className="w-5 h-5 text-orange-500" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 animate-bounce delay-700">
          <Mic2 className="w-5 h-5 text-pink-500" />
        </div>
      </div>

      {/* Title & Description */}
      <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
        กำลังก่อสร้าง... 🚧
      </h1>

      <div className="max-w-md space-y-2 text-gray-500 mb-8">
        <p>
          หน้า <strong>เนื้อเพลง & บท (Lyrics & Scripts)</strong>{" "}
          กำลังอยู่ในขั้นตอนการพัฒนาอย่างเข้มข้น
        </p>
        <p className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
          <span className="font-bold text-gray-700">
            ฟีเจอร์ที่จะมาเร็วๆ นี้:
          </span>
          <br />
          ✨ เขียนเนื้อเพลงและจัดท่อนร้อง
          <br />
          ✨ ไฮไลท์ชื่อคนร้องแต่ละท่อน
          <br />✨ เขียนบทพูดสำหรับงานตัดต่อ
        </p>
      </div>

      {/* Back Button */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> กลับไปหน้าหลัก
      </Link>
    </div>
  );
}
