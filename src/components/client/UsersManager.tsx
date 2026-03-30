'use client';

import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

export default function UsersManager() {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name?: string;
    email?: string;
    role?: string;
  }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    email: string;
    password: string;
    name: string;
    role: string;
  }>({ email: '', password: '', name: '', role: 'USER' });
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditForm({ name: u.name, email: u.email, role: u.role });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (res.ok) {
        await fetchUsers();
        setEditingId(null);
      } else {
        alert('Update failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async () => {
    setAddError('');
    if (!newUserForm.email || !newUserForm.password) {
      setAddError('Email and password are required');
      return;
    }

    setAddingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserForm.email,
          password: newUserForm.password,
          name: newUserForm.name || undefined,
          role: newUserForm.role,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchUsers();
        setShowAddModal(false);
        setNewUserForm({ email: '', password: '', name: '', role: 'USER' });
      } else {
        setAddError(data.message || 'Failed to create user');
      }
    } catch (e) {
      console.error(e);
      setAddError('An error occurred while creating the user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  const getInitials = (name?: string, email?: string): string => {
    const displayName = name || email || '';
    return displayName
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeColor = (role?: string): string => {
    switch (role) {
      case 'ADMIN':
        return 'bg-gray-200 text-gray-800';
      case 'TEACHER':
        return 'bg-purple-200 text-purple-800';
      case 'STUDENT':
        return 'bg-blue-200 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!mounted) return <p>Loading...</p>;

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-gray-300 border-b p-6">
        <h1 className="mb-1 font-bold text-2xl">User Management</h1>
        <p className="text-gray-500 text-sm">
          View and manage all registered platform users
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              placeholder="Search users by name, email, or ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Add New User
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="TEACHER">Teacher</option>
            <option value="STUDENT">Student</option>
            <option value="USER">User</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700 text-xs uppercase tracking-wider">
                  USER
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700 text-xs uppercase tracking-wider">
                  ROLE
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700 text-xs uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700 text-xs uppercase tracking-wider">
                  JOIN DATE
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700 text-xs uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="flex items-center gap-3 px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-semibold text-sm text-white">
                      {getInitials(u.name, u.email)}
                    </div>
                    <div>
                      {editingId === u.id ? (
                        <input
                          value={editForm.name || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="rounded border px-2 py-1 text-sm"
                        />
                      ) : (
                        <div className="font-medium text-gray-900">
                          {u.name || '—'}
                        </div>
                      )}
                      <div className="text-gray-500 text-sm">{u.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <select
                        value={editForm.role || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, role: e.target.value })
                        }
                        className="rounded border px-2 py-1 text-sm"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                        <option value="TEACHER">Teacher</option>
                        <option value="STUDENT">Student</option>
                      </select>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 font-medium text-xs ${getRoleBadgeColor(u.role)}`}
                      >
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-gray-600 text-sm">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">—</td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="mr-2 text-green-600 hover:text-green-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(u)}
                          className="mr-3 text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between border-t px-6 py-4">
        <div className="flex items-center gap-4">
          <p className="text-gray-600 text-sm">
            Showing{' '}
            {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)} to{' '}
            {Math.min(currentPage * itemsPerPage, filtered.length)} of{' '}
            {filtered.length} users
          </p>
          <select
            value={itemsPerPage.toString()}
            onChange={(e) => handleItemsPerPageChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="4">4 per page</option>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>

        <div className="flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`rounded px-3 py-1 ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600'}`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 font-bold text-xl">Add New User</h2>

            {addError && (
              <div className="mb-4 rounded bg-red-100 p-3 text-red-700">
                {addError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm">
                  Password
                </label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  placeholder="Enter password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, name: e.target.value })
                  }
                  placeholder="Full name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm">
                  Role
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, role: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewUserForm({
                    email: '',
                    password: '',
                    name: '',
                    role: 'USER',
                  });
                  setAddError('');
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                disabled={addingUser}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={addingUser}
              >
                {addingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
