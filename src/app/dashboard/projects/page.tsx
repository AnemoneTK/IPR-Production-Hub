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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-primary" />
            โปรเจกต์ทั้งหมด
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            จัดการและติดตามงาน Production ทั้งหมดของคุณ
          </p>
        </div>

        {/* ปุ่มสร้าง (ลิงก์ไปหน้าเดิมที่เราทำเมื่อกี้) */}
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
        // กรณีไม่มีโปรเจกต์
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            ยังไม่มีโปรเจกต์
          </h3>
          <p className="text-gray-500 mb-6">
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
                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
                        project.status === "done"
                          ? "bg-green-100 text-green-700"
                          : project.status === "production"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {project.status}
                    </span>
                    {/* Role ของเราในงานนี้ */}
                    <span className="text-xs text-gray-400 font-medium bg-white px-2 py-1 rounded border border-gray-100">
                      {item.roles[0]}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-accent transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1">
                  <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">
                    {project.description || "ไม่มีรายละเอียด"}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
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
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <Link
                    href={`/dashboard/projects/${project.slug}`}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 group-hover:text-accent transition-colors"
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
