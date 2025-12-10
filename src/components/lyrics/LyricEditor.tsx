"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  MessageSquare,
  Send,
  Quote,
  Eraser,
  Wind,
  GripVertical,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

// Tiptap Imports
import { useEditor, EditorContent, BubbleMenu, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import Underline from "@tiptap/extension-underline";

// --- Interfaces ---
export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  quoted_text?: string;
  created_at: string;
}

export interface SingerData {
  user_id: string;
  is_recorded: boolean;
}

export interface LyricBlock {
  id: string;
  type: "lyrics" | "interlude" | "separator";
  name: string;
  singers: SingerData[];
  htmlContent: string;
  comments: Comment[];
}

export interface Member {
  id: string;
  display_name: string;
  avatar_url?: string;
  assigned_color: string;
  roles: string[];
}

export interface ReferenceLink {
  id: number;
  script_id: number;
  url: string;
  title: string;
  project_id?: number | null;
  created_at: string;
}

// Custom Tiptap Extension
const CustomHighlight = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      commentId: {
        default: null,
        parseHTML: (e) => e.getAttribute("data-comment-id"),
        renderHTML: (a) =>
          a.commentId ? { "data-comment-id": a.commentId } : {},
      },
      color: {
        default: null,
        parseHTML: (e) => e.style.backgroundColor,
        renderHTML: (a) => {
          if (!a.color) return {};
          return {
            class: "fix-highlight-color rounded px-1 box-decoration-clone",
            style: `background-color: ${a.color};`,
          };
        },
      },
    };
  },
});

interface LyricEditorProps {
  index: number;
  block: LyricBlock;
  onUpdate: (newData: Partial<LyricBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export default function LyricEditor({
  index,
  block,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  dragHandleProps,
}: LyricEditorProps) {
  // 🔥 Safety Check 1: ป้องกัน block เป็น undefined ใน Hook
  const safeComments = block?.comments || [];
  const safeContent = block?.htmlContent || "<p></p>";

  const [showComments, setShowComments] = useState(safeComments.length > 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [quoteText, setQuoteText] = useState<string | null>(null);

  // 🔥 Safety Check 2: เช็ค block ก่อน access type
  const isInterlude = block?.type === "interlude";
  const isSeparator = block?.type === "separator";

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      CustomHighlight.configure({ multicolor: true }),
      BubbleMenuExtension,
      Underline,
    ],
    content: safeContent, // ใช้ตัวแปร safe
    onUpdate: ({ editor }: { editor: Editor }) => {
      onUpdate({ htmlContent: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm w-full p-4 outline-none min-h-[80px] focus:prose-p:text-primary text-primary max-w-none prose-p:my-1 prose-headings:text-primary prose-strong:text-primary",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          insertBreathMark();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    // 🔥 Safety Check 3: เช็คว่า editor พร้อมและ block มีค่า
    if (
      editor &&
      !editor.isDestroyed &&
      block && // ต้องมี block
      block.htmlContent !== undefined && // content ต้องไม่ undefined
      block.htmlContent !== editor.getHTML() &&
      editor.isEmpty
    ) {
      editor.commands.setContent(block.htmlContent);
    }
  }, [block?.id, editor, block?.htmlContent]); // dependency safe chaining

  // ถ้า block ไม่มีค่าเลย (เช่นโดนลบไปแล้วแต่ยัง render อยู่) ให้ return null ไปเลย
  if (!block) return null;

  const insertBreathMark = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        ' <span style="color: #3b82f6; font-weight: bold;">/</span> '
      )
      .run();
  };

  const handleQuote = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (text) {
      setQuoteText(text);
      setShowComments(true);
      editor.chain().focus().setMark("highlight", { color: "#fef08a" }).run();
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let displayName = "Me";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (profile) displayName = profile.display_name;
    }
    const newComment: Comment = {
      id: crypto.randomUUID(),
      user_id: user?.id || "unknown",
      user_name: displayName,
      text: commentInput,
      quoted_text: quoteText || undefined,
      created_at: new Date().toISOString(),
    };
    // 🔥 Safety Check 4: ใช้ safeComments
    onUpdate({ comments: [...safeComments, newComment] });
    setCommentInput("");
    setQuoteText(null);
  };

