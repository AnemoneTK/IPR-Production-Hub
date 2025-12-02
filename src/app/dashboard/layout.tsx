"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  FolderKanban,
  Music,
  LogOut,
  Menu,
  X,
  Bell,
  Loader2,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // สถานะการตรวจสอบ: true = กำลังตรวจ, false = ตรวจเสร็จแล้ว
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSecurity = async () => {
      try {
        // 1. เช็คว่า Login หรือยัง?
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log("User not found, redirecting to login...");
          router.push("/login");
          return;
        }

        console.log("Checking profile for user:", user.email);

        // 2. ดึงข้อมูล Profile มาเช็ค
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("must_change_password")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          // ถ้า Error อาจจะเพราะ RLS ยังไม่ผ่าน หรือไม่มีข้อมูล
          // แต่เพื่อความปลอดภัย เราควรปล่อยผ่านไปก่อนถ้ามันแค่หาไม่เจอ (หรือจะให้เด้งออกก็ได้)
          // ในเคสนี้ ลองดู Console ว่ามันแดงไหม
        }

        console.log("Profile Status:", profile);

        // 3. กฎเหล็ก: ถ้า must_change_password เป็น TRUE ต้องดีดออกทันที
        if (profile?.must_change_password === true) {
          console.log("Force Change Password detected! Redirecting...");
          router.push("/change-password");
          return;
        }

        // ถ้าทุกอย่างปกติ ให้เข้าได้
        setIsChecking(false);
      } catch (err) {
        console.error("Unexpected auth check error:", err);
        router.push("/login");
      }
    };

    checkSecurity();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- ส่วนเมนู (เหมือนเดิม) ---
  const menuItems = [
    { name: "ภาพรวม (Dashboard)", icon: LayoutDashboard, href: "/dashboard" },
    {
      name: "โปรเจกต์ทั้งหมด",
      icon: FolderKanban,
      href: "/dashboard/projects",
    },
    {
      name: "คลังไฟล์ (Assets)",
      icon: FolderKanban,
      href: "/dashboard/assets",
    },
    { name: "เนื้อเพลง & บท", icon: Music, href: "/dashboard/lyrics" },
  ];

  // ถ้ากำลังเช็คอยู่ ให้โชว์หน้าโหลดเต็มจอ (บัง Dashboard ไว้)
  if (isChecking) {
    return (
      <div className="h-screen w-screen bg-primary flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
        <p className="text-sm font-medium animate-pulse">
          กำลังตรวจสอบความปลอดภัย...
        </p>
      </div>
    );
  }

  // ถ้าผ่านการเช็คแล้ว ค่อยโชว์หน้า Dashboard
  return (
    <div className="flex h-screen bg-surface-subtle">
      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-primary text-white transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 flex flex-col
      `}
      >
        <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-primary-light">
          IPR Hub
          <button
            className="md:hidden ml-auto"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-primary-light hover:text-white transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-light">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-red-400 hover:bg-primary-light rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-8">
          <button
            className="md:hidden text-gray-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
            Production Workspace
          </h2>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-accent transition-colors relative">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-white text-sm font-bold">
              ME
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
