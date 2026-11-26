import { User, Role, JWTPayload } from '../types/index.ts';

export interface RoleAccount {
  username: string;
  email: string;
  password: string;
  user: User;
  allowedMenus: string[];
  description: string;
  duties: string;
}

export const ROLE_ACCOUNTS: RoleAccount[] = [
  {
    username: 'admin',
    email: 'admin@masjid.id',
    password: 'admin789',
    user: {
      id: 'usr-admin',
      name: 'Drs. KH. Ahmad Muzammil',
      email: 'admin@masjid.id',
      role: 'admin',
      roleLabel: 'Admin (Ketua DKM)',
      phone: '081122334455',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    allowedMenus: ['dashboard', 'users', 'letters', 'inventory', 'finance', 'zakat', 'friday_kajian', 'settings'],
    description: 'Mengelola akun, hak akses, pengaturan, dan keseluruhan sistem.',
    duties: 'Administrator & Pengambil Kebijakan Masjid',
  },
  {
    username: 'sekretaris',
    email: 'sekretaris@masjid.id',
    password: 'sekre123',
    user: {
      id: 'usr-sekre',
      name: 'Ust. Farhan Basalamah, S.Kom',
      email: 'sekretaris@masjid.id',
      role: 'sekretaris',
      roleLabel: 'Sekretaris DKM',
      phone: '081344556677',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    allowedMenus: ['dashboard', 'letters', 'inventory'],
    description: 'Mengelola surat masuk, surat keluar, inventaris, dan administrasi masjid.',
    duties: 'Surat Menyurat & Tata Usaha Sarana Aset',
  },
  {
    username: 'bendahara',
    email: 'bendahara@masjid.id',
    password: 'hara123',
    user: {
      id: 'usr-bendahara',
      name: 'H. Ahmad Sobari, SE, Ak.',
      email: 'bendahara@masjid.id',
      role: 'bendahara',
      roleLabel: 'Bendahara Keuangan',
      phone: '081233445566',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    allowedMenus: ['dashboard', 'finance', 'zakat'],
    description: 'Mengelola pemasukan, pengeluaran, saldo kas, dan laporan keuangan.',
    duties: 'Pengelola Buku Kas & Penerimaan Zakat/Infaq',
  },
  {
    username: 'humas',
    email: 'humas@masjid.id',
    password: 'humas123',
    user: {
      id: 'usr-humas',
      name: 'Ust. M. Ridwan Al-Fatih',
      email: 'humas@masjid.id',
      role: 'humas',
      roleLabel: 'Humas & Syiar Dakwah',
      phone: '085677889900',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    },
    allowedMenus: ['dashboard', 'friday_kajian'],
    description: 'Mengelola informasi, pengumuman, kegiatan, dan komunikasi masjid.',
    duties: 'Koordinator Roster Khutbah & Kajian Masjid',
  },
];

export const DEMO_USERS: User[] = ROLE_ACCOUNTS.map((a) => a.user);

const AUTH_STORAGE_KEY = 'sabiluna_jwt_session';

// Helper to base64url encode
const base64UrlEncode = (str: string): string => {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const base64UrlDecode = (str: string): string => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return decodeURIComponent(escape(atob(str)));
};

/**
 * Generate a realistic JWT token with standard Header, Payload, and Signature
 */
export const generateJWT = (user: User): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
    iss: 'sabiluna-auth-service',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  // Simulated HMAC-SHA256 signature
  const fakeSecret = 'sabiluna-super-secure-jwt-secret-2026';
  const rawSig = `${encodedHeader}.${encodedPayload}.${fakeSecret}`;
  const encodedSignature = base64UrlEncode(rawSig).substring(0, 43);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

export const decodeJWT = (token: string): { header: any; payload: JWTPayload | null; valid: boolean } => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { header: null, payload: null, valid: false };
    }
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload: JWTPayload = JSON.parse(base64UrlDecode(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    const valid = payload.exp > now;
    return { header, payload, valid };
  } catch {
    return { header: null, payload: null, valid: false };
  }
};

export interface SessionData {
  token: string;
  user: User;
  issuedAt: number;
}

export const getStoredSession = (): SessionData | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session: SessionData = JSON.parse(raw);
    const { valid } = decodeJWT(session.token);
    if (!valid) {
      // Refresh token if expired
      session.token = generateJWT(session.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    return null;
  }
};

export const saveSession = (user: User): SessionData => {
  const token = generateJWT(user);
  const session: SessionData = {
    token,
    user,
    issuedAt: Date.now(),
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
};

export const clearSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const USER_PASSWORDS_KEY = 'sabiluna_user_passwords';
const MANAGED_USERS_KEY = 'sabiluna_managed_users';

export const saveManagedUserPassword = (email: string, password: string) => {
  if (!email.trim() || !password.trim()) return;
  try {
    const raw = localStorage.getItem(USER_PASSWORDS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[email.trim().toLowerCase()] = password.trim();
    localStorage.setItem(USER_PASSWORDS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
};

export const authenticateUser = (
  identifier: string,
  pass: string
): { success: boolean; user?: User; error?: string } => {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanId) {
    return { success: false, error: 'Silakan masukkan username atau email.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Silakan masukkan password akun.' };
  }

  // 1. Check built-in 4 official role accounts (by username or email)
  const officialAccount = ROLE_ACCOUNTS.find(
    (acc) =>
      acc.username.toLowerCase() === cleanId ||
      acc.email.toLowerCase() === cleanId
  );

  // Sync latest name/role from managed users if customized by Admin
  let managedUsers: User[] = [];
  try {
    const rawUsers = localStorage.getItem(MANAGED_USERS_KEY);
    if (rawUsers) managedUsers = JSON.parse(rawUsers);
  } catch {
    managedUsers = [];
  }

  if (officialAccount) {
    let customPasswords: Record<string, string> = {};
    try {
      const rawPw = localStorage.getItem(USER_PASSWORDS_KEY);
      if (rawPw) customPasswords = JSON.parse(rawPw);
    } catch {
      customPasswords = {};
    }
    const expectedPass = customPasswords[officialAccount.email.toLowerCase()] || officialAccount.password;
    if (expectedPass !== cleanPass) {
      return {
        success: false,
        error: `Password salah untuk akun ${officialAccount.user.roleLabel}. Silakan cek kembali password Anda.`,
      };
    }
    const updatedUser = managedUsers.find((u) => u.id === officialAccount.user.id) || officialAccount.user;
    return { success: true, user: updatedUser };
  }

  // 2. Check custom users added via Manajemen Pengguna
  const managedUser = managedUsers.find((u) => u.email.toLowerCase() === cleanId);
  if (managedUser) {
    let customPasswords: Record<string, string> = {};
    try {
      const rawPw = localStorage.getItem(USER_PASSWORDS_KEY);
      if (rawPw) customPasswords = JSON.parse(rawPw);
    } catch {
      customPasswords = {};
    }
    const expectedPass = customPasswords[managedUser.email.toLowerCase()];
    if (expectedPass && expectedPass !== cleanPass) {
      return {
        success: false,
        error: `Password salah untuk akun ${managedUser.name}. Silakan cek kembali password Anda.`,
      };
    }
    if (!expectedPass && cleanPass.length < 4) {
      return {
        success: false,
        error: `Password salah untuk akun ${managedUser.name} (minimal 4 karakter).`,
      };
    }
    return { success: true, user: managedUser };
  }

  return {
    success: false,
    error: `Username atau email "${identifier}" tidak terdaftar. Gunakan role: admin, sekretaris, bendahara, atau humas.`,
  };
};

export const getAllowedMenusForRole = (role: Role): string[] => {
  if (role === 'admin' || role === 'super_admin') {
    return [
      'dashboard',
      'users',
      'letters',
      'inventory',
      'finance',
      'zakat',
      'friday_kajian',
      'settings',
    ];
  }
  if (role === 'sekretaris') {
    return ['dashboard', 'letters', 'inventory'];
  }
  if (role === 'bendahara') {
    return ['dashboard', 'finance', 'zakat'];
  }
  if (role === 'humas') {
    return ['dashboard', 'friday_kajian'];
  }
  if (role === 'marbot') {
    return ['dashboard', 'inventory'];
  }
  return ['dashboard'];
};

export const hasPermission = (
  userRole: Role,
  action: 'create' | 'edit' | 'delete' | 'export' | 'import' | 'security_view'
): boolean => {
  if (userRole === 'admin' || userRole === 'super_admin') return true;
  if (userRole === 'bendahara') {
    return action !== 'security_view';
  }
  if (userRole === 'sekretaris') {
    return action !== 'security_view';
  }
  if (userRole === 'humas') {
    return action === 'create' || action === 'edit' || action === 'delete' || action === 'export';
  }
  if (userRole === 'marbot') {
    return action === 'create' || action === 'edit' || action === 'delete' || action === 'export' || action === 'import';
  }
  return false;
};
