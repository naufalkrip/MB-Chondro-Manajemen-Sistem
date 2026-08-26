import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logoImg from "../aset/logo.png";

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard or intended page
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError("Silakan masukkan username dan password Anda.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanUser, cleanPass);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal masuk ke sistem. Silakan coba lagi.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Decorative Gradients */}
      <div className="login-bg-shape-1" />
      <div className="login-bg-shape-2" />

      <div className="login-card-wrapper animate-fade-slide-up">
        {/* Top Brand Header */}
        <div className="login-header">
          <div className="login-logo-container">
            <img src={logoImg} alt="Logo MB Chondro" className="login-logo-img" />
          </div>
          <div className="login-badge">
            <ShieldCheck size={13} />
            Portal Manajemen Internal
          </div>
          <h1 className="login-title">MB CHONDRO</h1>
          <p className="login-subtitle">
            Sistem Informasi Manajemen Terpadu Organisasi
          </p>
        </div>

        {/* Error Alert Toast */}
        {error && (
          <div className="login-error-alert animate-shake">
            <AlertCircle size={18} className="login-error-icon" />
            <div className="login-error-text">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="username" className="login-label">
              Username
            </label>
            <div className="login-input-wrapper">
              <div className="login-input-icon">
                <User size={18} />
              </div>
              <input
                id="username"
                type="text"
                className="login-input"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="password" className="login-label">
              Password
            </label>
            <div className="login-input-wrapper">
              <div className="login-input-icon">
                <Lock size={18} />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="login-btn-loading">
                <span className="login-spinner" />
                Memverifikasi...
              </span>
            ) : (
              <span className="login-btn-content">
                <LogIn size={18} />
                Masuk ke Sistem
              </span>
            )}
          </button>
        </form>

        {/* Information Notice */}
        <div className="login-footer-info">
          <p>
            Akun pengguna dikelola langsung di Google Spreadsheet pada sheet <strong>USERS</strong>.
          </p>
        </div>

        {/* Footer Brand Info */}
        <div className="login-copyright">
          &copy; {new Date().getFullYear()} Marching Band Chondrodimuko. All rights reserved.
        </div>
      </div>
    </div>
  );
}