  const deleteComment = (comment: Comment) => {
    if (editor && comment.quoted_text) {
      const textToFind = comment.quoted_text;
      const { doc } = editor.state;
      let found = false;
      doc.descendants((node, pos) => {
        if (
          !found &&
          node.isText &&
          node.text &&
          node.text.includes(textToFind)
        ) {
          const start = pos + node.text.indexOf(textToFind);
          const end = start + textToFind.length;
          editor
            .chain()
            .setTextSelection({ from: start, to: end })
            .unsetHighlight()
            .run();
          found = true;
          return false;
        }
      });
    }
    // 🔥 Safety Check 5: ใช้ safeComments
    onUpdate({
      comments: safeComments.filter((c) => c.id !== comment.id),
    });
  };

  // --- Render Separator ---
  if (isSeparator) {
    return (
      <div className="group relative flex items-center gap-3 py-4 my-2">
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-primary-light hover:text-primary p-1"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 flex items-center gap-4">
          <div className="h-[2px] bg-border flex-1 rounded-full"></div>
          <div className="flex items-center gap-2 text-primary-light font-bold text-sm uppercase tracking-wider">
            [
            <input
              type="text"
              value={block.name || ""} // Safe value
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="ชื่อท่อน"
              className="bg-transparent outline-none text-center min-w-[100px] text-primary placeholder:text-primary-light/50 font-bold"
            />
            ]
          </div>
          <div className="h-[2px] bg-border flex-1 rounded-full"></div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            className="text-primary-light hover:text-primary p-1"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            className="text-primary-light hover:text-primary p-1"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="text-primary-light hover:text-red-500 p-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // --- Render Editor ---
  return (
    <div
      className={`group relative rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md ${
        isInterlude
          ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
          : "bg-surface border-border"
      }`}
    >
      <style jsx global>{`
        .fix-highlight-color {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
      `}</style>

      {/* Header */}
      <div
        className={`flex justify-between items-center p-2 pl-3 border-b rounded-t-xl ${
          isInterlude
            ? "bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800"
            : "bg-surface-subtle/50 border-border"
        }`}
      >
        <div className="relative flex items-center gap-2 flex-1 flex-wrap">
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-primary-light hover:text-primary p-1.5 rounded hover:bg-surface-subtle"
              title="ลากเพื่อย้าย"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          <input
            type="text"
            placeholder={
              isInterlude ? "ชื่อท่อนดนตรี..." : `ท่อนที่ ${index + 1}`
            }
            className={`bg-transparent font-bold text-sm w-32 outline-none placeholder:text-primary-light/50 focus:text-accent ${
              isInterlude
                ? "text-purple-700 dark:text-purple-300"
                : "text-primary"
            }`}
            value={block.name || ""}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-1 items-center">
          {!isInterlude && (
            <button
              onClick={insertBreathMark}
              className="p-1.5 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors mr-1"
              title="แทรกจุดหายใจ (/)"
            >
              <Wind className="w-4 h-4" />
            </button>
          )}

          <div className="flex flex-col gap-0.5 mr-2 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveUp}
              className="text-primary-light hover:text-primary"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={onMoveDown}
              className="text-primary-light hover:text-primary"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-primary-light hover:text-accent hover:bg-surface-subtle rounded-lg"
            title="ทำซ้ำ"
          >
            <Copy className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className={`p-1.5 rounded-lg transition-colors ${
                showDeleteConfirm
                  ? "bg-red-50 dark:bg-red-900/30 text-red-500"
                  : "text-primary-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {showDeleteConfirm && (
              <>
                <div className="absolute top-full right-0 mt-2 w-48 bg-surface rounded-xl shadow-xl border border-red-200 dark:border-red-900/50 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 text-center border-b border-border">
                    <p className="text-xs font-bold text-primary">
                      ยืนยันลบท่อนนี้?
                    </p>
                  </div>
                  <div className="flex">
                    <button
                      onClick={onDelete}
                      className="flex-1 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      ลบ
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 text-xs font-medium text-primary-light bg-surface-subtle hover:bg-surface transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
                <div
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setShowDeleteConfirm(false)}
                ></div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        {isInterlude ? (
          <div className="w-full h-16 flex items-center justify-center bg-surface-subtle/50 text-primary-light text-sm font-medium">
            🎵 ท่อนดนตรี (Interlude / Solo)
          </div>
        ) : (
          <>
            {editor && !editor.isDestroyed && (
              <BubbleMenu
                editor={editor}
                tippyOptions={{ duration: 100 }}
                className="flex flex-col gap-1 p-1.5 bg-surface rounded-xl shadow-xl border border-border min-w-[160px]"
              >
                <div className="flex items-center justify-between px-1 pt-1">
                  <button
                    onClick={() =>
                      editor.chain().focus().toggleUnderline().run()
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      editor.isActive("underline")
                        ? "text-accent bg-blue-50 dark:bg-blue-900/30"
                        : "text-primary-light hover:text-accent hover:bg-surface-subtle"
                    }`}
                    title="ขีดเส้นใต้"
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      editor.chain().focus().unsetHighlight().run()
                    }
                    className="p-1.5 text-primary-light hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1 transition-colors"
                    title="ล้างสีไฮไลท์"
                  >
                    <Eraser className="w-4 h-4" />{" "}
                    <span className="text-[10px] font-bold">ล้าง</span>
                  </button>
                  <button
                    onClick={handleQuote}
                    className="p-1.5 text-primary-light hover:text-accent hover:bg-surface-subtle rounded-lg transition-colors"
                    title="คอมเมนต์"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </BubbleMenu>
            )}
            <EditorContent editor={editor} />
          </>
        )}
      </div>

      {!isInterlude && (
        <div className="px-4 pb-3 border-t border-dashed border-border pt-2">
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              safeComments.length > 0
                ? "text-accent"
                : "text-gray-400 hover:text-primary-light"
            }`}
          >
            <MessageSquare className="w-3 h-3" /> {safeComments.length} Comments
          </button>
          {showComments && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1">
              {quoteText && (
                <div className="flex items-center gap-2 text-sm text-primary-light bg-yellow-50 dark:bg-yellow-900/20 p-2.5 rounded-lg border border-yellow-100 dark:border-yellow-800">
                  <Quote className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />{" "}
                  <span className="italic truncate flex-1">"{quoteText}"</span>
                  <button
                    onClick={() => setQuoteText(null)}
                    className="hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={addComment} className="flex gap-2 relative">
                <input
                  type="text"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-primary focus:border-accent outline-none"
                  placeholder={quoteText ? "แสดงความเห็น..." : "เขียนโน้ต..."}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="text-accent hover:text-accent-hover disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              {safeComments.map((c: Comment) => (
                <div
                  key={c.id}
                  className="bg-surface-subtle p-3 rounded-lg border border-border text-sm group/comment"
                >
                  {c.quoted_text && (
                    <div className="mb-1.5 pl-2 border-l-2 border-yellow-300 dark:border-yellow-600 text-primary-light italic text-xs bg-yellow-50/50 dark:bg-yellow-900/10 p-1 rounded">
                      "{c.quoted_text}"
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <div>
                      <span className="font-bold text-primary mr-1.5">
                        {c.user_name}:
                      </span>
                      <span className="text-primary-light">{c.text}</span>
                    </div>
                    <button
                      onClick={() => deleteComment(c)}
                      className="text-primary-light hover:text-red-500 opacity-0 group-hover/comment:opacity-100 self-start"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
