import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, ChevronDown, X, AlertCircle } from "lucide-react";

export function ReviewToast({
  t,
  message = "Review submitted successfully!",
  duration = 8000,
  type = "success",
}) {
  const [remaining, setRemaining] = useState(Math.ceil(duration / 1000));
  const [paused, setPaused] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isSuccess = type === "success";
  const totalSeconds = Math.max(1, duration / 1000);

  useEffect(() => {
    if (paused) return;

    if (remaining <= 0) {
      toast.dismiss(t.id);
      return;
    }

    const id = setTimeout(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(id);
  }, [paused, remaining, t.id]);

  const progress = Math.max(
    0,
    Math.min(100, (remaining / totalSeconds) * 100)
  );

  const accentColor = isSuccess ? "text-emerald-500" : "text-rose-500";
  const borderColor = isSuccess ? "border-emerald-500" : "border-rose-500";
  const progressColor = isSuccess ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div
      onClick={() => setPaused(true)}
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } w-full max-w-[420px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]`}
    >
      <div className="flex items-center gap-3 px-4 pb-2.5 pt-3.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${borderColor} ${accentColor}`}
        >
          {isSuccess ? (
            <Check size={15} strokeWidth={3} />
          ) : (
            <AlertCircle size={15} strokeWidth={2.5} />
          )}
        </div>

        <p className="flex-1 text-[14px] font-semibold text-gray-900">
          {message}
        </p>

        <button
          type="button"
          aria-label="Collapse notification"
          onClick={(event) => {
            event.stopPropagation();
            setCollapsed((current) => !current);
          }}
          className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        <button
          type="button"
          aria-label="Close notification"
          onClick={(event) => {
            event.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="border-t border-gray-100 px-4 py-2.5">
            <p className="text-[13px] text-gray-500">
              {paused ? (
                "Timer stopped. Close this message when done."
              ) : (
                <>
                  This message will close in{" "}
                  <span className="font-semibold text-gray-700">
                    {remaining}
                  </span>{" "}
                  second{remaining === 1 ? "" : "s"}.{" "}
                  <span className="text-gray-600">Click to stop.</span>
                </>
              )}
            </p>
          </div>

          <div className="h-[3px] w-full bg-gray-100">
            <div
              className={`h-full ${progressColor} transition-all duration-1000 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function showReviewToast(
  message = "Review submitted successfully!",
  duration = 8000,
  type = "success"
) {
  return toast.custom(
    (t) => (
      <ReviewToast t={t} message={message} duration={duration} type={type} />
    ),
    {
      duration: Infinity,
      position: "top-center",
    }
  );
}