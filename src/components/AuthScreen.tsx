import React, { useState } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Code2, Mail } from 'lucide-react';
import { SystemUser } from '../types';
import { BrandLogo } from './Logo';

interface AuthScreenProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ users, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    // Check system users list with exact or case-insensitive match
    const found = users.find(
      (u) =>
        u.username &&
        u.username.toLowerCase() === trimmedUser &&
        (u.password === trimmedPass || u.password.toLowerCase() === trimmedPass.toLowerCase())
    );

    // Fallback default admin credentials (supports admin/India, admin/india, admin/admin)
    if (
      !found &&
      trimmedUser === 'admin' &&
      (trimmedPass === 'India' || trimmedPass.toLowerCase() === 'india' || trimmedPass.toLowerCase() === 'admin')
    ) {
      const defaultAdmin: SystemUser = {
        id: 'USER_ADMIN',
        name: 'Mazhar Sayyed',
        username: 'admin',
        password: 'India',
        isAdmin: true,
        created: new Date().toISOString()
      };
      onLoginSuccess(defaultAdmin);
      return;
    }

    if (found) {
      onLoginSuccess(found);
    } else {
      const exists = users.some(
        (u) => u.username && u.username.toLowerCase() === trimmedUser
      );
      if (exists) {
        setErrorMsg('Incorrect password. Please verify and try again.');
      } else {
        setErrorMsg('User not found. Please verify your credentials or contact administrator.');
      }
    }
  };

  return (
    <div
      id="auth-screen"
      className="fixed inset-0 z-50 login-bg flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="glass-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden my-auto transition-all">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          {/* Circular Logo Branding */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-3 p-1 shadow-2xl ring-4 ring-white/20">
            <BrandLogo className="w-full h-full" alt="India Automobiles Logo" />
          </div>

          <h1 className="text-3xl font-black tracking-tight">INDIA AUTOMOBILES</h1>
          <p className="text-xs text-blue-200 mt-1 uppercase tracking-widest font-bold">
            Inventory & Billing System
          </p>
          <div className="mt-2 text-xs font-semibold text-white/90">
            Proprietor: <span className="text-amber-300 font-bold">Khaja Mungle</span> &bull; 8055650977
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Please enter your credentials to access the system.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none font-medium"
                  placeholder="Enter username"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none font-medium"
                  placeholder="Enter password"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <span>Login to System</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50/90 px-6 py-3 border-t border-gray-100 text-center backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500 font-medium">
            <span className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              India Automobiles Cloud System
            </span>

            {/* Hidden developer details behind Dev icon */}
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDev(prev => !prev)}
                title={showDev ? "Hide Developer Info" : "View Developer Info"}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                  showDev
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                <Code2 className={`w-3 h-3 ${showDev ? 'text-white' : 'text-blue-600'}`} />
                <span>Dev</span>
              </button>

              {showDev && (
                <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-wrap items-center gap-1.5 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-lg border border-slate-700">
                  <span>Developed by <strong className="text-white font-bold">Mazhar Sayyed</strong></span>
                  <span className="text-slate-500">&bull;</span>
                  <a
                    href="mailto:Mazharausa@gmail.com"
                    className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-100 font-semibold underline underline-offset-2 transition-colors"
                    title="Email Mazhar Sayyed"
                  >
                    <Mail className="w-2.5 h-2.5 text-sky-400" />
                    <span>Email: Mazharausa@gmail.com</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
