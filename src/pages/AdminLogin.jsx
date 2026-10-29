import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { showReviewToast } from "../Componat/SavedToast";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://apple-gadgets-ui-backend.vercel.app"
).replace(/\/+$/, "");

const ADMIN_ROLES = ["admin", "subadmin"];

export default function AdminLogin() {
  const navigate = useNavigate();
  const revealTimer = useRef(null);
  const otpRef = useRef(null);

  const [lampOn, setLampOn] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [tugging, setTugging] = useState(false);

  useEffect(() => {
    document.body.style.background = "#11120d";

    return () => {
      document.body.style.background = "";
      window.clearTimeout(revealTimer.current);
    };
  }, []);

  useEffect(() => {
    if (step !== "otp") return;

    const timer = window.setTimeout(() => {
      otpRef.current?.focus();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [step]);

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function notify(text, type = "success") {
    setMessage(text);
    setMessageType(type);

    if (type === "success") {
      try {
        showReviewToast(text);
      } catch (toastError) {
        console.error("ReviewToast error:", toastError);
      }
    }
  }

  function pullLamp() {
    if (loading || resending) return;

    setTugging(true);
    window.setTimeout(() => setTugging(false), 450);

    if (!lampOn) {
      setLampOn(true);

      window.clearTimeout(revealTimer.current);
      revealTimer.current = window.setTimeout(() => {
        setShowForm(true);
      }, 550);
    } else {
      // Lamp already on: reveal or hide the login panel.
      setShowForm((previous) => !previous);
    }
  }

  async function apiRequest(endpoint, body) {
    let response;

    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(
        "Server-er sathe connect kora jacche na. Internet check kore abar chesta korun."
      );
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || result.error || "Something went wrong."
      );
    }

    return result;
  }

  function extractData(result) {
    return result?.data?.user || result?.data?.admin
      ? {
          ...(result.data || {}),
          user: result.data.user || result.data.admin,
        }
      : {
          ...(result?.data || {}),
          token: result?.token || result?.data?.token,
          user: result?.user || result?.data?.user,
        };
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest("/api/admin-auth/Admin-login", {
        email: cleanEmail,
        password,
      });

      const data = extractData(result);

      if (data?.requiresLoginOtp) {
        setStep("otp");
        setOtp("");
        notify(
          result.message || "OTP sent to your email. Please verify.",
          "success"
        );
        return;
      }

      if (data?.token && data?.user) {
        saveSession(data);
        return;
      }

      throw new Error(
        result.message ||
          "Server response-e OTP status ba login token paoa jayni."
      );
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    clearMessages();

    const cleanOtp = otp.replace(/\D/g, "");

    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest(
        "/api/admin-auth/Admin-verify-otp",
        {
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
        }
      );

      const data = extractData(result);

      if (!data?.token || !data?.user) {
        throw new Error(
          result.message ||
            "OTP verification response-e token ba user information nei."
        );
      }

      saveSession(data);
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  function saveSession(data) {
    const user = data?.user;
    const token = data?.token;
    const role = String(user?.role || "").toLowerCase();

    if (!token || !user) {
      setError("Login token or user information is missing.");
      return;
    }

    if (!ADMIN_ROLES.includes(role)) {
      setError("You are not authorized to access the admin panel.");
      return;
    }

    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Remove an old token if the application used this key previously.
      localStorage.removeItem("adminToken");
    } catch (storageError) {
      console.error("Unable to save admin session:", storageError);
      setError("Session save kora jayni. Browser storage check korun.");
      return;
    }

    notify("Login successful! Welcome to Apple Gadgets.", "success");
    navigate("/", { replace: true });
  }

  async function handleResendOtp() {
    clearMessages();

    if (!email.trim() || !password) {
      setError("OTP resend korte email o password proyojon.");
      return;
    }

    setResending(true);

    try {
      const result = await apiRequest("/api/admin-auth/Admin-login", {
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.data?.requiresLoginOtp) {
        setOtp("");
        notify(
          result.message || "A new OTP has been requested.",
          "success"
        );
      } else {
        throw new Error(
          result.message || "Server did not confirm a new OTP."
        );
      }
    } catch (err) {
      setError(err.message || "Could not resend OTP.");
    } finally {
      setResending(false);
    }
  }

  function backToLogin() {
    clearMessages();
    setStep("login");
    setOtp("");
  }

  return (
    <main className={`admin-auth-page ${lampOn ? "lamp-on" : ""}`}>
      <div className="auth-grain" />
      <div className="auth-ambient ambient-left" />
      <div className="auth-ambient ambient-right" />

      <header className="auth-brand">
        <div className="brand-mark">
          <span />
          <span />
          <span />
        </div>

        <span className="brand-name">APPLE GADGETS</span>
        <span className="brand-caption">ADMINISTRATION PORTAL</span>
      </header>

      <section className="auth-scene">
        <div className={`light-beam ${lampOn ? "beam-active" : ""}`} />

        {/* Decorative lamp */}
        <div className={`lamp-scene ${lampOn ? "illuminated" : ""}`}>
          <div className="lamp-wire" />

          <div className="lamp-shade">
            <div className="shade-top" />
            <div className="shade-body" />
            <div className="shade-bottom" />
          </div>

          <div className="lamp-bulb">
            <div className="bulb-core" />
          </div>

          <div className="lamp-stem" />
          <div className="lamp-base" />
          <div className="lamp-floor-glow" />

          <div className="cord-area">
            <div className={`cord-line ${tugging ? "cord-tug" : ""}`} />

            <button
              type="button"
              className={`pull-handle ${tugging ? "handle-tug" : ""}`}
              onClick={pullLamp}
              disabled={loading || resending}
              aria-label="Pull lamp cord to reveal or hide admin login"
              title="Pull to turn on the lamp"
            >
              <span className="handle-string" />
              <span className="handle-ball" />
            </button>
          </div>

          <div className="lamp-label">
            <span className={`label-dot ${lampOn ? "active-dot" : ""}`} />
            {lampOn ? "ADMIN ACCESS" : "PULL TO TURN ON"}
          </div>
        </div>

        {/* Intro text */}
        <div className={`intro-copy ${showForm ? "intro-hidden" : ""}`}>
          <p className="eyebrow">
            <span />
            SECURE ADMIN ACCESS
          </p>

          <h1>
            A little light.
            <br />
            <span>A powerful experience.</span>
          </h1>

          <p className="intro-description">
            Manage your Apple Gadgets store from one secure place. Pull the
            cord to access the administration portal.
          </p>

          <div className="intro-bottom">
            <span className="intro-line" />
            <span>AUTHORIZED PERSONNEL ONLY</span>
          </div>
        </div>

        {/* Login / OTP card */}
        <div
          className={`admin-auth-panel ${
            showForm && lampOn ? "panel-visible" : ""
          }`}
        >
          <section className="admin-auth-card">
            <div className="panel-topline">
              <span className="panel-indicator">
                <span />
                {step === "login" ? "ADMIN SIGN IN" : "VERIFICATION"}
              </span>

              <span className="secure-label">
                <ShieldCheck size={13} />
                SECURE ACCESS
              </span>
            </div>

            <div className="form-heading">
              <div className="form-icon">
                <ShieldCheck size={23} />
              </div>

              <div>
                <h2>
                  {step === "login" ? "Welcome back." : "Check your inbox."}
                </h2>

                <p>
                  {step === "login"
                    ? "Sign in to manage your store."
                    : "Enter the verification code sent to your email."}
                </p>
              </div>
            </div>

            {error && (
              <div className="auth-message message-error" role="alert">
                <span className="message-dot" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div
                className={`auth-message ${
                  messageType === "success"
                    ? "message-success"
                    : "message-error"
                }`}
                role={messageType === "success" ? "status" : "alert"}
              >
                {messageType === "success" ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <span className="message-dot" />
                )}
                <span>{message}</span>
              </div>
            )}

            {step === "login" ? (
              <form className="admin-auth-form" onSubmit={handleLogin}>
                <label htmlFor="admin-email">EMAIL ADDRESS</label>

                <div className="input-wrap">
                  <Mail size={18} />

                  <input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <label htmlFor="admin-password">PASSWORD</label>

                <div className="input-wrap">
                  <Lock size={18} />

                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="spinner" size={19} />
                      PLEASE WAIT...
                    </>
                  ) : (
                    <>
                      CONTINUE TO VERIFICATION
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form className="admin-auth-form" onSubmit={handleVerifyOtp}>
                <p className="otp-info">
                  Verification code sent to
                  <br />
                  <strong>{email}</strong>
                </p>

                <label htmlFor="admin-otp">6-DIGIT VERIFICATION CODE</label>

                <div className="input-wrap otp-wrap">
                  <ShieldCheck size={18} />

                  <input
                    ref={otpRef}
                    id="admin-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="spinner" size={19} />
                      VERIFYING...
                    </>
                  ) : (
                    <>
                      VERIFY OTP & LOGIN
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="text-button resend-button"
                  onClick={handleResendOtp}
                  disabled={resending || loading}
                >
                  {resending ? (
                    <LoaderCircle className="spinner" size={15} />
                  ) : (
                    <RotateCcw size={15} />
                  )}
                  {resending ? "REQUESTING NEW OTP..." : "RESEND OTP"}
                </button>

                <button
                  type="button"
                  className="back-button"
                  onClick={backToLogin}
                  disabled={loading || resending}
                >
                  <ArrowLeft size={15} />
                  Back to login
                </button>
              </form>
            )}

            <div className="panel-footer">
              <ShieldCheck size={13} />
              <span>APPLE GADGETS</span>
              <span className="footer-separator">•</span>
              <span>SECURE ADMIN PORTAL</span>
            </div>
          </section>
        </div>
      </section>

      <footer className="auth-page-footer">
        <span>© {new Date().getFullYear()} APPLE GADGETS</span>

        <span className="footer-center">
          <span className={lampOn ? "footer-light-on" : ""} />
          {lampOn ? "SECURE ACCESS READY" : "WAITING FOR A SPARK"}
        </span>

        <span>AUTHORIZED ADMINISTRATORS ONLY</span>
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-auth-page {
          --gold: #d7b86b;
          --gold-bright: #f3d68c;
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-height: 100svh;
          overflow: hidden;
          color: #f5f0df;
          background:
            radial-gradient(ellipse at 18% 48%, rgba(190,156,68,.08), transparent 40%),
            radial-gradient(ellipse at 80% 20%, rgba(209,177,100,.045), transparent 32%),
            #11120d;
          isolation: isolate;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .admin-auth-page button,
        .admin-auth-page input {
          font: inherit;
        }

        .auth-grain {
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: .12;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E");
        }

        .auth-ambient {
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: -1;
          opacity: .08;
          transition: opacity 1s ease;
        }

        .ambient-left {
          top: 20%;
          left: -180px;
          background: #cba34c;
        }

        .ambient-right {
          right: -220px;
          bottom: -100px;
          background: #b8a15f;
        }

        .lamp-on .auth-ambient {
          opacity: .18;
        }

        .auth-brand {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 25px 6.5%;
        }

        .brand-mark {
          width: 29px;
          height: 29px;
          border: 1px solid rgba(215,184,107,.8);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .brand-mark span {
          width: 2px;
          border-radius: 2px;
          background: var(--gold);
        }

        .brand-mark span:nth-child(1) { height: 7px; }
        .brand-mark span:nth-child(2) { height: 13px; }
        .brand-mark span:nth-child(3) { height: 9px; }

        .brand-name {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 3px;
          white-space: nowrap;
        }

        .brand-caption {
          padding-left: 13px;
          margin-left: 4px;
          border-left: 1px solid #414233;
          color: #81816f;
          font-size: 9px;
          letter-spacing: 1.6px;
        }

        .auth-scene {
          width: min(1200px, 100%);
          flex: 1;
          min-height: 650px;
          margin: 0 auto;
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          padding: 15px 6.5% 45px;
        }

        .light-beam {
          position: absolute;
          top: 70px;
          left: 3%;
          width: 48%;
          height: 70%;
          background: radial-gradient(ellipse at 50% 40%, rgba(246,213,137,.14), rgba(226,187,99,.045) 35%, transparent 70%);
          opacity: 0;
          transform: scale(.75);
          transition: opacity 1s ease, transform 1.1s ease;
          pointer-events: none;
        }

        .light-beam.beam-active {
          opacity: 1;
          transform: scale(1.2);
        }

        .lamp-scene {
          position: relative;
          width: 100%;
          height: 510px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateX(-10px);
          z-index: 2;
        }

        .lamp-wire {
          position: absolute;
          width: 2px;
          height: 86px;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(#6a6a57, #a09b7e);
        }

        .lamp-shade {
          position: absolute;
          top: 85px;
          left: 50%;
          transform: translateX(-50%);
          width: 215px;
          height: 117px;
          filter: drop-shadow(0 15px 16px rgba(0,0,0,.25));
          z-index: 3;
        }

        .shade-top {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 25px;
          height: 12px;
          border-radius: 5px 5px 1px 1px;
          background: linear-gradient(90deg, #716b50, #b9a77b, #70694d);
        }

        .shade-body {
          position: absolute;
          inset: 8px 0 0;
          background: linear-gradient(100deg, #716849 0%, #c6b587 20%, #ead8a6 48%, #b5a16e 77%, #6c6348 100%);
          clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%);
        }

        .shade-bottom {
          position: absolute;
          bottom: -3px;
          left: -5px;
          width: calc(100% + 10px);
          height: 9px;
          border-radius: 50%;
          background: linear-gradient(90deg, #766c4e, #e0cc96, #716849);
        }

        .lamp-bulb {
          position: absolute;
          top: 196px;
          left: 50%;
          transform: translateX(-50%);
          width: 35px;
          height: 43px;
          border-radius: 45% 45% 42% 42%;
          background: #b5aa7b;
          z-index: 2;
          transition: background .6s ease, box-shadow .7s ease;
        }

        .bulb-core {
          position: absolute;
          top: 9px;
          left: 8px;
          width: 19px;
          height: 22px;
          border-radius: 50%;
          background: #e9d9a7;
          opacity: .3;
          transition: opacity .5s ease, box-shadow .5s ease;
        }

        .illuminated .lamp-bulb {
          background: #fff4c5;
          box-shadow: 0 0 25px 8px rgba(255,222,132,.75), 0 0 90px 40px rgba(255,206,94,.22);
        }

        .illuminated .bulb-core {
          opacity: 1;
          box-shadow: 0 0 20px 8px rgba(255,226,139,.8);
        }

        .lamp-stem {
          position: absolute;
          top: 235px;
          left: 50%;
          transform: translateX(-50%);
          height: 178px;
          width: 13px;
          border-radius: 5px;
          background: linear-gradient(90deg, #59533e, #b8a779 34%, #d2c092 50%, #817653 100%);
          z-index: 1;
        }

        .lamp-base {
          position: absolute;
          top: 390px;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(180deg, #c2b182, #7f7554 35%, #403c2c);
          box-shadow: 0 13px 20px rgba(0,0,0,.4);
          z-index: 2;
        }

        .lamp-floor-glow {
          position: absolute;
          top: 403px;
          left: 50%;
          transform: translateX(-50%);
          width: 230px;
          height: 85px;
          background: radial-gradient(ellipse, rgba(255,211,111,.22), transparent 68%);
          opacity: .1;
          transition: opacity .8s ease;
        }

        .illuminated .lamp-floor-glow { opacity: 1; }

        .cord-area {
          position: absolute;
          top: 172px;
          left: calc(50% + 104px);
          width: 50px;
          height: 150px;
          z-index: 10;
        }

        .cord-line {
          position: absolute;
          left: 13px;
          top: 0;
          width: 1px;
          height: 79px;
          background: #a9a18a;
          transform-origin: top center;
        }

        .cord-line.cord-tug {
          animation: cordStretch .45s ease-out;
        }

        .pull-handle {
          position: absolute;
          left: 0;
          top: 62px;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 0;
          padding: 0;
          background: transparent;
          cursor: pointer;
          touch-action: manipulation;
        }

        .pull-handle:disabled {
          cursor: wait;
          opacity: .6;
        }

        .pull-handle:focus-visible {
          outline: 1px dashed var(--gold);
          outline-offset: 6px;
        }

        .pull-handle:active { transform: translateY(9px); }

        .pull-handle.handle-tug {
          animation: handleTug .45s cubic-bezier(.3,1.6,.5,1);
        }

        @keyframes handleTug {
          0%, 100% { transform: translateY(0); }
          35% { transform: translateY(16px); }
          70% { transform: translateY(-3px); }
        }

        @keyframes cordStretch {
          0%, 100% { transform: scaleY(1); }
          35% { transform: scaleY(1.2); }
          70% { transform: scaleY(.96); }
        }

        .handle-string {
          width: 1px;
          height: 36px;
          background: #d1c4a0;
        }

        .handle-ball {
          width: 14px;
          height: 23px;
          border-radius: 45% 45% 50% 50%;
          background: linear-gradient(90deg, #796a46, #e3ce94 45%, #a48e5b);
          box-shadow: inset -2px -2px 3px rgba(0,0,0,.25), 0 0 0 5px rgba(215,184,107,.05);
          transition: box-shadow .3s ease, transform .3s ease;
        }

        .pull-handle:hover .handle-ball {
          box-shadow: 0 0 0 7px rgba(215,184,107,.09), 0 0 22px rgba(215,184,107,.35);
          transform: scale(1.08);
        }

        .lamp-label {
          position: absolute;
          top: 332px;
          left: calc(50% + 125px);
          display: flex;
          align-items: center;
          gap: 7px;
          width: 145px;
          color: #8b8974;
          font-size: 8px;
          letter-spacing: 1.2px;
          white-space: nowrap;
        }

        .label-dot,
        .panel-indicator > span,
        .footer-center > span {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #777663;
        }

        .active-dot,
        .footer-light-on {
          background: #e7c66e !important;
          box-shadow: 0 0 10px rgba(231,198,110,.8);
        }

        .intro-copy {
          position: relative;
          z-index: 2;
          max-width: 450px;
          padding-left: 35px;
          opacity: 1;
          transform: translateX(0);
          transition: opacity .55s ease, transform .65s ease;
        }

        .intro-copy.intro-hidden {
          opacity: 0;
          transform: translateX(-35px);
          pointer-events: none;
          position: absolute;
          right: 0;
          visibility: hidden;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--gold);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2.4px;
          margin: 0 0 26px;
        }

        .eyebrow span {
          width: 25px;
          height: 1px;
          background: var(--gold);
        }

        .intro-copy h1 {
          margin: 0;
          font-size: clamp(35px, 4vw, 56px);
          line-height: 1.16;
          font-weight: 500;
          letter-spacing: -2.7px;
        }

        .intro-copy h1 span {
          color: var(--gold);
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic;
          font-weight: 400;
        }

        .intro-description {
          max-width: 330px;
          margin: 23px 0 0;
          color: #9b9b8a;
          font-size: 13px;
          line-height: 1.9;
        }

        .intro-bottom {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 42px;
          color: #767665;
          font-size: 8px;
          letter-spacing: 1.8px;
        }

        .intro-line {
          display: inline-block;
          width: 34px;
          height: 1px;
          background: #5e5c45;
        }

        .admin-auth-panel {
          position: absolute;
          z-index: 6;
          right: 6.5%;
          top: 50%;
          width: min(430px, 43%);
          perspective: 1200px;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translate(35px, -46%);
          transition: opacity .65s ease, transform .7s ease, visibility .65s;
        }

        .admin-auth-panel.panel-visible {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translate(0, -50%);
        }

        .admin-auth-card {
          position: relative;
          padding: 32px 34px 24px;
          border: 1px solid rgba(215,184,107,.2);
          border-radius: 9px;
          background: linear-gradient(145deg, rgba(37,38,27,.97), rgba(19,21,15,.98));
          box-shadow: 0 25px 90px rgba(0,0,0,.4), 0 0 70px rgba(224,190,102,.065), inset 0 1px rgba(255,255,255,.025);
        }

        .panel-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,.065);
        }

        .panel-indicator,
        .secure-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 8px;
          letter-spacing: 1.4px;
          color: #a8a58e;
        }

        .panel-indicator > span { background: var(--gold); }

        .secure-label {
          gap: 5px;
          color: #777b68;
          letter-spacing: .7px;
        }

        .secure-label svg { color: var(--gold); }

        .form-heading {
          display: flex;
          gap: 15px;
          align-items: center;
          margin: 25px 0 24px;
        }

        .form-icon {
          display: flex;
          flex: 0 0 47px;
          width: 47px;
          height: 47px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(215,184,107,.25);
          border-radius: 7px;
          background: rgba(215,184,107,.07);
          color: var(--gold);
        }

        .form-heading h2 {
          margin: 0 0 6px;
          color: #f1ecd9;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 27px;
          font-weight: 400;
          letter-spacing: -.7px;
        }

        .form-heading p {
          margin: 0;
          color: #939383;
          font-size: 11px;
          line-height: 1.7;
        }

        .admin-auth-form {
          display: flex;
          flex-direction: column;
        }

        .admin-auth-form > label {
          margin: 0 0 8px;
          color: #aaa891;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.3px;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 48px;
          padding: 0 13px;
          margin-bottom: 19px;
          border: 1px solid #393a2d;
          border-radius: 5px;
          background: rgba(11,12,9,.48);
          color: #8e8c74;
          transition: border-color .25s ease, box-shadow .25s ease;
        }

        .input-wrap:focus-within {
          border-color: rgba(215,184,107,.75);
          background: rgba(18,18,12,.9);
          box-shadow: 0 0 0 3px rgba(215,184,107,.055);
        }

        .input-wrap > svg { flex-shrink: 0; }

        .input-wrap input {
          width: 100%;
          min-width: 0;
          height: 46px;
          padding: 0;
          border: 0;
          outline: 0;
          color: #eee9d8;
          background: transparent;
          font-size: 12px;
        }

        .input-wrap input::placeholder { color: #626356; }

        .input-wrap input:-webkit-autofill {
          -webkit-text-fill-color: #eee9d8;
          box-shadow: 0 0 0 40px #14150f inset;
          caret-color: #eee9d8;
        }

        .password-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 5px;
          border: 0;
          background: transparent;
          color: #8c8b78;
          cursor: pointer;
        }

        .password-toggle:hover { color: var(--gold); }

        .otp-info {
          margin: -6px 0 20px;
          color: #939383;
          text-align: center;
          font-size: 12px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .otp-info strong {
          color: var(--gold-bright);
          font-weight: 600;
        }

        .otp-wrap input {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 20px;
          letter-spacing: 10px;
          text-align: center;
          padding-left: 10px;
        }

        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 49px;
          margin-top: 3px;
          padding: 10px 14px;
          border: 1px solid #e3c77d;
          border-radius: 5px;
          background: linear-gradient(110deg, #c7a85d, #e8cf8e);
          color: #242114;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          cursor: pointer;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.06);
          box-shadow: 0 8px 23px rgba(209,175,96,.16);
        }

        .submit-button:disabled {
          opacity: .65;
          cursor: wait;
        }

        .spinner {
          flex-shrink: 0;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .text-button,
        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .text-button {
          margin: 18px auto 0;
          color: var(--gold-bright);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .8px;
        }

        .text-button:hover:not(:disabled) {
          color: #fff0bd;
          text-decoration: underline;
        }

        .text-button:disabled,
        .back-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .back-button {
          margin: 18px auto 0;
          color: #9b9b87;
          font-size: 11px;
        }

        .back-button:hover:not(:disabled) { color: var(--gold); }

        .auth-message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: -7px 0 18px;
          padding: 11px 12px;
          border: 1px solid rgba(226,113,90,.25);
          border-radius: 5px;
          background: rgba(165,65,48,.08);
          color: #efb1a4;
          font-size: 11px;
          line-height: 1.65;
          overflow-wrap: anywhere;
          animation: messageIn .35s ease;
        }

        .auth-message > svg { flex-shrink: 0; margin-top: 1px; }

        .message-success {
          border-color: rgba(143,184,118,.25);
          background: rgba(94,140,74,.09);
          color: #bdd7a7;
        }

        .message-dot {
          flex: 0 0 7px;
          width: 7px;
          height: 7px;
          margin-top: 4px;
          border-radius: 50%;
          background: #e17f69;
        }

        @keyframes messageIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .panel-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 25px;
          padding-top: 17px;
          border-top: 1px solid rgba(255,255,255,.055);
          color: #6e6e5d;
          font-size: 8px;
          letter-spacing: 1.2px;
        }

        .panel-footer svg { color: var(--gold); }

        .footer-separator { color: var(--gold); }

        .auth-page-footer {
          position: relative;
          z-index: 3;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 19px 6.5%;
          border-top: 1px solid rgba(255,255,255,.055);
          color: #747465;
          font-size: 8px;
          letter-spacing: 1.1px;
        }

        .footer-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-center > span {
          width: 5px;
          height: 5px;
        }

        .admin-auth-page button:focus-visible {
          outline: 1px solid var(--gold-bright);
          outline-offset: 3px;
        }

        @media (min-width: 1400px) {
          .lamp-scene { transform: translateX(-20px) scale(1.05); }
        }

        @media (max-width: 950px) {
          .auth-scene {
            min-height: 680px;
            grid-template-columns: .8fr 1.2fr;
            padding-right: 4%;
            padding-left: 4%;
          }

          .lamp-scene { transform: translateX(-15px) scale(.83); }
          .intro-copy { padding-left: 10px; }
          .intro-copy h1 { font-size: 39px; }

          .admin-auth-panel {
            right: 4%;
            width: 49%;
          }

          .admin-auth-card { padding: 26px 24px 22px; }
          .lamp-label { left: calc(50% + 112px); }
        }

        @media (max-width: 650px) {
          .auth-brand {
            padding: 20px 22px;
            flex-wrap: wrap;
          }

          .brand-name {
            font-size: 11px;
            letter-spacing: 2px;
          }

          .brand-caption {
            font-size: 7px;
            letter-spacing: 1px;
          }

          .auth-scene {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            min-height: 0;
            padding: 0 19px 35px;
          }

          .lamp-scene {
            flex: 0 0 auto;
            height: 325px;
            width: 100%;
            transform: scale(.64);
            transform-origin: center top;
            margin-bottom: -100px;
          }

          .lamp-wire { top: 0; height: 63px; }
          .lamp-shade { top: 62px; }
          .lamp-bulb { top: 173px; }
          .lamp-stem { top: 212px; }
          .lamp-base { top: 365px; }
          .lamp-floor-glow { top: 380px; }
          .cord-area { top: 145px; }
          .lamp-label { top: 305px; }

          .intro-copy {
            position: relative;
            width: 100%;
            max-width: 430px;
            padding: 5px 4px 35px;
            text-align: center;
          }

          .intro-copy.intro-hidden { display: none; }

          .eyebrow {
            justify-content: center;
            margin-bottom: 15px;
            font-size: 8px;
          }

          .intro-copy h1 {
            font-size: clamp(34px, 9vw, 45px);
            letter-spacing: -1.9px;
          }

          .intro-description {
            max-width: 300px;
            margin: 15px auto 0;
            font-size: 12px;
          }

          .intro-bottom {
            justify-content: center;
            margin-top: 23px;
            font-size: 7px;
          }

          .light-beam {
            top: 0;
            left: 0;
            width: 100%;
            height: 350px;
          }

          .admin-auth-panel {
            position: relative;
            top: auto;
            right: auto;
            width: 100%;
            max-width: 430px;
            margin: 0 auto;
            transform: translateY(20px);
          }

          .admin-auth-panel.panel-visible { transform: translateY(0); }

          .admin-auth-card { padding: 24px 22px 20px; }

          .form-heading h2 { font-size: 25px; }
          .auth-page-footer { padding: 17px 19px; font-size: 7px; letter-spacing: .6px; }
          .auth-page-footer > span:last-child { display: none; }
        }

        @media (max-width: 380px) {
          .auth-brand { padding-right: 15px; padding-left: 15px; }
          .brand-caption { padding-left: 8px; }
          .auth-scene { padding-right: 13px; padding-left: 13px; }
          .admin-auth-card { padding-right: 17px; padding-left: 17px; }

          .panel-indicator,
          .secure-label {
            font-size: 7px;
            letter-spacing: .7px;
          }

          .form-heading { gap: 10px; }
          .form-heading h2 { font-size: 23px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-auth-page *,
          .admin-auth-page *::before,
          .admin-auth-page *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </main>
  );
}