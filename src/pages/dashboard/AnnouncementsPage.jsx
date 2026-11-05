import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Pencil, Trash2, Pin, EyeOff, ExternalLink, ImagePlus, X } from "lucide-react";
import axios from "axios";
import { HEALTH_CENTERS } from "../../utils/healthCenters";
import { ANNOUNCEMENT_CATEGORIES, categoryStyle, excerpt, formatPostDate } from "../../utils/announcements";
import { localISO } from "../../utils/dates";
import { resizeImageFile } from "../../utils/image";
import { useConfirm } from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";

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
  image: null,
};

export default function AnnouncementsPage() {
  const confirm = useConfirm();
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
  const [imageError, setImageError] = useState("");
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [notice, setNotice] = useState("");

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
    setForm({ ...emptyForm, publish_date: localISO() });
    setEditingId(null);
    setFormError("");
    setImageError("");
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
      image: post.image || null,
    });
    setEditingId(post.id);
    setFormError("");
    setImageError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    setIsReadingImage(true);
    try {
      const dataUrl = await resizeImageFile(file);
      setForm((p) => ({ ...p, image: dataUrl }));
    } catch (err) {
      setImageError(err.message);
    } finally {
      setIsReadingImage(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");
    setNotice("");
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Please enter the title and the message.");
      return;
    }
    const ok = await confirm(
      editingId
        ? { title: "Save changes to this post?", message: form.title.trim(), confirmText: "Yes, save" }
        : {
            title: form.is_published ? "Post this announcement?" : "Save this post as hidden?",
            message: form.is_published
              ? "It will appear on the public page on the date you chose."
              : "It will not appear on the public page until you mark it as Published.",
            confirmText: form.is_published ? "Yes, post" : "Yes, save",
          }
    );
    if (!ok) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/announcements/${editingId}`, form, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/announcements`, form, { headers });
      }
      setShowForm(false);
      setEditingId(null);
      setNotice(editingId ? "Post updated." : "Post saved.");
      await loadPosts();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to save right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(post) {
    setNotice("");
    const ok = await confirm({
      title: "Delete this post?",
      message: `"${post.title}" will be removed from the public page. This cannot be undone.`,
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE_URL}/announcements/${post.id}`, { headers });
      setNotice("Post deleted.");
      await loadPosts();
    } catch (err) {
      setLoadError(err.response?.data?.message || "Unable to delete right now.");
    }
  }

  const inputClass =
    "w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20";

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="min-w-0 flex-1 basis-72">
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            Announcements
          </h2>
          <p className="text-[#5B6470]">
            Posts here appear on the public page before login: announcements, disease advisories, schedules, and health tips.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
        <form onSubmit={handleSave} className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-4 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <p className="sm:col-span-2 text-lg font-bold text-[#0B3D7A]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {editingId ? "Edit Post" : "New Post"}
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Category</label>
            <SearchableSelect
              options={ANNOUNCEMENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              value={form.category}
              onChange={(v) => setForm((p) => ({ ...p, category: v || ANNOUNCEMENT_CATEGORIES[0].value }))}
              ariaLabel="Category"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Show starting on</label>
            <input
              type="date"
              value={form.publish_date}
              onChange={(e) => setForm((p) => ({ ...p, publish_date: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Title</label>
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
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Message</label>
            <textarea
              rows={5}
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="What should the public know? Include the date, time, place, and what to bring."
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20 resize-y"
            />
          </div>

          <div className="sm:col-span-2">
            <span className="block text-xs font-semibold text-[#5B6470] mb-1">Picture (optional)</span>
            {form.image ? (
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <img
                  src={form.image}
                  alt="Selected announcement"
                  className="w-full sm:w-72 max-h-48 object-cover rounded-xl border border-[#E3E8EF]"
                />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full bg-[#E7EEF7] text-[#0B3D7A] px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-[#d7e2f1]">
                    <ImagePlus size={16} />
                    Change picture
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="sr-only" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, image: null }))}
                    className="inline-flex items-center gap-2 rounded-full bg-[#FBEAE5] text-[#8A3B27] px-4 py-2 text-sm font-semibold hover:bg-[#f6d8cf]"
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#CBD5E1] px-4 py-6 text-center cursor-pointer hover:border-[#0B3D7A] hover:bg-[#F4F6F9]">
                <ImagePlus size={24} className="text-[#0B3D7A]" />
                <span className="text-sm font-semibold text-[#0B3D7A]">
                  {isReadingImage ? "Preparing picture…" : "Upload a poster or photo"}
                </span>
                <span className="text-xs text-[#5B6470]">JPG, PNG or WEBP. Big photos are made smaller automatically.</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="sr-only" />
              </label>
            )}
            {imageError && <p className="text-sm text-[#B3261E] mt-1">{imageError}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Health Center</label>
            {isMaster ? (
              <SearchableSelect
                emptyLabel="All health centers"
                options={HEALTH_CENTERS.map((hc) => ({ value: hc.id, label: hc.name }))}
                value={form.health_center_id}
                onChange={(v) => setForm((p) => ({ ...p, health_center_id: v }))}
                ariaLabel="Health Center"
              />
            ) : (
              <input
                type="text"
                disabled
                value={HEALTH_CENTERS.find((hc) => String(hc.id) === String(auth?.user?.health_center_id))?.name ?? "Your health center"}
                className={`${inputClass} bg-[#F4F6F9]`}
              />
            )}
          </div>

          <div className="flex flex-col justify-end gap-2 text-sm text-[#3D4653]">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm((p) => ({ ...p, is_pinned: e.target.checked }))}
                className="h-4 w-4 accent-[#0B3D7A]"
              />
              Pin to the slideshow at the top of the public page
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                className="h-4 w-4 accent-[#0B3D7A]"
              />
              Published (uncheck to hide it for now)
            </label>
          </div>

          {formError && <p className="sm:col-span-2 text-sm text-[#B3261E]">{formError}</p>}

          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving || isReadingImage}
              className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#0A3468] disabled:opacity-60"
            >
              {isSaving ? "Saving…" : editingId ? "Save Changes" : "Post"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-[#F4F6F9] text-[#3D4653] border border-[#E3E8EF] px-6 py-2.5 text-sm font-bold hover:bg-[#E3E8EF]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loadError && <p className="text-sm text-[#8A3B27] mb-3">{loadError}</p>}
      {notice && <p className="text-sm text-[#1B5E20] font-semibold mb-3">{notice}</p>}
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
            <div key={post.id} className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4 overflow-hidden">
              {post.image ? (
                <img
                  src={post.image}
                  alt=""
                  className="w-full sm:w-32 h-40 sm:h-24 object-cover rounded-xl shrink-0 border border-[#E3E8EF]"
                />
              ) : (
                <div className="rounded-full p-3 shrink-0 w-fit" style={{ backgroundColor: style.soft }}>
                  <Icon size={20} style={{ color: style.color }} />
                </div>
              )}
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
                <p className="font-bold text-[#1A1A1A] break-words" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {post.title}
                </p>
                <p className="text-sm text-[#5B6470] break-words">{excerpt(post.body, 200)}</p>
              </div>

              {post.can_edit ? (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => startEdit(post)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#0B3D7A] hover:bg-[#0B3D7A]/10"
                    title="Edit"
                  >
                    <Pencil size={16} />
                    <span className="sm:hidden">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#8A3B27] hover:bg-[#8A3B27]/10"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                    <span className="sm:hidden">Delete</span>
                  </button>
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
