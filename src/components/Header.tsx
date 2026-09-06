import React, { useRef } from 'react';
import { Download, Upload, LogOut } from 'lucide-react';
import { SystemUser } from '../types';
import { BrandLogo } from './Logo';

interface HeaderProps {
  currentUser: SystemUser | null;
  cloudStatusText: string;
  isOnline: boolean;
  onLogout: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  cloudStatusText,
  isOnline,
  onLogout,
  onExportBackup,
  onImportBackup
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
