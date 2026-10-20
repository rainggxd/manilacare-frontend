import { useEffect } from "react";
import { X, MapPin } from "lucide-react";
import { categoryStyle, formatPostDate } from "../../utils/announcements";

/**
 * Pop-up that shows the full text of an announcement or health tip.
 * Closes with the X button, the Esc key, or by clicking outside.
 */
export default function AnnouncementModal({ post, onClose }) {
  useEffect(() => {
    if (!post) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Stop the page behind the pop-up from scrolling
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [post, onClose]);

  if (!post) return null;
  const style = categoryStyle(post.category);
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
    >
      <div
        className="w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Lora', serif" }}
      >
        <div className="h-2 rounded-t-2xl" style={{ backgroundColor: style.color }} />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: style.soft, color: style.color }}
            >
              <Icon size={14} />
              {style.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 hover:bg-[#0B3D7A]/10 -mt-1 -mr-2"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <h3
            id="announcement-title"
            className="text-2xl sm:text-3xl text-[#1A1A1A] leading-snug mb-2"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            {post.title}
          </h3>
          <p className="text-sm text-[#5B6470] mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{formatPostDate(post.publish_date)}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} />
              {post.center_name || "All health centers"}
            </span>
          </p>

          <p className="text-[#1A1A1A]/85 leading-relaxed whitespace-pre-line">{post.body}</p>
        </div>
      </div>
    </div>
  );
}
