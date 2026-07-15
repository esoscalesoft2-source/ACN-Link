import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Building2,
  Phone,
  Globe2,
  User
} from "lucide-react";
import {
  AuthApiError,
  AuthConfig,
  AuthUser,
  createPreviewAuthUser,
  enterPreviewSession,
  fetchAuthConfig,
  forgotPasswordRequest,
  isAuthPreviewDisabled,
  isAuthPreviewForced,
  loginRequest,
  passwordStrengthRequest,
  probeAuthBackend,
  registerRequest,
  resendVerificationRequest,
  resetPasswordRequest,
  saveAuthSession,
  verifyEmailRequest,
  verifyResetOtpRequest
} from "../lib/authApi";

type AuthView =
  | "login"
  | "register"
  | "forgot"
  | "otp"
  | "reset"
  | "reset-success"
  | "verify"
  | "verify-success"
  | "register-success";

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  initialView?: AuthView;
  initialVerifyToken?: string;
}

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "India",
  "Canada",
  "Australia",
  "Germany",
  "United Arab Emirates",
  "Singapore",
  "Other"
];

const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com"
]);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isDisposable(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return DISPOSABLE.has(domain);
}

function validatePasswordClient(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include letters and numbers.";
  }
  return null;
}

function loginErrorMessage(err: AuthApiError): string {
  switch (err.code) {
    case "ACCOUNT_LOCKED":
      return err.message || "Account temporarily locked after too many failed attempts.";
    case "ACCOUNT_BLOCKED":
      return "This account is blocked. Contact support for help.";
    case "ACCOUNT_INACTIVE":
      return "This account is inactive. Contact support to reactivate.";
    case "ACCOUNT_DELETED":
      return "This account has been deleted.";
    case "RATE_LIMITED":
      return "Too many attempts. Please wait a moment and try again.";
    case "EMAIL_UNVERIFIED":
      return "Please verify your email before signing in.";
    case "NETWORK_ERROR":
      return "Network error. Check your connection and try again.";
    case "SERVER_ERROR":
      return "Server error. Please try again shortly.";
    default:
      return err.message || "Unable to sign in.";
  }
}

