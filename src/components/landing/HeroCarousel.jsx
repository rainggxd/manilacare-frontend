import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import backgroundImg from "../../assets/BACKGROUND_CAPSTONE.jpg";
import { categoryStyle, excerpt, formatPostDate } from "../../utils/announcements";

/**
 * Slideshow at the top of the landing page.
 * Slide 1 is always "Kalinga sa Maynila". The next slides are the pinned
 * announcements posted by the Admin. Changes every 7 seconds; can be
 * paused, and moved with the arrows or the dots.
 */
const SLIDE_SECONDS = 7;

export default function HeroCarousel({ title, tagline, pinnedPosts = [], onOpenPost }) {
  const slides = [{ type: "welcome" }, ...pinnedPosts.slice(0, 4).map((post) => ({ type: "post", post }))];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const current = Math.min(index, total - 1);

  useEffect(() => {
    if (paused || total <= 1) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % total), SLIDE_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [paused, total]);

  const go = (step) => setIndex((i) => (i + step + total) % total);
  const slide = slides[current];

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-roledescription="carousel"
      aria-label="Highlights"
      style={{
        backgroundImage: `linear-gradient(100deg, rgba(7,43,87,0.94) 0%, rgba(11,61,122,0.85) 45%, rgba(11,61,122,0.45) 100%), url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20 min-h-[360px] sm:min-h-[400px] flex items-center">
        {slide.type === "welcome" ? (
          <div className="max-w-2xl" key="welcome">
            <p className="uppercase tracking-[0.2em] text-xs sm:text-sm text-white/75 mb-3" style={{ fontFamily: "'Lora', serif" }}>
              Manila Health Department
            </p>
            <h1
              className="text-4xl sm:text-6xl leading-tight mb-4"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              {title}
            </h1>
            <p className="text-base sm:text-xl text-white/90 mb-8" style={{ fontFamily: "'Lora', serif" }}>
              {tagline}
            </p>
            <div className="flex flex-wrap gap-3" style={{ fontFamily: "'Lora', serif" }}>
              <Link
                to="/login"
                className="rounded-full bg-[#1B5E20] px-7 py-3 font-semibold hover:bg-[#164D1A] transition-colors"
              >
                Login to ManilaCare
              </Link>
              <a
                href="#announcements"
                className="rounded-full border border-white/60 px-7 py-3 font-semibold hover:bg-white/10 transition-colors"
              >
                See Announcements
              </a>
            </div>
          </div>
        ) : (
          <PostSlide post={slide.post} onOpen={() => onOpenPost(slide.post)} key={slide.post.id} />
        )}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/25 p-2 hover:bg-black/40"
            aria-label="Previous slide"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/25 p-2 hover:bg-black/40"
            aria-label="Next slide"
          >
            <ChevronRight size={22} />
          </button>

          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
            {slides.map((s, i) => (
              <button
                key={s.type === "welcome" ? "welcome" : s.post.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all ${i === current ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="ml-2 rounded-full bg-black/25 p-1.5 hover:bg-black/40"
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          </div>
          <span className="absolute top-3 left-4 text-xs text-white/70" style={{ fontFamily: "'Lora', serif" }}>
            {current + 1} of {total}
          </span>
        </>
      )}
    </section>
  );
}

function PostSlide({ post, onOpen }) {
  const style = categoryStyle(post.category);
  const Icon = style.icon;

  return (
    <div className="max-w-2xl" style={{ fontFamily: "'Lora', serif" }}>
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold mb-4"
        style={{ color: style.color }}
      >
        <Icon size={14} />
        {style.label}
      </span>
      <h2
        className="text-3xl sm:text-5xl leading-tight mb-3"
        style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
      >
        {post.title}
      </h2>
      <p className="text-sm text-white/75 mb-4">
        {formatPostDate(post.publish_date)} · {post.center_name || "All health centers"}
      </p>
      <p className="text-base sm:text-lg text-white/90 mb-7">{excerpt(post.body, 180)}</p>
      <button
        type="button"
        onClick={onOpen}
        className="rounded-full bg-white text-[#0B3D7A] px-7 py-3 font-semibold hover:bg-white/90 transition-colors"
      >
        Read More
      </button>
    </div>
  );
}
