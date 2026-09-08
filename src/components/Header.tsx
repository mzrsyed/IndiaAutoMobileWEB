import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, LogOut, Clock, ChevronDown } from 'lucide-react';
import { SystemUser } from '../types';
import { BrandLogo } from './Logo';

interface HeaderProps {
  currentUser: SystemUser | null;
  cloudStatusText: string;
  isOnline: boolean;
  sessionTimeoutMinutes: number;
  onUpdateSessionTimeout: (minutes: number) => void;
  onLogout: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  cloudStatusText,
  isOnline,
  sessionTimeoutMinutes,
  onUpdateSessionTimeout,
  onLogout,
  onExportBackup,
  onImportBackup
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTimeoutMenu, setShowTimeoutMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close timeout dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTimeoutMenu(false);
      }
    };
    if (showTimeoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimeoutMenu]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  return (
    <header className="bg-white shadow-sm z-10 border-b border-gray-200 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-2">
          {/* Logo & Branding */}
          <div className="flex items-center">
            <BrandLogo className="h-11 w-11 p-0.5 border border-gray-200 shadow-sm mr-3 bg-white" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">
                India Automobiles
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                <span
                  className={`text-[10px] font-medium flex items-center gap-1 ${
                    isOnline ? 'text-green-600' : 'text-amber-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {cloudStatusText}
                </span>
                <span className="text-[10px] text-gray-300 hidden sm:inline">|</span>
                <span className="text-[10px] text-gray-600 font-medium hidden sm:inline">
                  Proprietor: <strong className="text-gray-900">Khaja Mungle</strong> (8055650977)
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExportBackup}
              title="Download full database backup as JSON"
              className="hidden sm:flex bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Restore database backup from JSON file"
              className="hidden sm:flex bg-white border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />

            {currentUser && (
              <div className="flex items-center gap-2 bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-gray-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-green-600 font-medium">
                    {currentUser.isAdmin ? 'Administrator' : 'Staff Access'}
                  </div>
                </div>
              </div>
            )}

            {/* Session Inactivity Timeout Selector */}
            {currentUser && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowTimeoutMenu(!showTimeoutMenu)}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-gray-200 shadow-sm cursor-pointer"
                  title="Configure auto-logout inactivity timeout"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden lg:inline text-[11px] text-gray-500 font-medium">Session:</span>
                  <span className="text-[11px] font-bold text-gray-800">
                    {sessionTimeoutMinutes === 0
                      ? 'Never'
                      : sessionTimeoutMinutes >= 60
                      ? `${sessionTimeoutMinutes / 60}h`
                      : `${sessionTimeoutMinutes}m`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {showTimeoutMenu && (
                  <div
                    className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      Inactivity Timeout
                    </div>
                    {[
                      { label: '15 Minutes', value: 15 },
                      { label: '30 Minutes (Recommended)', value: 30 },
                      { label: '1 Hour', value: 60 },
                      { label: '2 Hours', value: 120 },
                      { label: '4 Hours', value: 240 },
                      { label: '8 Hours', value: 480 },
                      { label: 'Never (Stay logged in)', value: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onUpdateSessionTimeout(opt.value);
                          setShowTimeoutMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          sessionTimeoutMinutes === opt.value
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {sessionTimeoutMinutes === opt.value && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onLogout}
              className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
              title="Log out from current session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
