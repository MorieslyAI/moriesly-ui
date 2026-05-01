import React, { useState, useEffect } from "react";
import * as api from "../services/api";
import { auth, signInWithGoogle } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export interface LoginResult {
  accessToken: string;
  isCalibrationComplete: boolean;
  isNewUser?: boolean;
}

interface LoginScreenProps {
  onLogin: (result: LoginResult) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearError = () => setError(null);

  // ─── Email / Password ───────────────────────────────────────────────────────

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Sign in directly via Firebase client to maintain state locally
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      api.setAccessToken(token);

      // Cek status kalibrasi
      const me = await api.getMe();
      const isCalibrationComplete = me.isCalibrationComplete;

      onLogin({
        accessToken: token,
        isCalibrationComplete,
      });
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Google Sign-In ─────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Popup Google Sign-In via Firebase SDK
      const cred = await signInWithGoogle();
      
      // 2. Beri tahu Backend untuk sinkronisasi (bikin user di DB dsb)
      const authRes = await api.googleSignIn(cred.idToken, cred.refreshToken);

      // 3. Paksa refresh token jika user baru, supaya custom claim dari backend (role: user) langsung berlaku di FE
      if (auth.currentUser && authRes.isNewUser) {
        const freshToken = await auth.currentUser.getIdToken(true);
        api.setAccessToken(freshToken);
        authRes.accessToken = freshToken;
      }

      let isCalibrationComplete = false;
      if (!authRes.isNewUser) {
        const me = await api.getMe();
        isCalibrationComplete = me.isCalibrationComplete;
      }

      // 4. Update state aplikasi
      onLogin({
        accessToken: authRes.accessToken,
        isCalibrationComplete,
        isNewUser: authRes.isNewUser,
      });
    } catch (err: any) {
      // Popup ditutup user → abaikan
      if (err?.code === "auth/popup-closed-by-user") {
        setIsLoading(false);
        return;
      }
      setError(err.message ?? "Google Sign-In gagal. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionRedirect = () => {
    window.open("https://moriesly.ai/subscribe", "_blank");
  };

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col relative overflow-hidden font-sans selection:bg-teal-500/30">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 grayscale mix-blend-overlay"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/90 to-zinc-950" />
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-teal-900/30 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-900/20 rounded-full blur-[80px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />
      </div>

      <div
        className={`relative z-10 flex-1 flex flex-col justify-center px-4 md:px-6 py-8 overflow-y-auto transition-all duration-1000 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div className="w-full max-w-sm mx-auto my-auto">
          {/* Brand Header */}
          <div className="mb-8 md:mb-12 text-center md:text-left">
            <div className="inline-flex w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-white/10 to-transparent rounded-2xl items-center justify-center mb-4 md:mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-white/10 backdrop-blur-md animate-in fade-in zoom-in duration-700">
              <img
                src="https://i.ibb.co.com/hJYKch5n/Logo-Moriesly-remove-bg.png"
                alt="Logo"
                className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-2 leading-[0.9]">
              MORIESLY
              <br />
              AI.
            </h1>
            <p className="text-zinc-500 font-medium text-xs md:text-sm tracking-wide flex items-center gap-2 md:justify-start justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Metabolic Intelligence Unit
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5 md:space-y-6 backdrop-blur-sm bg-zinc-900/40 p-5 md:p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Email */}
            <div className="group relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
                className="peer w-full bg-transparent border-b border-zinc-700 py-2.5 md:py-3 text-base md:text-lg font-bold text-white focus:outline-none focus:border-teal-500 transition-all placeholder-transparent"
                placeholder="Email"
              />
              <label
                htmlFor="email"
                className="absolute left-0 -top-3.5 text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all peer-placeholder-shown:text-sm md:peer-placeholder-shown:text-base peer-placeholder-shown:text-zinc-600 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-[10px] md:peer-focus:text-xs peer-focus:text-teal-500 cursor-text"
              >
                Email
              </label>
            </div>

            {/* Password */}
            <div className="group relative">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
                className="peer w-full bg-transparent border-b border-zinc-700 py-2.5 md:py-3 text-base md:text-lg font-bold text-white focus:outline-none focus:border-teal-500 transition-all placeholder-transparent"
                placeholder="Password"
              />
              <label
                htmlFor="password"
                className="absolute left-0 -top-3.5 text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all peer-placeholder-shown:text-sm md:peer-placeholder-shown:text-base peer-placeholder-shown:text-zinc-600 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-[10px] md:peer-focus:text-xs peer-focus:text-teal-500 cursor-text"
              >
                Password
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5 animate-in fade-in slide-in-from-top-2">
                <span className="text-rose-400 text-[11px] font-bold leading-relaxed">
                  {error}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1 md:pt-2">
              <button
                onClick={handleEmailAuth}
                disabled={isLoading}
                className="w-full h-12 md:h-14 bg-white hover:bg-zinc-200 text-black rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="relative z-10">Login</span>
                    <svg
                      className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                    <div className="absolute inset-0 bg-teal-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0 opacity-20" />
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 py-1 md:py-2">
              <div className="h-px bg-zinc-800 flex-1" />
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Or
              </span>
              <div className="h-px bg-zinc-800 flex-1" />
            </div>

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 md:py-3.5 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-black/20 hover:bg-black/40 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-3 backdrop-blur-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Subscribe Link */}
            <div className="mt-2 pt-3 md:pt-4 border-t border-zinc-800/50">
              <button
                onClick={handleSubscriptionRedirect}
                className="w-full group relative py-2.5 md:py-3 rounded-xl overflow-hidden bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 hover:border-teal-900/50 transition-all active:scale-95"
              >
                <div className="absolute inset-0 bg-teal-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
                    No Account?
                  </span>
                  <span className="text-[9px] font-black text-teal-600 uppercase tracking-wider flex items-center gap-1 group-hover:text-teal-400 transition-colors">
                    Subscribe Moriesly AI
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full text-center z-10 pt-6 pb-2">
          <button className="text-[11px] text-zinc-500 hover:text-teal-400 font-bold uppercase tracking-widest transition-colors border-b border-transparent hover:border-teal-500 pb-0.5">
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
