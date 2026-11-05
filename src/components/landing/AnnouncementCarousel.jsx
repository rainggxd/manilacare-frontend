import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { categoryStyle, excerpt, formatPostDate } from "../../utils/announcements";

/**
 * Announcements on the public page, shown as a sliding row of cards.
 *  - Phone: 1 card at a time (swipe left or right)
 *  - Tablet: 2 cards, computer: 3 cards
 *  - Arrows and dots move to the next or previous card
 *  - Moves by itself every 6 seconds; stops while the mouse is on it
 *    or after the user touches it
 */
const AUTO_SECONDS = 6;

export default function AnnouncementCarousel({ posts, onOpen }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [perView, setPerView] = useState(1);
  const [paused, setPaused] = useState(false);

  const pages = Math.max(1, posts.length - perView + 1);

  // How many cards fit on the screen right now
  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      const first = track?.children?.[0];
      if (!track || !first) return;
      setPerView(Math.max(1, Math.round(track.clientWidth / first.getBoundingClientRect().width)));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [posts.length]);

  const scrollToCard = useCallback((index) => {
    const track = trackRef.current;
    const card = track?.children?.[index];
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }, []);

  // Keep the dots in sync when the user swipes
  function handleScroll() {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const cardWidth = track.children[0].getBoundingClientRect().width;
    const index = Math.round(track.scrollLeft / cardWidth);
    setActive(Math.min(index, pages - 1));
  }

  function go(step) {
    const next = (active + step + pages) % pages;
    setActive(next);
    scrollToCard(next);
  }

  // Auto-slide
  useEffect(() => {
    if (paused || pages <= 1) return undefined;
    const timer = setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % pages;
        scrollToCard(next);
        return next;
      });
    }, AUTO_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [paused, pages, scrollToCard]);

  // Start again from the first card when the list changes (filter tabs)
  useEffect(() => {
    setActive(0);
    if (trackRef.current) trackRef.current.scrollLeft = 0;
  }, [posts]);

  return (
    <div
      className="relative"
      aria-roledescription="carousel"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onFocus={() => setPaused(true)}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post, i) => (
          <div
            key={post.id}
            className="snap-start shrink-0 w-full md:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${posts.length}`}
          >
            <PostCard post={post} onOpen={() => onOpen(post)} />
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-full border border-[#0B3D7A]/25 bg-white p-2.5 text-[#0B3D7A] shadow-sm hover:bg-[#0B3D7A]/5"
            aria-label="Previous announcement"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-[60vw]">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setActive(i);
                  scrollToCard(i);
                }}
                className={`h-2.5 rounded-full transition-all ${
                  i === active ? "w-7 bg-[#0B3D7A]" : "w-2.5 bg-[#0B3D7A]/25 hover:bg-[#0B3D7A]/50"
                }`}
                aria-label={`Go to announcement ${i + 1}`}
                aria-current={i === active}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-full border border-[#0B3D7A]/25 bg-white p-2.5 text-[#0B3D7A] shadow-sm hover:bg-[#0B3D7A]/5"
            aria-label="Next announcement"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onOpen }) {
  const style = categoryStyle(post.category);
  const Icon = style.icon;
  return (
    <article className="h-full flex flex-col rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm overflow-hidden">
      {post.image ? (
        <button type="button" onClick={onOpen} className="block" aria-label={`Open ${post.title}`}>
          <img src={post.image} alt="" className="w-full h-44 sm:h-48 object-cover" loading="lazy" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="w-full h-44 sm:h-48 flex items-center justify-center border-t-[6px]"
          style={{ backgroundColor: style.soft, borderColor: style.color }}
          aria-label={`Open ${post.title}`}
        >
          <Icon size={56} style={{ color: style.color }} strokeWidth={1.5} />
        </button>
      )}
      <div className="p-5 flex flex-col flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: style.soft, color: style.color }}
          >
            <Icon size={13} />
            {style.label}
          </span>
          <span className="text-xs text-[#8A8578]">{formatPostDate(post.publish_date)}</span>
        </div>
        <h3 className="text-lg text-[#1A1A1A] leading-snug mb-2 font-bold break-words line-clamp-2">{post.title}</h3>
        <p className="text-sm text-[#5B6470] leading-relaxed mb-4 flex-1 break-words line-clamp-4">{excerpt(post.body)}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-[#5B6470] min-w-0">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{post.center_name || "All health centers"}</span>
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B3D7A] hover:underline"
          >
            Read more <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
