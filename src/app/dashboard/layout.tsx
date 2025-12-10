"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import {
  LayoutDashboard,
  FolderKanban,
  Music,
  LogOut,
  Menu,
  X,
  Bell,
  Loader2,
  User,
  Bug,
  Shield,
  UserPlus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Desktop Sidebar States
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 🔥 เพิ่ม state สำหรับรูปโปรไฟล์
  const [userInitials, setUserInitials] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const isSidebarExpanded = isDesktopOpen || isSidebarHovered;

  useEffect(() => {
    const checkSecurity = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // 🔥 ดึง avatar_url เพิ่มด้วย
        const { data: profile } = await supabase
          .from("profiles")
          .select("must_change_password, display_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (profile?.must_change_password === true) {
          router.push("/change-password");
          return;
        }

        // Set Initials
        if (profile?.display_name) {
          setUserInitials(profile.display_name.substring(0, 2).toUpperCase());
        } else if (user.email) {
          setUserInitials(user.email.substring(0, 2).toUpperCase());
        }

        // 🔥 Set Avatar URL
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }

        // Check Admin
        if (user) {
          const { data: adminCheck } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

          if (adminCheck?.is_admin) setIsAdmin(true);
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
    { name: "แจ้งปัญหา / แนะนำ", icon: Bug, href: "/dashboard/feedback" },
  ];

  if (isChecking) {
    return (
      <div className="h-screen w-screen bg-sidebar flex flex-col items-center justify-center text-white space-y-4">
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
        onMouseEnter={() => !isDesktopOpen && setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`
        fixed inset-y-0 left-0 z-50 bg-sidebar text-white transition-all duration-300 ease-in-out shadow-xl
        ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
        md:relative md:translate-x-0 
        ${isSidebarExpanded ? "md:w-64" : "md:w-20"}
        flex flex-col overflow-hidden
      `}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-primary-light/50 whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-1 font-extrabold text-xl tracking-tight select-none">
            <span className="text-white">IPR</span>
            <span
              className={`bg-[#ffa31a] text-primary px-1 py-0.5 ml-1 rounded-md leading-tight transition-opacity duration-300 ${
                isSidebarExpanded ? "opacity-100" : "opacity-0 md:hidden block"
              }`}
            >
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

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-sidebar-light hover:text-white transition-colors group relative"
              title={!isSidebarExpanded ? item.name : ""}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-300 ${
                  isSidebarExpanded
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4 w-0 overflow-hidden"
                }`}
              >
                {item.name}
              </span>
            </Link>
          ))}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-primary-light/50">
              <p
                className={`px-3 text-xs font-bold text-gray-500 uppercase mb-2 whitespace-nowrap transition-opacity duration-300 ${
                  isSidebarExpanded ? "opacity-100" : "opacity-0 hidden"
                }`}
              >
                Admin Zone
              </p>
              <Link
                href="/dashboard/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-orange-300 hover:bg-sidebar-light hover:text-white transition-colors mt-1"
                title={!isSidebarExpanded ? "จัดการบัญชีผู้ใช้" : ""}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span
                  className={`whitespace-nowrap transition-all duration-300 ${
                    isSidebarExpanded
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-4 w-0 overflow-hidden"
                  }`}
                >
                  จัดการบัญชีผู้ใช้
                </span>
              </Link>
              <Link
                href="/dashboard/admin/feedback"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-orange-300 hover:bg-sidebar-light hover:text-white transition-colors"
                title={!isSidebarExpanded ? "จัดการ Feedback" : ""}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <span
                  className={`whitespace-nowrap transition-all duration-300 ${
                    isSidebarExpanded
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-4 w-0 overflow-hidden"
                  }`}
                >
                  จัดการ Feedback
                </span>
              </Link>
            </div>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-primary-light">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-red-400 hover:bg-sidebar-light rounded-lg transition-colors"
            title={!isSidebarExpanded ? "ออกจากระบบ" : ""}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${
                isSidebarExpanded
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-4 w-0 overflow-hidden"
              }`}
            >
              ออกจากระบบ
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-sidebar shadow-sm flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger */}
            <button
              className="md:hidden text-primary-light"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Sidebar Toggle Button */}
            <button
              className="hidden md:flex text-gray-400 hover:text-primary-light transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsDesktopOpen(!isDesktopOpen)}
              title={isDesktopOpen ? "ย่อแถบเมนู" : "ตรึงแถบเมนู"}
            >
              {isDesktopOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>

            <h2 className="text-lg font-semibold text-primary dark:text-white hidden md:block">
              Production Workspace
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button className="p-2 text-gray-400 hover:text-accent transition-colors relative">
              <Bell className="w-5 h-5" />
            </button>

            {/* 🔥 แก้ไข Profile Icon ตรงนี้ */}
            <Link href="/dashboard/profile" title="ตั้งค่าบัญชี">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold hover:shadow-md transition-all cursor-pointer ring-2 ring-transparent hover:ring-accent overflow-hidden relative">
                {/* 🔥 แก้ไข: เปลี่ยน bg-gradient-to-br... 
                   จาก: from-primary to-primary-light (ซึ่งจะกลายเป็นขาวใน dark mode)
                   เป็น: from-blue-500 to-indigo-600 (สีฟ้าเข้ม สด ชัดเจนตลอดเวลา)
                */}

                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : userInitials ? (
                  <span>{userInitials}</span>
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      {/* Overlay สำหรับ Mobile (เมื่อ Sidebar เปิด) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
