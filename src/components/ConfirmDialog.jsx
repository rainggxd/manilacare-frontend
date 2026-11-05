import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

/**
 * One confirmation pop-up for the whole system.
 *
 * How to use it in a page:
 *
 *   const confirm = useConfirm();
 *   ...
 *   const ok = await confirm({
 *     title: "Delete this account?",
 *     message: "The account can be restored later from Recover Account.",
 *     confirmText: "Yes, delete",
 *     tone: "danger",          // "danger" = red button, otherwise blue
 *   });
 *   if (!ok) return;
 *
 * The pop-up has big buttons and plain words so it is easy to use for
 * older staff and patients. Esc or clicking outside means "Cancel".
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: options.title || "Are you sure?",
        message: options.message || "",
        confirmText: options.confirmText || "Yes",
        cancelText: options.cancelText || "Cancel",
        tone: options.tone || "primary",
      });
    });
  }, []);

  const close = useCallback((answer) => {
    setDialog(null);
    if (resolverRef.current) {
      resolverRef.current(answer);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmModal dialog={dialog} onAnswer={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  // Fallback so a page still works if it is rendered outside the provider
  return confirm || ((options = {}) => Promise.resolve(window.confirm(options.title || "Are you sure?")));
}

function ConfirmModal({ dialog, onAnswer }) {
  const yesRef = useRef(null);
  const isDanger = dialog.tone === "danger";
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  useEffect(() => {
    yesRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onAnswer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnswer]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={() => onAnswer(false)}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`shrink-0 rounded-full p-3 ${isDanger ? "bg-[#FBEAE5] text-[#8A3B27]" : "bg-[#E7EEF7] text-[#0B3D7A]"}`}
          >
            <Icon size={24} />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-lg font-bold text-[#1A1A1A] leading-snug break-words">
              {dialog.title}
            </h3>
            {dialog.message && (
              <p id="confirm-message" className="mt-1.5 text-[15px] text-[#5B6470] leading-relaxed break-words">
                {dialog.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => onAnswer(false)}
            className="rounded-full bg-[#F4F6F9] text-[#3D4653] border border-[#E3E8EF] px-6 py-3 text-sm font-bold hover:bg-[#E3E8EF]"
          >
            {dialog.cancelText}
          </button>
          <button
            ref={yesRef}
            type="button"
            onClick={() => onAnswer(true)}
            className={`rounded-full px-6 py-3 text-sm font-bold text-white ${
              isDanger ? "bg-[#8A3B27] hover:bg-[#6f2f1f]" : "bg-[#0B3D7A] hover:bg-[#0A3468]"
            }`}
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
