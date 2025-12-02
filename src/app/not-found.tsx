"use client";
import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      {/* Icon Animation */}
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <FileQuestion className="w-12 h-12 text-accent" />
      </div>

      {/* Text Content */}
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
        404
      </h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        ไม่พบหน้าที่คุณต้องการ
      </h2>
      <p className="text-gray-500 max-w-md mb-8">
        หน้านี้อาจถูกลบ ย้ายไปที่อื่น หรือคุณอาจพิมพ์ลิงก์ผิด <br />
        ลองตรวจสอบความถูกต้องอีกครั้งนะครับ
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors font-medium shadow-lg shadow-blue-500/30"
        >
          <Home className="w-4 h-4" /> กลับหน้าหลัก
        </Link>
      </div>

      {/* Footer Decoration */}
      <div className="absolute bottom-8 text-xs text-gray-400 font-mono">
        IPR Production Hub • Error 404
      </div>
    </div>
  );
}
