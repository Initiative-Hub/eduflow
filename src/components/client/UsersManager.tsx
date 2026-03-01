'use client'

import { useEffect, useState } from 'react'

type User = {
  id: string
  email: string
  name?: string
  role?: string
}

export default function UsersManager() {
  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name?: string; email?: string; role?: string }>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUserForm, setNewUserForm] = useState<{ email: string; password: string; name: string; role: string }>({ email: '', password: '', name: '', role: 'USER' })
  const [addingUser, setAddingUser] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchUsers()
  }, [])

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const startEdit = (u: User) => {
    setEditingId(u.id)
    setEditForm({ name: u.name, email: u.email, role: u.role })
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm }),
      })
      if (res.ok) {
        await fetchUsers()
        setEditingId(null)
      } else {
        alert('Update failed')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddUser = async () => {
    setAddError('')
    if (!newUserForm.email || !newUserForm.password) {
      setAddError('Email and password are required')
      return
    }
    
    setAddingUser(true)
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
      })
      
      const data = await res.json()
      if (res.ok) {
        await fetchUsers()
        setShowAddModal(false)
        setNewUserForm({ email: '', password: '', name: '', role: 'USER' })
      } else {
        setAddError(data.message || 'Failed to create user')
      }
    } catch (e) {
      console.error(e)
      setAddError('An error occurred while creating the user')
    } finally {
      setAddingUser(false)
    }
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10))
    setCurrentPage(1)
  }

  const getInitials = (name?: string, email?: string): string => {
    const displayName = name || email || ''
    return displayName
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getRoleBadgeColor = (role?: string): string => {
    switch (role) {
      case 'ADMIN':
        return 'bg-gray-200 text-gray-800'
      case 'TEACHER':
        return 'bg-purple-200 text-purple-800'
      case 'STUDENT':
        return 'bg-blue-200 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!mounted) return <p>Loading...</p>

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-300">
        <h1 className="text-2xl font-bold mb-1">User Management</h1>
        <p className="text-gray-500 text-sm">View and manage all registered platform users</p>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              placeholder="Search users by name, email, or ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">+ Add New User</button>
        </div>
        <div className="flex items-center gap-2">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="TEACHER">Teacher</option>
            <option value="STUDENT">Student</option>
            <option value="USER">User</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">USER</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ROLE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">STATUS</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">JOIN DATE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                    {getInitials(u.name, u.email)}
                  </div>
                  <div>
                    {editingId === u.id ? (
                      <input
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">{u.name || '—'}</div>
                    )}
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {editingId === u.id ? (
                    <select
                      value={editForm.role || ''}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="STUDENT">Student</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="text-sm text-gray-600">Active</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">—</td>
                <td className="px-6 py-4">
                  {editingId === u.id ? (
                    <>
                      <button onClick={saveEdit} className="mr-2 text-green-600 hover:text-green-800">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(u)} className="mr-3 text-blue-600 hover:text-blue-800">✏️</button>
                      <button className="text-red-600 hover:text-red-800">🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      <div className="px-6 py-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} users
          </p>
          <select value={itemsPerPage.toString()} onChange={(e) => handleItemsPerPageChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
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
              className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600'}`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            
            {addError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {addError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewUserForm({ email: '', password: '', name: '', role: 'USER' })
                  setAddError('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={addingUser}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={addingUser}
              >
                {addingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
