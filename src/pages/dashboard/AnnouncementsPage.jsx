import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Pencil, Trash2, Pin, EyeOff, ExternalLink } from "lucide-react";
import axios from "axios";
import { HEALTH_CENTERS } from "../../utils/healthCenters";
import { ANNOUNCEMENT_CATEGORIES, categoryStyle, excerpt, formatPostDate } from "../../utils/announcements";
import { localISO } from "../../utils/dates";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Announcements page (Admin and Master Admin).
 * Posts made here show up on the public landing page (before login).
 *  - Admin: posts for their own health center
 *  - Master Admin: posts for all health centers or for one center
 */

const emptyForm = {
  category: "Announcement",
  title: "",
  body: "",
  health_center_id: "",
  publish_date: localISO(),
  is_pinned: false,
  is_published: true,
};

export default function AnnouncementsPage() {
  const { auth } = useOutletContext();
  const headers = { Authorization: `Bearer ${auth?.token}` };
  const isMaster = auth?.user?.role === "Master Admin";

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadPosts() {
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/announcements`, { headers });
      setPosts(res.data?.data ?? []);
    } catch {
      setLoadError("Unable to load announcements right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  function startNew() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }

  function startEdit(post) {
    setForm({
      category: post.category,
      title: post.title,
      body: post.body,
      health_center_id: post.health_center_id ?? "",
      publish_date: String(post.publish_date).slice(0, 10),
      is_pinned: Number(post.is_pinned) === 1,
      is_published: Number(post.is_published) === 1,
    });
    setEditingId(post.id);
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Please enter the title and the message.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/announcements/${editingId}`, form, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/announcements`, form, { headers });
      }
      setShowForm(false);
      setEditingId(null);
      await loadPosts();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to save right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await axios.delete(`${API_BASE_URL}/announcements/${id}`, { headers });
      setConfirmDeleteId(null);
      await loadPosts();
    } catch (err) {
      setLoadError(err.response?.data?.message || "Unable to delete right now.");
    }
  }

  const inputClass =
    "w-full rounded-full bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:ring-2 focus:ring-white/60";

  return (
    <div style={{ fontFamily: "'Lora', serif" }}>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Announcements
          </h2>
          <p className="text-[#5B6470]">
            Posts here appear on the public page before login: announcements, disease advisories, schedules, and health tips.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/#announcements"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white border border-[#0B3D7A]/30 text-[#0B3D7A] px-5 py-3 text-sm font-semibold hover:bg-[#0B3D7A]/5"
          >
            <ExternalLink size={16} />
            View Public Page
          </a>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468]"
          >
            <Plus size={16} />
            New Post
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="rounded-2xl bg-[#1B5E20] text-white p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <p className="sm:col-span-2 text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            {editingId ? "Edit Post" : "New Post"}
          </p>

          <div>
            <label className="block text-xs text-white/80 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className={inputClass}
            >
              {ANNOUNCEMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Show starting on</label>
            <input
              type="date"
              value={form.publish_date}
              onChange={(e) => setForm((p) => ({ ...p, publish_date: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-white/80 mb-1">Title</label>
            <input
              type="text"
              maxLength={150}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Libreng bakuna para sa mga bata ngayong Sabado"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-white/80 mb-1">Message</label>
            <textarea
              rows={5}
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="What should the public know? Include the date, time, place, and what to bring."
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:ring-2 focus:ring-white/60 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Health Center</label>
            {isMaster ? (
              <select
                value={form.health_center_id}
                onChange={(e) => setForm((p) => ({ ...p, health_center_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">All health centers</option>
                {HEALTH_CENTERS.map((hc) => (
                  <option key={hc.id} value={hc.id}>
                    {hc.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                disabled
                value={HEALTH_CENTERS.find((hc) => String(hc.id) === String(auth?.user?.health_center_id))?.name ?? "Your health center"}
                className={`${inputClass} opacity-80`}
              />
            )}
          </div>

          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm((p) => ({ ...p, is_pinned: e.target.checked }))}
                className="h-4 w-4 accent-white"
              />
              Pin to the slideshow at the top of the public page
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                className="h-4 w-4 accent-white"
              />
              Published (uncheck to hide it for now)
            </label>
          </div>

          {formError && <p className="sm:col-span-2 text-sm text-red-200">{formError}</p>}

          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-white text-[#1B5E20] px-6 py-2.5 text-sm font-bold hover:bg-white/90 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : editingId ? "Save Changes" : "Post"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-white/20 px-6 py-2.5 text-sm font-bold hover:bg-white/30"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loadError && <p className="text-sm text-[#8A3B27] mb-3">{loadError}</p>}
      {isLoading && <p className="text-sm text-[#8A8578]">Loading…</p>}
      {!isLoading && posts.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[#0B3D7A]/25 p-8 text-center text-[#5B6470]">No posts yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {posts.map((post) => {
          const style = categoryStyle(post.category);
          const Icon = style.icon;
          const hidden = Number(post.is_published) !== 1;
          const scheduled = String(post.publish_date).slice(0, 10) > localISO();

          return (
            <div key={post.id} className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="rounded-full p-3 shrink-0 w-fit" style={{ backgroundColor: style.soft }}>
                <Icon size={20} style={{ color: style.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1 text-xs">
                  <span className="rounded-full px-2.5 py-0.5 font-bold" style={{ backgroundColor: style.soft, color: style.color }}>
                    {style.label}
                  </span>
                  {Number(post.is_pinned) === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0B3D7A] text-white px-2.5 py-0.5">
                      <Pin size={11} /> Pinned
                    </span>
                  )}
                  {hidden && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-500 text-white px-2.5 py-0.5">
                      <EyeOff size={11} /> Hidden
                    </span>
                  )}
                  {!hidden && scheduled && (
                    <span className="rounded-full bg-[#8A6D00] text-white px-2.5 py-0.5">Scheduled</span>
                  )}
                  <span className="text-[#8A8578]">
                    {formatPostDate(post.publish_date)} · {post.center_name || "All health centers"}
                    {post.posted_by ? ` · by ${post.posted_by}` : ""}
                  </span>
                </div>
                <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {post.title}
                </p>
                <p className="text-sm text-[#5B6470]">{excerpt(post.body, 200)}</p>
              </div>

              {post.can_edit ? (
                <div className="flex items-center gap-2 shrink-0">
                  {confirmDeleteId === post.id ? (
                    <>
                      <span className="text-xs">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        className="rounded-full bg-[#8A3B27] text-white px-3 py-1 text-xs font-bold"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-full bg-[#0B3D7A]/10 text-[#0B3D7A] px-3 py-1 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(post)}
                        className="rounded-full p-2 text-[#0B3D7A] hover:bg-[#0B3D7A]/10"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(post.id)}
                        className="rounded-full p-2 text-[#8A3B27] hover:bg-[#8A3B27]/10"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs text-[#8A8578] shrink-0">Managed by the Master Admin</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
