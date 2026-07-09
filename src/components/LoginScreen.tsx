import React, { useState } from "react";
import { Link, Mail, Lock, Eye, EyeOff, Chrome, Github } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setError("");
    setLoading(true);

    // Simulate login
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(email);
    }, 800);
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50/60 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Decorative blurred gradient blobs to match screenshot precisely */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-indigo-200/30 rounded-full blur-[110px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-200/20 rounded-full blur-[90px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-[440px] bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100/50 p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-[#312ecb] rounded-xl flex items-center justify-center text-white mb-4 shadow-sm">
            <Link className="h-6 w-6 rotate-[-45deg]" />
          </div>
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
            ACN Link
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">
            Welcome back! Please enter your details.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Address */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-sans"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                PASSWORD
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-[#312ecb] hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 px-4 rounded-lg font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-85 cursor-pointer"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <span>Sign In</span>
                <span className="text-sm font-medium">→</span>
              </div>
            )}
          </button>
        </form>

        {/* OR Continue With */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <span className="relative bg-white px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            OR CONTINUE WITH
          </span>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3.5">
          <button
            onClick={() => onLoginSuccess("google.user@gmail.com")}
            className="flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <Chrome className="h-4 w-4 text-[#EA4335]" />
            <span>Google</span>
          </button>
          <button
            onClick={() => onLoginSuccess("github.user@github.com")}
            className="flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <Github className="h-4 w-4 text-[#181717]" />
            <span>GitHub</span>
          </button>
        </div>

        {/* Sign up */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => onLoginSuccess("eso.tech@acnlink.com")}
            className="font-semibold text-[#312ecb] hover:underline transition-colors"
          >
            Sign up for free
          </button>
        </p>
      </div>
    </div>
  );
}
