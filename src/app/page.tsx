"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [status, setStatus] = useState("กำลังเชื่อมต่อ...");
  const [color, setColor] = useState("text-yellow-500");

  useEffect(() => {
    async function checkConnection() {
      // ลองดึงข้อมูลจากตาราง projects (ถึงจะไม่มีข้อมูล แต่มันต้องไม่ Error)
      const { data, error } = await supabase.from("projects").select("*");

      if (error) {
        console.error(error);
        setStatus("เชื่อมต่อล้มเหลว! (ดู Error ใน Console)");
        setColor("text-red-500");
      } else {
        setStatus("✅ เชื่อมต่อ Supabase สำเร็จ! พร้อมลุย");
        setColor("text-green-500");
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">IPR Production Hub</h1>
        <p className={`text-xl font-semibold ${color}`}>{status}</p>
      </div>
    </div>
  );
}
