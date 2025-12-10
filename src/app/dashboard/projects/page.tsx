"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  Calendar,
  Users,
  ArrowRight,
  Loader2,
  FolderKanban,
} from "lucide-react";

// กำหนด Type ของข้อมูลที่จะดึงมา
interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  status: string;
  deadline: string;
}

interface ProjectMember {
  roles: string[];
  projects: Project; // Supabase จะ Join ตาราง projects มาใส่ในนี้
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectMember[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ดึงข้อมูลจากตารางสมาชิก (project_members) และ Join เอาข้อมูลโปรเจกต์ (projects) มาด้วย
      const { data, error } = await supabase
        .from("project_members")
        .select(
          `
          roles,
          projects (
            id,
            title,
            slug,
            description,
            status,
            deadline
          )
        `
        )
        .eq("user_id", user.id) // เอาเฉพาะงานที่เรามีชื่ออยู่
        .order("joined_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
      } else {
        // @ts-ignore: Supabase type mapping บางทีอาจจะงงๆ เรื่อง Array/Object
        setProjects(data || []);
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-accent">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header ส่วนหัว */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-primary" />
            โปรเจกต์ทั้งหมด
          </h1>
          <p className="text-primary-light text-sm mt-1">
            จัดการและติดตามงาน Production ทั้งหมดของคุณ
          </p>
        </div>

        {/* ปุ่มสร้าง */}
        <Link
          href="/dashboard/projects/create"
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          สร้างใหม่
        </Link>
      </div>

      {/* Project Grid */}
      {projects.length === 0 ? (
        // กรณีไม่มีโปรเจกต์ (Empty State)
        // 🔥 แก้: bg-white -> bg-surface, border-gray-300 -> border-border
        <div className="text-center py-16 bg-surface rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-primary-light">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-primary">ยังไม่มีโปรเจกต์</h3>
          <p className="text-primary-light mb-6">
            เริ่มสร้างโปรเจกต์แรกของคุณได้เลย
          </p>
          <Link
            href="/dashboard/projects/create"
            className="text-accent hover:underline font-medium"
          >
            + สร้างโปรเจกต์ใหม่
          </Link>
        </div>
      ) : (
        // กรณีมีโปรเจกต์ แสดงเป็น Card
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((item: any) => {
            const project = item.projects;
            return (
              <div
                key={project.id}
                // 🔥 แก้: bg-white -> bg-surface, เพิ่ม dark:shadow-none
                className="group bg-surface rounded-xl border border-border shadow-sm hover:shadow-md dark:shadow-none transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-border bg-surface-subtle/30">
                  <div className="flex justify-between items-start mb-2">
                    {/* Status Badge: เพิ่ม dark:... เพื่อลดความสว่างในโหมดมืด */}
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
                        project.status === "done"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : project.status === "production"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {project.status}
                    </span>
                    {/* Role ของเราในงานนี้ */}
                    {/* 🔥 แก้: bg-white -> bg-surface, text-gray-400 -> text-primary-light */}
                    <span className="text-xs text-primary-light font-medium bg-surface px-2 py-1 rounded border border-border">
                      {item.roles[0]}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1">
                  {/* 🔥 แก้: text-gray-500 -> text-primary-light */}
                  <p className="text-primary-light text-sm line-clamp-2 mb-4 h-10">
                    {project.description || "ไม่มีรายละเอียด"}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-primary-light">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString("th-TH")
                        : "ไม่ระบุ"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      Team
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                {/* 🔥 แก้: bg-surface-subtle เป็น class ธีม และ border-border */}
                <div className="p-4 bg-surface-subtle border-t border-border">
                  <Link
                    href={`/dashboard/projects/${project.slug}`}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary-light group-hover:text-accent transition-colors"
                  >
                    เข้าสู่ Workspace{" "}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
