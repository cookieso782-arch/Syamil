import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { User, Role, MosqueProfile } from '../types/index.ts';
import { DEMO_USERS, saveManagedUserPassword } from '../services/authService.ts';
import { getStoredMosqueProfile, getDefaultOfficerName } from '../services/storage.ts';
import {
  UserCog,
  Shield,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Lock,
  Phone,
  Mail,
  X,
  UserCheck,
  Search,
  Printer,
  CheckSquare,
} from 'lucide-react';
import { Pagination } from './common/Pagination.tsx';
import { MultiDeleteBar } from './common/MultiDeleteBar.tsx';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal.tsx';
import { ReportPrintModal } from './common/ReportPrintModal.tsx';

export const UserManagementView: React.FC = () => {
  const { user: currentUser, can, switchUser } = useAuth();
  const { themeConfig } = useTheme();

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('sabiluna_managed_users');
    return saved ? JSON.parse(saved) : DEMO_USERS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isMultiDeleteOpen, setIsMultiDeleteOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sekretaris' as Role,
    phone: '',
    password: '',
  });

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('sabiluna_managed_users', JSON.stringify(newUsers));
    window.dispatchEvent(new Event('managed-users-updated'));
  };

  const [mosqueProfile, setMosqueProfile] = useState<MosqueProfile>(() => getStoredMosqueProfile());

  React.useEffect(() => {
    const syncUsers = () => {
      const saved = localStorage.getItem('sabiluna_managed_users');
      setUsers(saved ? JSON.parse(saved) : DEMO_USERS);
    };
    const syncProfile = () => {
      setMosqueProfile(getStoredMosqueProfile());
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_managed_users') syncUsers();
      if (!e.key || e.key === 'sabiluna_mosque_profile') syncProfile();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('managed-users-updated', syncUsers);
    window.addEventListener('mosque-profile-updated', syncProfile);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('managed-users-updated', syncUsers);
      window.removeEventListener('mosque-profile-updated', syncProfile);
    };
  }, []);

  const roleLabels: Record<string, string> = {
    admin: 'Ketua DKM (Admin)',
    super_admin: 'Ketua DKM (Admin)',
    bendahara: 'Bendahara Keuangan',
    sekretaris: 'Sekretaris DKM',
    humas: 'Humas & Dakwah',
    marbot: 'Petugas Sarana & Marbot',
    jamaah: 'Jamaah Umum / Publik',
  };

  const roleBadges: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    bendahara: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    sekretaris: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    humas: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    marbot: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    jamaah: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'sekretaris',
      phone: '',
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (editingUser) {
      const updatedList = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: formData.name.trim(),
              email: formData.email.trim(),
              role: formData.role,
              roleLabel: roleLabels[formData.role] || editingUser.roleLabel,
              phone: formData.phone.trim() || undefined,
            }
          : u
      );
      saveUsers(updatedList);
      if (formData.password.trim()) {
        saveManagedUserPassword(formData.email.trim(), formData.password.trim());
      }
      if (currentUser?.id === editingUser.id) {
        const synced = updatedList.find((u) => u.id === editingUser.id);
        if (synced) switchUser(synced);
      }
    } else {
      const newUser: User = {
        id: `usr-${Date.now().toString().slice(-4)}`,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        roleLabel: roleLabels[formData.role] || 'Pengurus DKM',
        phone: formData.phone.trim() || undefined,
      };
      saveUsers([...users, newUser]);
      if (formData.password.trim()) {
        saveManagedUserPassword(newUser.email, formData.password.trim());
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) return;
    setDeleteConfirmId(id);
  };

  const handleConfirmDeleteSingle = () => {
    if (!deleteConfirmId || deleteConfirmId === currentUser?.id) return;
    const updated = users.filter((u) => u.id !== deleteConfirmId);
    saveUsers(updated);
    setSelectedUserIds((prev) => prev.filter((id) => id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };

  const handleConfirmDeleteMulti = () => {
    if (selectedUserIds.length === 0) return;
    const safeSelected = selectedUserIds.filter((id) => id !== currentUser?.id);
    const remaining = users.filter((u) => !safeSelected.includes(u.id));
    saveUsers(remaining);
    setSelectedUserIds([]);
    setIsSelectMode(false);
    setIsMultiDeleteOpen(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.roleLabel && u.roleLabel.toLowerCase().includes(q))
      );
    });
  }, [users, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  const deletableCurrentPageUsers = paginatedUsers.filter((u) => u.id !== currentUser?.id);

  const handleToggleSelectAll = () => {
    const pageDeletableIds = deletableCurrentPageUsers.map((u) => u.id);
    const allSelected = pageDeletableIds.length > 0 && pageDeletableIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !pageDeletableIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageDeletableIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (id === currentUser?.id) return;
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white border border-purple-900/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-400/30">
            Hak Akses & Keamanan Akun
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5">
            Manajemen Pengguna & Pengurus DKM
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Kelola akun pengurus, penugasan hak akses (Role-Based Access Control), dan izin pencatatan keuangan masjid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsReportPrintOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-300" />
            <span>Cetak Struktur Pengurus</span>
          </button>

          {can('create') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengurus Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Toolbar */}
      <div className={`p-4 rounded-2xl border ${themeConfig.cardBg} shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama pengurus, email, atau peran..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Total: <strong className="text-slate-800 dark:text-slate-200">{filteredUsers.length}</strong> Pengurus Terdaftar
            </span>

            {can('delete') && (
              <button
                onClick={() => {
                  if (isSelectMode) {
                    setIsSelectMode(false);
                    setSelectedUserIds([]);
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  isSelectMode
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Pilih data untuk multi hapus"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{isSelectMode ? 'Batal' : 'Pilih Data'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Delete Bar */}
      {can('delete') && isSelectMode && (
        <MultiDeleteBar
          selectedCount={selectedUserIds.length}
          onDeleteSelected={() => setIsMultiDeleteOpen(true)}
          onClearSelection={() => {
            setSelectedUserIds([]);
            setIsSelectMode(false);
          }}
          label="Pengurus"
        />
      )}

      {/* Users Table & Mobile Cards */}
      <div className={`rounded-2xl border ${themeConfig.cardBg} overflow-hidden shadow-sm`}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                {can('delete') && isSelectMode && (
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={deletableCurrentPageUsers.length > 0 && deletableCurrentPageUsers.every((u) => selectedUserIds.includes(u.id))}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                      title="Pilih semua di halaman ini"
                    />
                  </th>
                )}
                <th className="py-3.5 px-4">Nama Pengurus</th>
                <th className="py-3.5 px-4">Kontak & Email</th>
                <th className="py-3.5 px-4">Hak Akses / Peran</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4 text-center">Aksi / Demo Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={can('delete') && isSelectMode ? 6 : 5} className="py-12 text-center text-slate-400">
                    <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-xs">Tidak ada data pengurus ditemukan.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      {can('delete') && isSelectMode && (
                        <td className="py-3.5 px-4 text-center">
                          {!isCurrent ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(u.id)}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-mono text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-500/20">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Anda
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">{u.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${roleBadges[u.role]}`}>
                          <Shield className="w-3 h-3" />
                          {u.roleLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif Terverifikasi
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => switchUser(u)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            title="Simulasikan login sebagai pengguna ini"
                          >
                            Uji Login
                          </button>

                          {can('edit') && (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="Edit Pengurus"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {can('delete') && !isCurrent && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="Hapus Pengurus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-xs">Tidak ada data pengurus ditemukan.</p>
            </div>
          ) : (
            paginatedUsers.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              const isChecked = selectedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  className={`p-3.5 sm:p-4 space-y-2.5 ${
                    isChecked ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {can('delete') && isSelectMode && !isCurrent && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(u.id)}
                          className="mt-1.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 cursor-pointer flex-shrink-0"
                        />
                      )}
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-500/20 flex-shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-sm text-slate-900 dark:text-white break-words">
                            {u.name}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${roleBadges[u.role]}`}>
                          <Shield className="w-3 h-3" />
                          {u.roleLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aktif Terverifikasi
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => switchUser(u)}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                      >
                        Uji Login
                      </button>

                      {can('edit') && (
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit Pengurus"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {can('delete') && !isCurrent && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Hapus Pengurus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination User Management */}
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingUser ? 'Edit Akun Pengurus' : 'Tambah Pengurus / Pengguna Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: H. Ahmad Muzammil, S.Ag"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Alamat Email (Username Login) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pengurus@masjid.id"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Hak Akses / Jabatan DKM <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none cursor-pointer"
                >
                  <option value="admin">Admin (Ketua DKM - Akses Penuh)</option>
                  <option value="sekretaris">Sekretaris DKM (Surat &amp; Inventaris)</option>
                  <option value="bendahara">Bendahara Keuangan (Kas &amp; Zakat)</option>
                  <option value="humas">Humas &amp; Syiar Dakwah (Jum&apos;at &amp; Kajian)</option>
                  <option value="marbot">Marbot / Sarana (Akses Inventaris)</option>
                  {formData.role === 'super_admin' && (
                    <option value="super_admin">Ketua DKM (Super Admin - Akses Penuh)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {editingUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Awal'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Kosongkan jika tidak ingin mengubah kata sandi' : 'Minimal 4 karakter'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals for Delete */}
      <ConfirmDeleteModal
        isOpen={deleteConfirmId !== null}
        title="Hapus Akun Pengurus"
        itemName={users.find((u) => u.id === deleteConfirmId)?.name || 'Pengurus'}
        message="Akun pengurus yang dihapus akan dicabut seluruh hak aksesnya ke sistem SYAMIL DKM. Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Akun"
        onConfirm={handleConfirmDeleteSingle}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmDeleteModal
        isOpen={isMultiDeleteOpen}
        title="Hapus Massal Akun Pengurus"
        count={selectedUserIds.length}
        message={`Sebanyak ${selectedUserIds.length} akun pengurus terpilih akan dihapus permanen dari sistem DKM.`}
        confirmText={`Hapus ${selectedUserIds.length} Akun`}
        onConfirm={handleConfirmDeleteMulti}
        onCancel={() => setIsMultiDeleteOpen(false)}
      />

      {/* Printable Report Modal: Pengurus & Pengguna */}
      <ReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="STRUKTUR KEPENGURUSAN & PEJABAT RESMI DKM"
        subtitle={`Dewan Kemakmuran ${mosqueProfile.name} - Periode 2024-2029`}
        periodText={`Pemutakhiran Data Per ${new Date().getFullYear()}${searchQuery.trim() ? ` • Filter Pencarian (${filteredUsers.length} dari ${users.length} Pejabat)` : ` • Semua Pengurus (${users.length} Pejabat)`}`}
        summaryCards={[
          { label: 'Total Personel Pengurus', value: `${filteredUsers.length} Pejabat`, color: 'purple' },
          { label: 'Ketua / Pimpinan', value: `${filteredUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin').length} Orang`, color: 'emerald' },
          { label: 'Bendahara Keuangan', value: `${filteredUsers.filter((u) => u.role === 'bendahara').length} Orang`, color: 'blue' },
          { label: 'Status Keaktifan', value: '100% Aktif', color: 'amber' },
        ]}
        columns={[
          { header: 'No', key: 'no', width: '6%', align: 'center' },
          { header: 'Nama Lengkap Pejabat', key: 'name', width: '30%' },
          { header: 'Amanah / Jabatan DKM', key: 'role', width: '24%' },
          { header: 'Alamat Email Resmi', key: 'email', width: '22%' },
          { header: 'Nomor Kontak', key: 'phone', width: '18%' },
        ]}
        data={filteredUsers.map((u, i) => ({
          no: i + 1,
          name: u.name,
          role: u.roleLabel || u.role,
          email: u.email,
          phone: u.phone || '-',
        }))}
        notes={`Daftar nama pengurus di atas adalah pejabat sah berdasar Surat Keputusan (SK) Pengangkatan DKM ${mosqueProfile.name} yang berwenang mengelola amanah umat.`}
        signatures={[
          { role: 'Ketua DKM (Admin)', name: getDefaultOfficerName('admin', 'Drs. KH. Ahmad Muzammil'), position: `Ketua DKM ${mosqueProfile.name}` },
          { role: 'Sekretaris DKM', name: getDefaultOfficerName('sekretaris', 'Ust. Farhan Basalamah, S.Kom'), position: 'Sekretaris Umum' },
        ]}
      />
    </div>
  );
};
