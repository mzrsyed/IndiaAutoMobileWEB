import React, { useState } from 'react';
import { ShieldCheck, UserPlus, KeyRound, Trash2, UserCheck } from 'lucide-react';
import { SystemUser } from '../types';

interface UsersViewProps {
  users: SystemUser[];
  onAddUser: (user: SystemUser) => void;
  onUpdateUser: (user: SystemUser) => void;
  onDeleteUser: (userId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onShowToast
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

  const handleEditUser = (user: SystemUser) => {
    const newName = prompt('Edit Full Name:', user.name);
    if (newName === null) return;
    const newUsername = prompt('Edit Username:', user.username);
    if (newUsername === null) return;
    const newPassword = prompt('Edit Password:', user.password || '');
    if (newPassword === null) return;

    if (!newName.trim() || !newUsername.trim() || !newPassword) {
      onShowToast('Fields cannot be empty.', 'error');
      return;
    }

    const normalizedUser = newUsername.trim().toLowerCase();
    const usernameTaken = users.some(
      (u) => u.id !== user.id && u.username.toLowerCase() === normalizedUser
    );
    if (usernameTaken) {
      onShowToast('That username is already taken.', 'error');
      return;
    }

    onUpdateUser({
      ...user,
      name: newName.trim(),
      username: normalizedUser,
      password: newPassword
    });
    onShowToast('User profile updated successfully!', 'success');
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
                          onClick={() => handleEditUser(u)}
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
    </div>
  );
};
