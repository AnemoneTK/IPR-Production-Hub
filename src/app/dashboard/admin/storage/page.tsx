"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  HardDrive,
  FileBox,
  Server,
  Loader2,
  PieChart,
  TrendingUp,
  AlertCircle,
  Database,
} from "lucide-react";

// ตั้งค่า Limit ของ R2 (เช่น Free Tier 10GB = 10 * 1024 * 1024 * 1024 bytes)
const R2_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

interface ProjectUsage {
  id: number | string;
  name: string;
  size: number;
  fileCount: number;
}

interface FileTypeUsage {
  type: string;
  size: number;
  count: number;
}

export default function AdminStoragePage() {
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [projectUsages, setProjectUsages] = useState<ProjectUsage[]>([]);
  const [typeUsages, setTypeUsages] = useState<FileTypeUsage[]>([]);

  // ฟังก์ชันแปลงหน่วย Byte เป็นทศนิยมสวยๆ
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  useEffect(() => {
    const fetchStorageData = async () => {
      setLoading(true);

      // ดึงข้อมูลไฟล์ทั้งหมด (เฉพาะ size, file_type, project_id) เพื่อมาคำนวณ
      // หมายเหตุ: ถ้าไฟล์เยอะมากในอนาคต อาจต้องทำ RPC function ใน Supabase แทนการดึงมาหมด
      const { data: files, error } = await supabase.from("files").select(`
          size,
          file_type,
          project_id,
          projects (title)
        `);

      if (error) {
        console.error("Error fetching storage:", error);
        setLoading(false);
        return;
      }

      let sizeSum = 0;
      let fileCount = 0;
      const projMap: Record<string, ProjectUsage> = {};
      const typeMap: Record<string, FileTypeUsage> = {};

      files?.forEach((file: any) => {
        const fileSize = file.size || 0;
        sizeSum += fileSize;
        fileCount++;

        // 1. Group by Project
        const projId = file.project_id || "global";
        const projName = file.projects?.title || "Global / Unassigned";

        if (!projMap[projId]) {
          projMap[projId] = {
            id: projId,
            name: projName,
            size: 0,
            fileCount: 0,
          };
        }
        projMap[projId].size += fileSize;
        projMap[projId].fileCount += 1;

        // 2. Group by File Type
        // จัดกลุ่มประเภทง่ายๆ เช่น image/png -> image
        let simpleType = "other";
        if (file.file_type.includes("image")) simpleType = "Images";
        else if (file.file_type.includes("audio")) simpleType = "Audio";
        else if (file.file_type.includes("video")) simpleType = "Video";
        else if (file.file_type.includes("application"))
          simpleType = "Documents";

        if (!typeMap[simpleType]) {
          typeMap[simpleType] = { type: simpleType, size: 0, count: 0 };
        }
        typeMap[simpleType].size += fileSize;
        typeMap[simpleType].count += 1;
      });

      // Sort Projects by Size
      const sortedProjects = Object.values(projMap).sort(
        (a, b) => b.size - a.size
      );

      // Sort Types by Size
      const sortedTypes = Object.values(typeMap).sort(
        (a, b) => b.size - a.size
      );

      setTotalSize(sizeSum);
      setTotalFiles(fileCount);
      setProjectUsages(sortedProjects);
      setTypeUsages(sortedTypes);
      setLoading(false);
    };

    fetchStorageData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  const usagePercent = (totalSize / R2_LIMIT_BYTES) * 100;

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Server className="w-8 h-8 text-accent" />
            Storage Monitor (R2)
          </h1>
          <p className="text-primary-light text-sm mt-1">
            ภาพรวมการใช้งานพื้นที่จัดเก็บข้อมูลในระบบ
          </p>
        </div>
        <div className="bg-surface-subtle px-4 py-2 rounded-xl border border-border text-xs text-primary-light flex items-center gap-2">
          <Database className="w-4 h-4" />
          Data synced from Database
        </div>
      </div>

      {/* --- 1. Overview Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Total Usage */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-primary-light text-sm font-medium mb-1">
                พื้นที่ใช้งานรวม
              </p>
              <h3 className="text-3xl font-bold text-primary">
                {formatBytes(totalSize)}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-subtle rounded-full h-2.5 mb-2 overflow-hidden border border-border">
            <div
              className={`h-2.5 rounded-full ${
                usagePercent > 90 ? "bg-red-500" : "bg-accent"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-primary-light">
            <span>ใช้ไป {usagePercent.toFixed(2)}%</span>
            <span>Limit: {formatBytes(R2_LIMIT_BYTES)} (Free Tier)</span>
          </div>
        </div>

        {/* Card: Total Files */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-primary-light text-sm font-medium mb-1">
                จำนวนไฟล์ทั้งหมด
              </p>
              <h3 className="text-3xl font-bold text-primary">
                {totalFiles.toLocaleString()}
              </h3>
              <p className="text-xs text-primary-light mt-2">
                Objects in Bucket
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <FileBox className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card: Cost Estimate (Mockup) */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-primary-light text-sm font-medium mb-1">
                ค่าใช้จ่ายโดยประมาณ
              </p>
              <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalSize > R2_LIMIT_BYTES ? "$0.01+" : "$0.00"}
              </h3>
              <p className="text-xs text-primary-light mt-2">
                {totalSize > R2_LIMIT_BYTES
                  ? "Over limit charges apply"
                  : "Within Free Tier limit"}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- 2. Project Breakdown Table --- */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-surface-subtle flex justify-between items-center">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Server className="w-5 h-5 text-primary-light" />
              การใช้งานตามโปรเจกต์
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-primary-light uppercase bg-surface-subtle border-b border-border">
                <tr>
                  <th className="px-6 py-3">ชื่อโปรเจกต์</th>
                  <th className="px-6 py-3">จำนวนไฟล์</th>
                  <th className="px-6 py-3">ขนาดรวม</th>
                  <th className="px-6 py-3 w-40">% ของทั้งหมด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projectUsages.map((proj) => {
                  const percent =
                    totalSize > 0 ? (proj.size / totalSize) * 100 : 0;
                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-surface-subtle transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-primary">
                        {proj.name}
                        {proj.id === "global" && (
                          <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border">
                            System
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-primary-light">
                        {proj.fileCount}
                      </td>
                      <td className="px-6 py-4 text-primary font-mono">
                        {formatBytes(proj.size)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-surface-subtle rounded-full h-1.5 overflow-hidden border border-border">
                            <div
                              className="bg-accent h-1.5 rounded-full"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-primary-light">
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 3. File Type Breakdown --- */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-border bg-surface-subtle">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary-light" />
              ประเภทไฟล์
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {typeUsages.map((type) => (
              <div key={type.type} className="group">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-primary flex items-center gap-2">
                    {type.type === "Audio" && (
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    )}
                    {type.type === "Images" && (
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    )}
                    {type.type === "Video" && (
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    )}
                    {type.type === "Documents" && (
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    )}
                    {type.type === "other" && (
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    )}
                    {type.type}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary block">
                      {formatBytes(type.size)}
                    </span>
                    <span className="text-[10px] text-primary-light block">
                      {type.count} files
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-subtle rounded-full h-2 overflow-hidden border border-border">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      type.type === "Audio"
                        ? "bg-blue-500"
                        : type.type === "Images"
                        ? "bg-purple-500"
                        : type.type === "Video"
                        ? "bg-orange-500"
                        : type.type === "Documents"
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                    style={{ width: `${(type.size / totalSize) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}

            {typeUsages.length === 0 && (
              <div className="text-center py-8 text-primary-light opacity-50">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>ไม่มีข้อมูลไฟล์</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
