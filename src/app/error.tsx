"use client"; // Error components ต้องเป็น Client Component เสมอ
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error ออกมาดูใน Console (หรือส่งไป Sentry ก็ได้)
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        เกิดข้อผิดพลาดบางอย่าง!
      </h2>
      <p className="text-gray-500 max-w-sm mb-8 text-sm">
        ระบบทำงานผิดพลาดชั่วคราว ทีมงานได้รับรายงานแล้ว <br />
        กรุณาลองใหม่อีกครั้ง หรือกลับไปหน้าหลัก
      </p>

      {/* Error Details (เฉพาะ Dev Mode จะได้เห็นง่ายๆ) */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-xs font-mono text-left max-w-lg w-full overflow-auto mb-6">
          <p className="font-bold mb-1">Error Message:</p>
          {error.message || "Unknown Error"}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={
            // พยายาม render ส่วนที่พังใหม่
            () => reset()
          }
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors font-medium shadow-md"
        >
          <RefreshCcw className="w-4 h-4" /> ลองอีกครั้ง
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          <Home className="w-4 h-4" /> หน้าหลัก
        </Link>
      </div>
    </div>
  );
}
