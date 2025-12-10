"use client";
import { useState } from "react";
import { ReferenceLink } from "./LyricEditor";
import { ExternalLink, Link as LinkIcon, Trash2 } from "lucide-react";

const getYouTubeID = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

interface ReferenceListProps {
  links: ReferenceLink[];
  onDelete: (id: number) => void;
  isResizing?: boolean;
  type: "youtube" | "general";
}

function ReferenceItem({
  link,
  onDelete,
  isResizing,
  type,
}: {
  link: ReferenceLink;
  onDelete: (id: number) => void;
  isResizing?: boolean;
  type: "youtube" | "general";
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const youtubeId = getYouTubeID(link.url);

  return (
    // 🔥 แก้: bg-white -> bg-surface, ปรับ hover border ให้รองรับ dark mode
    <div className="group bg-surface p-3 rounded-xl border border-border hover:border-red-200 dark:hover:border-red-900/50 hover:shadow-sm dark:hover:shadow-none transition-all w-full overflow-hidden max-w-full relative">
      <div className="flex justify-between items-start mb-2">
        {type === "youtube" ? (
          <div className="min-w-0 flex-1 mr-2">
            <div
              className="font-bold text-primary text-sm truncate"
              title={link.title}
            >
              {link.title}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            {/* 🔥 แก้: สีไอคอนม่วง */}
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-300 flex-shrink-0">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-primary text-sm truncate">
                {link.title}
              </h4>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary-light hover:text-purple-600 dark:hover:text-purple-300 hover:underline truncate block"
              >
                {link.url}
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 relative">
          {type === "general" && (
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-primary-light hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* ปุ่มลบพร้อม Popover */}
          <div className="relative">
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              className={`p-1 rounded-lg transition-all ${
                showConfirm
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
                  : "text-primary-light hover:text-red-500 opacity-0 group-hover:opacity-100"
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {showConfirm && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowConfirm(false)}
                ></div>
                {/* 🔥 แก้: Popover สีพื้นหลัง */}
                <div className="absolute right-0 top-full mt-2 w-24 bg-surface rounded-lg shadow-xl border border-red-100 dark:border-red-900/50 z-20 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  <button
                    onClick={() => onDelete(link.id)}
                    className="w-full text-center px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-colors"
                  >
                    ยืนยันลบ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {type === "youtube" && youtubeId && (
        <div className="mt-1 rounded-lg overflow-hidden bg-black aspect-video relative group/video shadow-sm w-full">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: isResizing ? "none" : "auto" }}
          />
        </div>
      )}
    </div>
  );
}

export default function ReferenceList({
  links,
  onDelete,
  isResizing = false,
  type,
}: ReferenceListProps) {
  if (links.length === 0) {
    return (
      // 🔥 แก้: สี text และ border
      <div className="text-center py-20 text-primary-light border-2 border-dashed border-border rounded-xl bg-surface-subtle/50">
        <LinkIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
        ยังไม่มีลิงก์{type === "youtube" ? "วิดีโอ" : "อ้างอิง"}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${type === "youtube" ? "" : "grid-cols-1"}`}>
      {links.map((link) => (
        <ReferenceItem
          key={link.id}
          link={link}
          onDelete={onDelete}
          isResizing={isResizing}
          type={type}
        />
      ))}
    </div>
  );
}
