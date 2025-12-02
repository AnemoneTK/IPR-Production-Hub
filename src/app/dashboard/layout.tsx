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
  User, // เพิ่มไอคอน User มาสำรอง
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // State สำหรับเก็บตัวย่อชื่อ (Initials)
  const [userInitials, setUserInitials] = useState("");

  useEffect(() => {
    const checkSecurity = async () => {
      try {
        // 1. เช็ค User
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // 2. ดึงข้อมูล Profile (ขอ display_name เพิ่มด้วย)
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("must_change_password, display_name") // <--- ขอชื่อมาด้วย
          .eq("id", user.id)
          .single();

        if (profile?.must_change_password === true) {
          router.push("/change-password");
          return;
        }

        // 3. สร้างตัวย่อชื่อ (Initials Logic)
        if (profile?.display_name) {
          // ถ้ามีชื่อเล่น: เอา 2 ตัวแรก (เช่น "Admin" -> "AD")
          setUserInitials(profile.display_name.substring(0, 2).toUpperCase());
        } else if (user.email) {
          // ถ้าไม่มีชื่อ: เอา 2 ตัวแรกของอีเมล
          setUserInitials(user.email.substring(0, 2).toUpperCase());
        }

        setIsChecking(false);
      } catch (err) {
        console.error("Auth check error:", err);
        router.push("/login");
      }
    };

    checkSecurity();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
        <div className="h-16 flex items-center px-6 border-b border-primary-light/50">
          <div className="flex items-center gap-1 font-extrabold text-xl tracking-tight select-none">
            <span className="text-white">IPR</span>
            <span className="bg-orange-500 text-gray-900 px-2 py-0.5 rounded-md leading-tight">
              Hub
            </span>
          </div>
          <button
            className="md:hidden ml-auto text-gray-400 hover:text-white"
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

            {/* --- ส่วน Profile Icon (แก้ไขใหม่) --- */}
            <Link href="/dashboard/profile" title="ตั้งค่าบัญชี">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-bold hover:shadow-md transition-all cursor-pointer ring-2 ring-transparent hover:ring-accent overflow-hidden">
                {userInitials ? (
                  // ถ้ามีชื่อย่อ ให้แสดงชื่อย่อ
                  <span>{userInitials}</span>
                ) : (
                  // ถ้ายังโหลดไม่เสร็จ หรือไม่มีชื่อ ให้แสดงไอคอน User แทน
                  <User className="w-5 h-5" />
                )}
              </div>
            </Link>
            {/* ---------------------------------- */}
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
