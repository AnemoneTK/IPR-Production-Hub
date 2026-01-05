// src/app/dashboard/projects/page.tsx
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
  Search,
  LayoutGrid,
  List,
} from "lucide-react";

// กำหนด Type ของข้อมูล
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
  projects: Project;
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const fetchProjects = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
      } else {
        // @ts-ignore
        setProjects(data || []);
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  // Filter Projects ตามคำค้นหา
  const filteredProjects = projects.filter((item) =>
    item.projects.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper สำหรับเลือกสี Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "production":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-accent">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* --- Header ส่วนหัว --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-primary" />
            โปรเจกต์ทั้งหมด
          </h1>
          <p className="text-primary-light text-sm mt-1">
            จัดการและติดตามงาน Production ทั้งหมดของคุณ
          </p>
        </div>

        <Link
          href="/dashboard/projects/create"
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          สร้างใหม่
        </Link>
      </div>

      {/* --- Toolbar: Search & View Toggle --- */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-surface p-2 rounded-xl border border-border">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-light" />
          <input
            type="text"
            placeholder="ค้นหาชื่อโปรเจกต์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 text-primary placeholder:text-primary-light/70"
          />
        </div>

        {/* View Toggles */}
        <div className="flex items-center bg-surface-subtle p-1 rounded-lg border border-border">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "grid"
                ? "bg-white dark:bg-zinc-700 text-accent shadow-sm"
                : "text-primary-light hover:text-primary"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "list"
                ? "bg-white dark:bg-zinc-700 text-accent shadow-sm"
                : "text-primary-light hover:text-primary"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- Content Area --- */}
      {filteredProjects.length === 0 ? (
        // Empty State
        <div className="text-center py-16 bg-surface rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-primary-light">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-primary">
            ไม่พบโปรเจกต์ที่ค้นหา
          </h3>
          <p className="text-primary-light mb-6">
            ลองปรับคำค้นหา หรือสร้างโปรเจกต์ใหม่
          </p>
          {projects.length === 0 && (
            <Link
              href="/dashboard/projects/create"
              className="text-accent hover:underline font-medium"
            >
              + สร้างโปรเจกต์ใหม่
            </Link>
          )}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            // --- GRID VIEW ---
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((item: any) => {
                const project = item.projects;
                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.slug}`}
                    className="group bg-surface rounded-xl border border-border shadow-sm hover:shadow-md dark:shadow-none hover:border-accent/50 transition-all duration-200 overflow-hidden flex flex-col relative"
                  >
                    {/* Header */}
                    <div className="p-5 border-b border-border bg-surface-subtle/30 group-hover:bg-accent/5 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${getStatusBadge(
                            project.status
                          )}`}
                        >
                          {project.status}
                        </span>
                        <span className="text-xs text-primary-light font-medium bg-surface px-2 py-1 rounded border border-border">
                          {item.roles[0]}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                        {project.title}
                      </h3>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1">
                      <p className="text-primary-light text-sm line-clamp-2 mb-4 h-10">
                        {project.description || "ไม่มีรายละเอียด"}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-primary-light">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {project.deadline
                            ? new Date(project.deadline).toLocaleDateString(
                                "th-TH"
                              )
                            : "ไม่ระบุ"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          Team
                        </div>
                      </div>
                    </div>

                    {/* Footer Visual Cue (Optional: can be removed if cleaner look is preferred) */}
                    <div className="px-5 py-3 bg-surface-subtle border-t border-border flex justify-between items-center text-xs font-medium text-primary-light group-hover:text-accent group-hover:bg-accent/5 transition-colors">
                      <span>เข้าสู่ Workspace</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            // --- LIST VIEW ---
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-subtle text-primary border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold">ชื่อโปรเจกต์</th>
                      <th className="px-6 py-4 font-semibold">สถานะ</th>
                      <th className="px-6 py-4 font-semibold">บทบาท</th>
                      <th className="px-6 py-4 font-semibold">Deadline</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProjects.map((item: any) => {
                      const project = item.projects;
                      return (
                        <tr
                          key={project.id}
                          className="hover:bg-surface-subtle/50 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/dashboard/projects/${project.slug}`}
                              className="block"
                            >
                              <div className="font-bold text-primary group-hover:text-accent transition-colors">
                                {project.title}
                              </div>
                              <div className="text-xs text-primary-light line-clamp-1">
                                {project.description || "-"}
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getStatusBadge(
                                project.status
                              )}`}
                            >
                              {project.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-primary-light bg-surface px-2 py-1 rounded border border-border inline-block">
                              {item.roles[0]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-primary-light">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {project.deadline
                                ? new Date(project.deadline).toLocaleDateString(
                                    "th-TH"
                                  )
                                : "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/projects/${project.slug}`}
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-accent/10 text-primary-light hover:text-accent transition-colors"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
