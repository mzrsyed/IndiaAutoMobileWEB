import React, { useState } from 'react';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { SystemUser } from '../types';
import { BrandLogo } from './Logo';

interface AuthScreenProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ users, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim().toLowerCase();
    if (!trimmedUser || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    // Check system users list
    const found = users.find(
      (u) =>
        u.username &&
        u.username.toLowerCase() === trimmedUser &&
        u.password === password
    );

    // Also support fallback default admin credentials
    if (!found && trimmedUser === 'admin' && password === 'India') {
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
        setErrorMsg('Incorrect password. Please try again.');
      } else {
        setErrorMsg('User not found. Use default admin or contact administrator.');
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
          <div className="mt-2 inline-block bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-semibold text-amber-300 border border-white/15 shadow-inner">
            Developed by Mazhar Sayyed
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none font-medium"
                  placeholder="e.g. admin"
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none font-medium"
                  placeholder="••••••••"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
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

          {/* Quick default credentials hint */}
          <div className="mt-4 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-center justify-between">
            <span className="font-semibold">Default Admin Login:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded text-[10px] border border-blue-200">
              admin / India
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50/80 px-6 py-3.5 border-t border-gray-100 text-center backdrop-blur-sm">
          <span className="text-[11px] text-gray-500 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            India Automobiles Cloud System &bull; Secure Storage
          </span>
        </div>
      </div>
    </div>
  );
};
