import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

/**
 * A dropdown that you can also type in to search.
 * Used for every dropdown in the system so long lists (100+ patients,
 * doctors, check-ups, actions) are easy to find.
 *
 * Props:
 *  - options: [{ value, label, hint? }]  (hint = small grey text under the label)
 *  - value: the selected value ("" when none)
 *  - onChange(value)
 *  - placeholder: text when nothing is chosen
 *  - emptyLabel: if given, a first choice with value "" (e.g. "All roles", "Unassigned")
 *  - size: "md" (default) or "lg" (taller box)
 *  - rounded: "full" (pill, default) or "lg"
 *  - disabled
 *  - sort: true to sort the choices A-Z
 *  - big: larger text and box (used on the patient pages, easier for seniors)
 */
const MAX_SHOWN = 60;

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select…",
  emptyLabel,
  size = "md",
  rounded = "full",
  disabled = false,
  sort = false,
  className = "",
  ariaLabel,
  big = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const allOptions = useMemo(() => {
    const list = options.map((o) => ({ ...o, value: String(o.value ?? ""), label: String(o.label ?? o.value ?? "") }));
    if (sort) list.sort((a, b) => a.label.localeCompare(b.label));
    return emptyLabel !== undefined ? [{ value: "", label: emptyLabel }, ...list] : list;
  }, [options, emptyLabel, sort]);

  const selected = allOptions.find((o) => o.value === String(value ?? ""));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? allOptions.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q))
      : allOptions;
    return list.slice(0, MAX_SHOWN);
  }, [allOptions, query]);

  // Close when clicking outside
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Keep the highlighted row in view
  useEffect(() => {
    listRef.current?.children?.[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function openList() {
    if (disabled) return;
    const i = allOptions.slice(0, MAX_SHOWN).findIndex((o) => o.value === String(value ?? ""));
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  }

  function choose(o) {
    onChange(o.value);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return openList();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      setQuery("");
    }
  }

  const height = big ? "h-12" : size === "lg" ? "py-3" : "py-2.5";
  const radius = rounded === "lg" || big ? "rounded-lg" : "rounded-full";
  const border = big ? "border-2 border-[#D5DCE3] focus:border-[#0B3D7A] text-base" : "border border-[#0B3D7A]/15 text-sm";
  const showClear = !disabled && emptyLabel === undefined && selected && selected.value !== "";

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A94A6] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        value={open ? query : selected && selected.value !== "" ? selected.label : selected?.label ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={openList}
        onClick={() => !open && openList()}
        onKeyDown={onKey}
        placeholder={open && selected ? selected.label : placeholder}
        className={`w-full ${radius} bg-white ${border} pl-9 ${showClear ? "pr-16" : "pr-10"} ${height} text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#0B3D7A]/30 disabled:bg-[#F4F6F9] disabled:text-[#8A94A6] cursor-pointer`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {showClear && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full p-1 text-[#8A94A6] hover:bg-[#F4F6F9] hover:text-[#1A1A1A]"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : inputRef.current?.focus())}
          className="rounded-full p-1 text-[#5B6470] hover:bg-[#F4F6F9]"
          aria-label="Show choices"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-40 mt-1 w-full min-w-[12rem] max-h-64 overflow-y-auto rounded-xl border border-[#E3E8EF] bg-white shadow-lg py-1"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {matches.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-[#8A94A6]">No match for “{query}”.</li>
          ) : (
            matches.map((o, i) => (
              <li
                key={o.value + i}
                role="option"
                aria-selected={o.value === String(value ?? "")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-4 py-2 cursor-pointer ${i === active ? "bg-[#E7EEF7]" : ""} ${
                  o.value === String(value ?? "") ? "font-semibold" : ""
                }`}
              >
                <span className={`block ${big ? "text-base" : "text-sm"} text-[#1A1A1A]`}>{o.label}</span>
                {o.hint && <span className="block text-xs text-[#5B6470]">{o.hint}</span>}
              </li>
            ))
          )}
          {allOptions.length > MAX_SHOWN && matches.length === MAX_SHOWN && (
            <li className="px-4 py-1.5 text-xs text-[#8A94A6] border-t border-[#E3E8EF]">
              Showing the first {MAX_SHOWN}. Type more letters to narrow it down.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