export default function LoginScreen({
  onLoginSuccess,
  initialView = "login",
  initialVerifyToken = ""
}: LoginScreenProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyToken, setVerifyToken] = useState(initialVerifyToken);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "fair" | "good" | "strong" | "">("");
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(isAuthPreviewForced() && !isAuthPreviewDisabled());
  const autoVerifyDone = useRef(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United States");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthSurface() {
      if (isAuthPreviewDisabled()) {
        setPreviewMode(false);
        try {
          const cfg = await fetchAuthConfig();
          if (!cancelled) setConfig(cfg);
        } catch {
          if (!cancelled) setConfig(null);
        }
        return;
      }

      if (isAuthPreviewForced()) {
        setPreviewMode(true);
        setInfo("Preview mode — client demo only. Backend auth will be reused later.");
      }

      const backendOk = await probeAuthBackend();
      if (cancelled) return;

      if (backendOk) {
        setPreviewMode(isAuthPreviewForced());
        try {
          const cfg = await fetchAuthConfig();
          if (!cancelled) setConfig(cfg);
        } catch {
          if (!cancelled) setConfig(null);
        }
      } else {
        setPreviewMode(true);
        setConfig(null);
        setInfo("Preview mode — no auth API on this host. Sign In opens the UI for client review.");
      }
    }

    void loadAuthSurface();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialVerifyToken) {
      setView("verify");
      setVerifyToken(initialVerifyToken);
    }
  }, [initialVerifyToken]);

  useEffect(() => {
    if (!initialVerifyToken || autoVerifyDone.current) return;
    autoVerifyDone.current = true;
    setLoading(true);
    verifyEmailRequest(initialVerifyToken.trim())
      .then(() => {
        setView("verify-success");
        setInfo("Email verified successfully.");
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((err) => {
        setView("verify");
        setError((err as AuthApiError).message || "Unable to verify email.");
      })
      .finally(() => setLoading(false));
  }, [initialVerifyToken]);

  useEffect(() => {
    if (!password || (view !== "register" && view !== "reset")) {
      setPasswordStrength("");
      return;
    }
    const timer = window.setTimeout(() => {
      passwordStrengthRequest(password)
        .then((result) => setPasswordStrength(result.strength))
        .catch(() => setPasswordStrength(""));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [password, view]);

  const strengthColor = useMemo(() => {
    if (passwordStrength === "strong") return "bg-emerald-500";
    if (passwordStrength === "good") return "bg-lime-500";
    if (passwordStrength === "fair") return "bg-amber-500";
    if (passwordStrength === "weak") return "bg-rose-500";
    return "bg-slate-200";
  }, [passwordStrength]);

  const finishPreviewLogin = (
    provider: "google" | "github" | "password",
    input?: { email?: string; name?: string }
  ) => {
    const user = createPreviewAuthUser({
      provider,
      email: input?.email,
      name: input?.name
    });
    const session = enterPreviewSession(user, rememberMe);
    onLoginSuccess(session.user);
  };

  const finishLogin = (user: AuthUser, accessToken: string, refreshToken: string, remember: boolean) => {
    saveAuthSession(user, { accessToken, refreshToken }, remember);
    onLoginSuccess(user);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setFieldErrors({});

    const normalizedEmail = email.trim().toLowerCase();
    const errors: Record<string, string> = {};
    if (!normalizedEmail) errors.email = "Please enter your email address.";
    else if (!isValidEmail(normalizedEmail)) errors.email = "Enter a valid email address.";
    else if (isDisposable(normalizedEmail)) errors.email = "Disposable email addresses are not allowed.";
    if (!password) errors.password = "Please enter your password.";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }

    if (previewMode) {
      finishPreviewLogin("password", { email: normalizedEmail, name: normalizedEmail.split("@")[0] });
      return;
    }

    setLoading(true);
    try {
      const result = await loginRequest({
        email: normalizedEmail,
        password,
        rememberMe
      });
      finishLogin(result.user, result.accessToken, result.refreshToken, rememberMe);
    } catch (err) {
      const apiError = err as AuthApiError;
      // Static host / missing API → fall back to client preview (unless explicitly disabled).
      if (
        !isAuthPreviewDisabled() &&
        (apiError.status === 404 ||
          apiError.code === "NETWORK_ERROR" ||
          apiError.code === "REQUEST_FAILED" ||
          apiError.message === "Request failed.")
      ) {
        setPreviewMode(true);
        finishPreviewLogin("password", { email: normalizedEmail, name: normalizedEmail.split("@")[0] });
        return;
      }
      if (apiError.code === "EMAIL_UNVERIFIED") {
        setInfo("Your email is not verified yet. Enter the verification link or token from your inbox.");
        setView("verify");
        setError("");
      } else {
        setError(loginErrorMessage(apiError));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setFieldErrors({});

    const normalizedEmail = email.trim().toLowerCase();
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "First name is required.";
    if (!lastName.trim()) errors.lastName = "Last name is required.";
    if (!companyName.trim()) errors.companyName = "Company name is required.";
    if (!businessName.trim()) errors.businessName = "Business name is required.";
    if (!phone.trim()) errors.phone = "Phone number is required.";
    else if (!/^\+?[\d\s().-]{7,20}$/.test(phone.trim())) errors.phone = "Enter a valid phone number.";
    if (!country.trim()) errors.country = "Country is required.";
    if (!normalizedEmail) errors.email = "Email is required.";
    else if (!isValidEmail(normalizedEmail)) errors.email = "Enter a valid email address.";
    else if (isDisposable(normalizedEmail)) errors.email = "Disposable email addresses are not allowed.";
    const passwordError = validatePasswordClient(password);
    if (passwordError) errors.password = passwordError;
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (!acceptTerms) errors.acceptTerms = "You must accept the Terms of Service.";
    if (!acceptPrivacy) errors.acceptPrivacy = "You must accept the Privacy Policy.";

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }

    setLoading(true);
    try {
      const result = await registerRequest({
        firstName,
        lastName,
        companyName,
        businessName,
        phone,
        country,
        email: normalizedEmail,
        password,
        confirmPassword,
        acceptTerms,
        acceptPrivacy,
        newsletterOptIn
      });
      if (result.verificationToken && config?.exposeTokens) {
        setVerifyToken(result.verificationToken);
        setInfo(`Dev verification token: ${result.verificationToken}`);
      } else {
        setInfo("We sent a verification link to your email.");
      }
      setView("register-success");
    } catch (err) {
      setError((err as AuthApiError).message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPasswordRequest(normalizedEmail);
      if (result.otp && config?.exposeTokens) {
        setOtp(result.otp);
        setInfo(`Dev OTP: ${result.otp}`);
      } else {
        setInfo(result.message);
      }
      setView("otp");
    } catch (err) {
      setError((err as AuthApiError).message || "Unable to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      await verifyResetOtpRequest(email.trim().toLowerCase(), otp.trim());
      setView("reset");
    } catch (err) {
      setError((err as AuthApiError).message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await forgotPasswordRequest(email.trim().toLowerCase());
      if (result.otp && config?.exposeTokens) {
        setOtp(result.otp);
        setInfo(`Dev OTP: ${result.otp}`);
      } else {
        setInfo("A new reset code was sent if the account exists.");
      }
    } catch (err) {
      setError((err as AuthApiError).message || "Unable to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const passwordError = validatePasswordClient(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordRequest({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
        confirmPassword
      });
      setPassword("");
      setConfirmPassword("");
      setView("reset-success");
    } catch (err) {
      setError((err as AuthApiError).message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError("");
    if (!verifyToken.trim()) {
      setError("Paste your verification token or open the link from your email.");
      return;
    }
    setLoading(true);
    try {
      await verifyEmailRequest(verifyToken.trim());
      setView("verify-success");
    } catch (err) {
      setError((err as AuthApiError).message || "Unable to verify email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    if (!isValidEmail(email)) {
      setError("Enter the email you registered with, then resend.");
      return;
    }
    setLoading(true);
    try {
      const result = await resendVerificationRequest(email.trim().toLowerCase());
      if (result.verificationToken && config?.exposeTokens) {
        setVerifyToken(result.verificationToken);
        setInfo(`Dev verification token: ${result.verificationToken}`);
      } else {
        setInfo(result.message);
      }
    } catch (err) {
      setError((err as AuthApiError).message || "Unable to resend verification.");
    } finally {
      setLoading(false);
    }
  };

  const onPasswordKeyEvent = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState?.("CapsLock") || false);
  };

  const title =
    view === "register" || view === "register-success"
      ? "Create your account"
      : view === "forgot" || view === "otp" || view === "reset" || view === "reset-success"
        ? "Reset password"
        : view === "verify" || view === "verify-success"
          ? "Verify email"
          : "ACN Link";

  const subtitle =
    view === "login"
      ? "Welcome back! Please enter your details."
      : view === "register"
        ? "Start building branded bio pages in minutes."
        : view === "forgot"
          ? "Enter your email and we’ll send a reset code."
          : view === "otp"
            ? "Enter the 6-digit code sent to your email."
            : view === "reset"
              ? "Choose a strong new password."
              : view === "verify"
                ? "Confirm your email to activate your account."
                : "You’re all set.";

  const StrengthBar = () =>
    passwordStrength ? (
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full ${strengthColor} transition-all`}
            style={{
              width:
                passwordStrength === "weak"
                  ? "25%"
                  : passwordStrength === "fair"
                    ? "50%"
                    : passwordStrength === "good"
                      ? "75%"
                      : "100%"
            }}
          />
        </div>
        <p className="text-[11px] text-slate-500 capitalize">Strength: {passwordStrength}</p>
      </div>
    ) : null;

  return (
    <div className="flex-1 min-h-screen bg-slate-50/60 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-indigo-200/30 rounded-full blur-[110px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-200/20 rounded-full blur-[90px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-[480px] bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100/50 p-6 sm:p-8 relative z-10 max-h-[95vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-[#312ecb] rounded-xl flex items-center justify-center text-white mb-4 shadow-sm">
            <Link className="h-6 w-6 rotate-[-45deg]" />
          </div>
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">{title}</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">{subtitle}</p>
          {previewMode && view === "login" && (
            <p className="mt-2 inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Client preview
            </p>
          )}
        </div>

        {view !== "login" &&
          view !== "register-success" &&
          view !== "reset-success" &&
          view !== "verify-success" && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setError("");
                setInfo("");
                setView(view === "otp" || view === "reset" ? "forgot" : "login");
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}

        {error && (
          <div
            className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-sm font-medium"
            role="alert"
          >
            {error}
          </div>
        )}
        {info && (
          <div
            className="mb-4 p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-medium break-all"
            role="status"
          >
            {info}
          </div>
        )}

        {view === "login" && (
          <>
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    aria-invalid={Boolean(fieldErrors.email)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="login-password"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setError("");
                      setInfo("");
                      setView("forgot");
                    }}
                    className="text-xs font-semibold text-[#312ecb] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={onPasswordKeyEvent}
                    onKeyUp={onPasswordKeyEvent}
                    placeholder="••••••••"
                    aria-invalid={Boolean(fieldErrors.password)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((open) => !open)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="mt-1.5 text-[11px] font-medium text-amber-600">Caps Lock is on</p>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="rounded border-slate-300"
                />
                Remember me on this device
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 px-4 rounded-lg font-semibold text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-8">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError("");
                  setInfo("");
                  setPassword("");
                  setView("register");
                }}
                className="font-semibold text-[#312ecb] hover:underline"
              >
                Sign up for free
              </button>
            </p>
            {config?.demoHint && (
              <p className="text-center text-[11px] text-slate-400 mt-3">
                Demo: {config.demoHint.email} / {config.demoHint.password}
              </p>
            )}
          </>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-3.5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                id="reg-first"
                icon={User}
                label="First name"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                error={fieldErrors.firstName}
              />
              <Field
                id="reg-last"
                icon={User}
                label="Last name"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                error={fieldErrors.lastName}
              />
            </div>
            <Field
              id="reg-company"
              icon={Building2}
              label="Company name"
              value={companyName}
              onChange={setCompanyName}
              autoComplete="organization"
              error={fieldErrors.companyName}
            />
            <Field
              id="reg-business"
              icon={Building2}
              label="Business name"
              value={businessName}
              onChange={setBusinessName}
              error={fieldErrors.businessName}
            />
            <Field
              id="reg-phone"
              icon={Phone}
              label="Phone number"
              value={phone}
              onChange={setPhone}
              type="tel"
              autoComplete="tel"
              error={fieldErrors.phone}
            />
            <div>
              <label
                htmlFor="reg-country"
                className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
              >
                Country
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe2 className="h-4 w-4" />
                </span>
                <select
                  id="reg-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {COUNTRIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Field
              id="reg-email"
              icon={Mail}
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              error={fieldErrors.email}
            />
            <PasswordField
              id="reg-password"
              label="Password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((open) => !open)}
              onKeyEvent={onPasswordKeyEvent}
              autoComplete="new-password"
            />
            {capsLockOn && (
              <p className="text-[11px] font-medium text-amber-600">Caps Lock is on</p>
            )}
            <StrengthBar />
            <PasswordField
              id="reg-confirm"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((open) => !open)}
              onKeyEvent={onPasswordKeyEvent}
              autoComplete="new-password"
            />
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                I agree to the{" "}
                <a href="/terms" className="text-[#312ecb] font-semibold hover:underline">
                  Terms of Service
                </a>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(event) => setAcceptPrivacy(event.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                I agree to the{" "}
                <a href="/privacy" className="text-[#312ecb] font-semibold hover:underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(event) => setNewsletterOptIn(event.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>Send me product updates and newsletter tips.</span>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create account"
              )}
            </button>
            <p className="text-center text-sm text-slate-500 pt-1">
              Already have an account?{" "}
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError("");
                  setInfo("");
                  setView("login");
                }}
                className="font-semibold text-[#312ecb] hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-5" noValidate>
            <Field
              id="forgot-email"
              icon={Mail}
              label="Email address"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Send reset code"
              )}
            </button>
          </form>
        )}

        {view === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="reset-otp"
                className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
              >
                Verification code
              </label>
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm font-mono tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Verify code"
              )}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleResendOtp()}
              className="w-full text-xs font-semibold text-[#312ecb] hover:underline disabled:opacity-60"
            >
              Didn&apos;t get a code? Resend
            </button>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
            <PasswordField
              id="reset-password"
              label="New password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((open) => !open)}
              onKeyEvent={onPasswordKeyEvent}
              autoComplete="new-password"
            />
            {capsLockOn && (
              <p className="text-[11px] font-medium text-amber-600">Caps Lock is on</p>
            )}
            <StrengthBar />
            <PasswordField
              id="reset-confirm"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((open) => !open)}
              onKeyEvent={onPasswordKeyEvent}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}

        {view === "verify" && (
          <form onSubmit={handleVerifyEmail} className="space-y-4" noValidate>
            <Field
              id="verify-email"
              icon={Mail}
              label="Account email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            <Field
              id="verify-token"
              icon={Lock}
              label="Verification token"
              value={verifyToken}
              onChange={setVerifyToken}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Verify email"
              )}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleResendVerification()}
              className="w-full text-xs font-semibold text-[#312ecb] hover:underline disabled:opacity-60"
            >
              Resend verification email
            </button>
          </form>
        )}

        {(view === "register-success" || view === "reset-success" || view === "verify-success") && (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="h-7 w-7" />
            </div>
            <p className="text-sm text-slate-600" role="status">
              {view === "register-success"
                ? "Account created. Check your email for a verification link to activate and sign in."
                : view === "reset-success"
                  ? "Password updated successfully. You can sign in with your new password."
                  : "Email verified successfully. You can now sign in."}
            </p>
            {view === "register-success" && (
              <button
                type="button"
                onClick={() => setView("verify")}
                className="w-full border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                I have a verification token
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setError("");
                setInfo("");
                setPassword("");
                setView("login");
              }}
              className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-3 rounded-lg font-semibold text-sm"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  error
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Icon className="h-4 w-4" />
        </span>
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  onKeyEvent,
  autoComplete
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  onKeyEvent?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Lock className="h-4 w-4" />
        </span>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyEvent}
          onKeyUp={onKeyEvent}
          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
