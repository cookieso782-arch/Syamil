import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { ZakatMustahikView } from './components/ZakatMustahikView.tsx';
import { FridayKajianView } from './components/FridayKajianView.tsx';
import { LettersAdminView } from './components/LettersAdminView.tsx';
import { UserManagementView } from './components/UserManagementView.tsx';
import { MosqueSettingsView } from './components/MosqueSettingsView.tsx';
import { TransactionModal } from './components/TransactionModal.tsx';
import { InventoryModal } from './components/InventoryModal.tsx';
import { ExcelImportModal } from './components/ExcelImportModal.tsx';
import {
  getStoredTransactions,
  saveStoredTransactions,
  getStoredInventory,
  saveStoredInventory,
  getStoredEvents,
  saveStoredEvents,
  getStoredMosqueProfile,
} from './services/storage.ts';
import { getTodayPrayerTimes } from './services/prayerTimes.ts';
import { Transaction, InventoryItem, MosqueEvent, MosqueProfile } from './types/index.ts';
import { CheckCircle2, Landmark } from 'lucide-react';
import { LoginPage } from './components/LoginPage.tsx';

function MosqueAppContent() {
  const { user, isAuthenticated, allowedMenus } = useAuth();
  const { themeConfig } = useTheme();

  // Navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');
  const [financePresetFilter, setFinancePresetFilter] = useState<{
    type: 'all' | 'in' | 'out';
    category: string;
    nonce: number;
  } | null>(null);

  const handleTabChange = (tab: string) => {
    setFinancePresetFilter(null);
    setActiveTab(tab);
  };

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data States
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => getStoredInventory());
  const [events, setEvents] = useState<MosqueEvent[]>(() => getStoredEvents());
  const [mosqueProfile, setMosqueProfile] = useState<MosqueProfile>(() => getStoredMosqueProfile());

  // Listen to profile updates across components/windows
  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      if (e instanceof StorageEvent && e.key && e.key !== 'sabiluna_mosque_profile') {
        return;
      }
      const customEvent = e as CustomEvent<MosqueProfile>;
      if (customEvent.detail) {
        setMosqueProfile(customEvent.detail);
      } else {
        setMosqueProfile(getStoredMosqueProfile());
      }
    };
    window.addEventListener('mosque-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('mosque-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  // Prayer times state
  const [prayerData, setPrayerData] = useState(() => getTodayPrayerTimes());

  // Modal states
  const [isTrxModalOpen, setIsTrxModalOpen] = useState(false);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);

  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InventoryItem | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'kas' | 'inventaris'>('kas');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Update prayer time calculation every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPrayerData(getTodayPrayerTimes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen to window storage and same-tab custom events for multi-tab and live sync
  useEffect(() => {
    const syncTransactions = () => {
      const latest = getStoredTransactions();
      setTransactions((prev) =>
        JSON.stringify(prev) === JSON.stringify(latest) ? prev : latest
      );
    };
    const syncInventory = () => {
      const latest = getStoredInventory();
      setInventory((prev) =>
        JSON.stringify(prev) === JSON.stringify(latest) ? prev : latest
      );
    };
    const syncEvents = () => {
      const latest = getStoredEvents();
      setEvents((prev) =>
        JSON.stringify(prev) === JSON.stringify(latest) ? prev : latest
      );
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_transactions') {
        syncTransactions();
      }
      if (!e.key || e.key === 'sabiluna_inventory') {
        syncInventory();
      }
      if (!e.key || e.key === 'sabiluna_events') {
        syncEvents();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('transactions-updated', syncTransactions);
    window.addEventListener('inventory-updated', syncInventory);
    window.addEventListener('events-updated', syncEvents);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('transactions-updated', syncTransactions);
      window.removeEventListener('inventory-updated', syncInventory);
      window.removeEventListener('events-updated', syncEvents);
    };
  }, []);

  // Save to persistence whenever state changes
  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoredInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    saveStoredEvents(events);
  }, [events]);

  // Handlers for Transactions (CRUD)
  const handleSaveTransaction = (
    data: Omit<Transaction, 'id' | 'createdAt'>,
    editId?: string
  ) => {
    if (editId) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === editId ? { ...t, ...data } : t))
      );
      showToast('Transaksi kas berhasil diperbarui!');
    } else {
      const newTrx: Transaction = {
        ...data,
        id: `TRX-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTrx, ...prev]);
      showToast('Transaksi kas baru berhasil dicatat!');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast('Transaksi kas berhasil dihapus.');
  };

  const handleDeleteMultipleTransactions = (ids: string[]) => {
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
    showToast(`${ids.length} transaksi kas berhasil dihapus.`);
  };

  // Handlers for Inventory (CRUD)
  const handleSaveInventory = (
    data: Omit<InventoryItem, 'id' | 'updatedAt'>,
    editId?: string
  ) => {
    if (editId) {
      setInventory((prev) =>
        prev.map((i) =>
          i.id === editId
            ? { ...i, ...data, updatedAt: new Date().toISOString().slice(0, 10) }
            : i
        )
      );
      showToast('Data aset / inventaris berhasil diperbarui!');
    } else {
      const newItem: InventoryItem = {
        ...data,
        id: `INV-${Date.now().toString().slice(-6)}`,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      setInventory((prev) => [newItem, ...prev]);
      showToast('Aset baru berhasil ditambahkan!');
    }
  };

  const handleDeleteInventory = (id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    showToast('Aset berhasil dihapus dari inventaris.');
  };

  const handleDeleteMultipleInventory = (ids: string[]) => {
    setInventory((prev) => prev.filter((i) => !ids.includes(i.id)));
    showToast(`${ids.length} data aset berhasil dihapus.`);
  };

  // Handlers for Events
  const handleAddEvent = (evtData: Omit<MosqueEvent, 'id'>) => {
    const newEvt: MosqueEvent = {
      ...evtData,
      id: `EVT-${Date.now().toString().slice(-4)}`,
    };
    setEvents((prev) => [newEvt, ...prev]);
    showToast('Agenda kegiatan berhasil ditambahkan!');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    showToast('Agenda kegiatan dihapus.');
  };

  // Excel Import commits
  const handleImportKas = (imported: Transaction[]) => {
    setTransactions((prev) => [...imported, ...prev]);
    showToast(`Berhasil mengimpor ${imported.length} transaksi kas dari Excel!`);
  };

  const handleImportInventory = (imported: InventoryItem[]) => {
    setInventory((prev) => [...imported, ...prev]);
    showToast(`Berhasil mengimpor ${imported.length} data inventaris dari Excel!`);
  };

  // Guard activeTab based on current role's allowed menus:
  // - sekretaris: dashboard, letters, inventory
  // - bendahara: dashboard, finance, zakat
  // - humas: dashboard, friday_kajian
  // - admin: all menus
  useEffect(() => {
    if (user && allowedMenus.length > 0 && !allowedMenus.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [user, allowedMenus, activeTab]);

  // If user is not logged in, show the dedicated 4-Role Login Page
  if (!isAuthenticated || !user) {
    return (
      <LoginPage
        onLoginSuccess={() => setActiveTab('dashboard')}
        mosqueName={mosqueProfile.name}
        mosqueProfile={mosqueProfile}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-clip">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-2xl max-w-md sm:w-auto animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="min-w-0 break-words">{toastMessage}</span>
        </div>
      )}

      {/* LEFT: Persistent Vertical Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        nextPrayer={prayerData.nextPrayer}
        hijriDate={prayerData.hijriDate}
        mosqueName={mosqueProfile.name}
      />

      {/* RIGHT: Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all">
        {/* Top Sticky Header */}
        <Header
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          nextPrayer={prayerData.nextPrayer}
          hijriDate={prayerData.hijriDate}
          onQuickAdd={() => {
            setEditingTrx(null);
            setIsTrxModalOpen(true);
          }}
          mosqueName={mosqueProfile.name}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              inventory={inventory}
              events={events}
              prayerTimes={prayerData.items}
              nextPrayer={prayerData.nextPrayer}
              hijriDate={prayerData.hijriDate}
              onNavigate={handleTabChange}
              onSelectFinanceCategory={(category, type) => {
                setFinancePresetFilter({
                  type,
                  category: category === 'Kategori Lainnya' ? 'all' : category,
                  nonce: Date.now(),
                });
                setActiveTab('finance');
              }}
              mosqueName={mosqueProfile.name}
              onOpenAddTransaction={() => {
                setEditingTrx(null);
                setIsTrxModalOpen(true);
              }}
              onOpenImport={() => {
                setImportType('kas');
                setIsImportModalOpen(true);
              }}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceView
              transactions={transactions}
              initialFilter={financePresetFilter}
              onAddTransaction={() => {
                setEditingTrx(null);
                setIsTrxModalOpen(true);
              }}
              onEditTransaction={(trx) => {
                setEditingTrx(trx);
                setIsTrxModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteMultipleTransactions={handleDeleteMultipleTransactions}
              onOpenImport={() => {
                setImportType('kas');
                setIsImportModalOpen(true);
              }}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              items={inventory}
              onAddItem={() => {
                setEditingInv(null);
                setIsInvModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingInv(item);
                setIsInvModalOpen(true);
              }}
              onDeleteItem={handleDeleteInventory}
              onDeleteMultipleItems={handleDeleteMultipleInventory}
              onOpenImport={() => {
                setImportType('inventaris');
                setIsImportModalOpen(true);
              }}
            />
          )}



          {activeTab === 'zakat' && <ZakatMustahikView />}

          {(activeTab === 'friday_kajian' || activeTab === 'schedule') && (
            <FridayKajianView />
          )}

          {activeTab === 'letters' && <LettersAdminView />}

          {activeTab === 'users' && <UserManagementView />}

          {activeTab === 'settings' && (
            <MosqueSettingsView
              currentProfile={mosqueProfile}
              onProfileLiveChange={(updated) => {
                setMosqueProfile(updated);
              }}
              onProfileUpdated={(updated) => {
                setMosqueProfile(updated);
                showToast(`Profil ${updated.name} berhasil disimpan!`);
              }}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 sm:py-5 px-4 sm:px-8 pb-safe text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <Landmark className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {mosqueProfile.footerBrandTitle ?? 'SYAMIL v2.0'}
              </span>
              {(mosqueProfile.footerBrandSubtitle ?? 'Sistem Manajemen Masjid Terpadu') && (
                <span>— {mosqueProfile.footerBrandSubtitle ?? 'Sistem Manajemen Masjid Terpadu'}</span>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* Global Modals */}
      <TransactionModal
        isOpen={isTrxModalOpen}
        onClose={() => {
          setIsTrxModalOpen(false);
          setEditingTrx(null);
        }}
        onSave={handleSaveTransaction}
        editItem={editingTrx}
        currentUser={user?.name || 'Pengurus DKM'}
      />

      <InventoryModal
        isOpen={isInvModalOpen}
        onClose={() => {
          setIsInvModalOpen(false);
          setEditingInv(null);
        }}
        onSave={handleSaveInventory}
        editItem={editingInv}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultType={importType}
        onImportKas={handleImportKas}
        onImportInventory={handleImportInventory}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MosqueAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
