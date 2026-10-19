import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { localISO, toLocalISO, formatLongDate, formatTime } from "../utils/dates";

/**
 * Appointment calendar + per-day log.
 *
 * Top: a month calendar. Each day shows how many appointments are booked
 * on that day. Bottom: the log of the selected day (time, patient,
 * doctor, reason, status, and when it was booked).
 *
 * Props:
 *  - appointments: rows from GET /api/appointments
 *  - isLoading: show "Loading…" while data is still coming
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_STYLES = {
  Pending: "bg-yellow-500/90",
  Approved: "bg-[#1B5E20]",
  Rejected: "bg-[#8A3B27]",
  Completed: "bg-[#0B3D7A]",
  Cancelled: "bg-gray-500",
};

export default function AppointmentCalendar({ appointments = [], isLoading = false }) {
  const today = localISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Group the appointments by date: { "2026-10-19": [ ... ], ... }
  const byDate = useMemo(() => {
    const groups = {};
    appointments.forEach((a) => {
      const key = toLocalISO(a.appointment_date);
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return groups;
  }, [appointments]);

  // The boxes of the calendar: blanks before day 1, then each day of the month.
  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const list = [];
    for (let i = 0; i < firstWeekday; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      list.push(localISO(new Date(year, month, day)));
    }
    return list;
  }, [viewMonth]);

  const dayLog = useMemo(() => {
    const list = byDate[selectedDate] ?? [];
    return [...list].sort((a, b) => String(a.appointment_time ?? "").localeCompare(String(b.appointment_time ?? "")));
  }, [byDate, selectedDate]);

  const statusCount = (status) => dayLog.filter((a) => a.status === status).length;

  function changeMonth(step) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + step, 1));
  }

  function goToToday() {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(today);
  }

  const monthTitle = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5" style={{ fontFamily: "'Lora', serif" }}>
      {/* Calendar */}
      <div className="xl:col-span-2 rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-full p-2 hover:bg-[#0B3D7A]/10"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {monthTitle}
            </p>
            <button type="button" onClick={goToToday} className="text-xs text-[#0B3D7A] font-semibold hover:underline">
              Today
            </button>
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-full p-2 hover:bg-[#0B3D7A]/10"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#5B6470] mb-1">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, index) => {
            if (!iso) return <span key={`blank-${index}`} />;

            const count = byDate[iso]?.length ?? 0;
            const isSelected = iso === selectedDate;
            const isToday = iso === today;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-colors
                  ${isSelected ? "bg-[#0B3D7A] text-white" : "hover:bg-[#0B3D7A]/10 text-[#1A1A1A]"}
                  ${isToday && !isSelected ? "ring-2 ring-[#1B5E20]" : ""}`}
              >
                <span className="font-semibold">{Number(iso.slice(8, 10))}</span>
                {count > 0 && (
                  <span
                    className={`mt-0.5 min-w-[18px] rounded-full px-1 text-[10px] font-bold leading-[18px]
                      ${isSelected ? "bg-white text-[#0B3D7A]" : "bg-[#1B5E20] text-white"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-[#8A8578] mt-3">
          The number on a day is how many appointments are booked for that day. Click a day to see its log.
        </p>
      </div>

      {/* Per-day log */}
      <div className="xl:col-span-3 rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={20} className="text-[#0B3D7A]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Appointment Log: {formatLongDate(selectedDate)}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <span className="rounded-full bg-[#0B3D7A]/10 px-3 py-1">Total: {dayLog.length}</span>
          {["Pending", "Approved", "Completed", "Rejected"].map((s) => (
            <span key={s} className="rounded-full bg-[#0B3D7A]/5 px-3 py-1">
              {s}: {statusCount(s)}
            </span>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-[#8A8578]">Loading…</p>
        ) : dayLog.length === 0 ? (
          <p className="text-sm text-[#8A8578] py-6 text-center">No appointments on this day.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#0B3D7A]/10">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#0B3D7A] text-white">
                  <th className="px-3 py-2 font-bold">Time</th>
                  <th className="px-3 py-2 font-bold">Patient</th>
                  <th className="px-3 py-2 font-bold">Doctor</th>
                  <th className="px-3 py-2 font-bold">Reason</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Booked On</th>
                </tr>
              </thead>
              <tbody>
                {dayLog.map((a) => (
                  <tr key={a.id} className="border-t border-[#0B3D7A]/10">
                    <td className="px-3 py-2 whitespace-nowrap">{formatTime(a.appointment_time)}</td>
                    <td className="px-3 py-2 font-semibold">{a.patient_name || "—"}</td>
                    <td className="px-3 py-2">{a.doctor_name ? `Dr. ${a.doctor_name}` : "—"}</td>
                    <td className="px-3 py-2">{a.reason || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${
                          STATUS_STYLES[a.status] || "bg-gray-500"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[#5B6470] whitespace-nowrap">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
