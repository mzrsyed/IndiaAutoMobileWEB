import React, { useState } from 'react';
import { ShieldCheck, UserPlus, KeyRound, Trash2, UserCheck, Clock, X, Check } from 'lucide-react';
import { SystemUser } from '../types';

interface UsersViewProps {
  users: SystemUser[];
  sessionTimeoutMinutes: number;
  onUpdateSessionTimeout: (minutes: number) => void;
  onAddUser: (user: SystemUser) => void;
  onUpdateUser: (user: SystemUser) => void;
  onDeleteUser: (userId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  sessionTimeoutMinutes,
  onUpdateSessionTimeout,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onShowToast
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Editing user modal state
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName || !cleanUser || !password) {
      onShowToast('Please fill all required user fields.', 'error');
      return;
    }

    if (users.some((u) => u.username && u.username.toLowerCase() === cleanUser)) {
      onShowToast('Username is already taken by another profile.', 'error');
      return;
    }

    const newUser: SystemUser = {
      id: 'USER_' + Date.now().toString(36),
      name: cleanName,
      username: cleanUser,
      password: password,
      isAdmin: false,
      created: new Date().toISOString()
    };

    onAddUser(newUser);
    onShowToast(`User account for ${cleanName} created successfully!`, 'success');
    setName('');
    setUsername('');
    setPassword('');
  };

  const handleToggleAdmin = (user: SystemUser) => {
    if (user.username.toLowerCase() === 'admin' || user.id === 'USER_ADMIN') {
      onShowToast('Cannot remove admin privileges from primary system admin.', 'error');
      return;
    }

    const updated: SystemUser = {
      ...user,
      isAdmin: !user.isAdmin
    };
    onUpdateUser(updated);
    onShowToast(
      `Admin rights ${updated.isAdmin ? 'granted to' : 'revoked from'} ${user.name}!`,
      'success'
    );
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword(user.password || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const trimmedName = editName.trim();
    const trimmedUsername = editUsername.trim().toLowerCase();

    if (!trimmedName || !trimmedUsername || !editPassword) {
      onShowToast('All fields are required.', 'error');
      return;
    }

    const usernameTaken = users.some(
      (u) => u.id !== editingUser.id && u.username.toLowerCase() === trimmedUsername
    );
    if (usernameTaken) {
      onShowToast('That username is already taken by another account.', 'error');
      return;
    }

    onUpdateUser({
      ...editingUser,
      name: trimmedName,
      username: trimmedUsername,
      password: editPassword
    });

    onShowToast(`Account details for ${trimmedName} updated successfully!`, 'success');
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              User Management & Access Control
            </h2>
            <p className="text-xs text-gray-500">
              Authorized administrators can add, edit, or configure staff accounts
            </p>
          </div>
        </div>

        {/* Add User Form */}
        <div className="p-6 border-b border-gray-100 bg-blue-50/40">
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white shadow-sm outline-none"
                placeholder="e.g. Staff Member"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white shadow-sm outline-none font-mono"
                placeholder="e.g. staff1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Password *
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white shadow-sm outline-none"
                placeholder="Password"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add User Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User ID / Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((u) => {
                const isPrimary = u.username.toLowerCase() === 'admin' || u.id === 'USER_ADMIN';
                const dateStr = u.created ? new Date(u.created).toLocaleDateString() : 'N/A';

                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.isAdmin && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">ID: {u.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 font-medium">
                      @{u.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dateStr}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        {!isPrimary && (
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{u.isAdmin ? 'Revoke Admin' : 'Make Admin'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Edit / Pass</span>
                        </button>
                        {!isPrimary && users.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete account for ${u.name}?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Login Session Timeout Configuration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Login Session Inactivity Timeout
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 max-w-lg leading-relaxed">
                Automatically logs out the active user after a specified duration of inactivity to prevent unauthorized access when a computer or billing device is left unattended.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Auto-Logout:
            </label>
            <select
              value={sessionTimeoutMinutes}
              onChange={(e) => onUpdateSessionTimeout(parseInt(e.target.value, 10))}
              className="px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes (Default)</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
              <option value={240}>4 Hours</option>
              <option value={480}>8 Hours</option>
              <option value={0}>Never (Stay Logged In)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-base">Edit User Profile & Credentials</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Username (Login ID)
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-mono"
                  placeholder="e.g. johnd"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Account Password
                </label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-mono"
                  placeholder="Password"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
