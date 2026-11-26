import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Landmark,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Database,
  KeyRound,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

import { MosqueProfile } from '../types/index.ts';
import { getStoredMosqueProfile } from '../services/storage.ts';

interface LoginPageProps {
  onLoginSuccess?: () => void;
  mosqueName?: string;
  mosqueProfile?: MosqueProfile;
}

interface ArabicQuote {
  arabic: string;
  translation: string;
  source: string;
  leftCalligraphy: string;
  rightCalligraphy: string;
}

const ARABIC_QUOTES: ArabicQuote[] = [
  {
    arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ',
    translation: 'Dan dirikanlah shalat, tunaikanlah zakat, dan ruku’lah beserta orang-orang yang ruku’.',
    source: 'QS. Al-Baqarah: 43',
    leftCalligraphy: 'بِسْمِ اللَّهِ',
    rightCalligraphy: 'مَسْجِدُ نُوْرِ الْعِلْمِ',
  },
  {
    arabic: 'إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ',
    translation: 'Hanyalah yang memakmurkan masjid-masjid Allah ialah orang yang beriman kepada Allah dan hari akhir.',
    source: 'QS. At-Taubah: 18',
    leftCalligraphy: 'مَا شَاءَ اللَّهُ',
    rightCalligraphy: 'الْحَمْدُ لِلَّهِ',
  },
  {
    arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ',
    translation: 'Dan tolong-menolonglah kamu dalam kebaikan dan takwa, dan janganlah tolong-menolong dalam dosa.',
    source: 'QS. Al-Maidah: 2',
    leftCalligraphy: 'سُبْحَانَ اللَّهِ',
    rightCalligraphy: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
  },
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
    translation: 'Ingatlah kepada-Ku niscaya Aku ingat kepadamu, bersyukurlah dan janganlah kamu mengingkari-Ku.',
    source: 'QS. Al-Baqarah: 152',
    leftCalligraphy: 'اللَّهُ أَكْبَرُ',
    rightCalligraphy: 'تَبَارَكَ اللَّهُ',
  },
  {
    arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
    translation: 'Ya Tuhan kami terimalah dari kami, sungguh Engkau Maha Mendengar lagi Maha Mengetahui.',
    source: 'QS. Al-Baqarah: 127',
    leftCalligraphy: 'يَا حَيُّ يَا قَيُّومُ',
    rightCalligraphy: 'جَزَاكُمُ اللَّهُ خَيْرًا',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  mosqueName: propMosqueName,
  mosqueProfile: propMosqueProfile,
}) => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<MosqueProfile>(() => propMosqueProfile || getStoredMosqueProfile());

  // Sync profile live when prop changes or storage/custom events fire
  useEffect(() => {
    if (propMosqueProfile) {
      setProfile(propMosqueProfile);
    }
  }, [propMosqueProfile]);

  useEffect(() => {
    const syncProfile = (e: Event) => {
      if (e instanceof StorageEvent && e.key && e.key !== 'sabiluna_mosque_profile') {
        return;
      }
      const custom = e as CustomEvent<MosqueProfile>;
      if (custom.detail) {
        setProfile(custom.detail);
      } else {
        setProfile(getStoredMosqueProfile());
      }
    };
    window.addEventListener('mosque-profile-updated', syncProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener('mosque-profile-updated', syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);

  // Rotating Arabic Quotes & Calligraphy
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % ARABIC_QUOTES.length);
        setIsFading(false);
      }, 500);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const currentQuote = ARABIC_QUOTES[quoteIndex];

  // Retrieve current mosque name
  const mosqueName = React.useMemo(() => {
    if (propMosqueName && propMosqueName.trim()) {
      return propMosqueName.trim();
    }
    if (profile?.name?.trim()) {
      return profile.name.trim();
    }
    return 'Masjid Nurul Ilmi';
  }, [propMosqueName, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await login(username, password);
      if (res.success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorMsg(res.error || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat memverifikasi kredensial akun.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#050b07] text-slate-100 flex flex-col justify-between relative overflow-x-clip overflow-y-auto select-none font-sans">
      {/* Dark Emerald & Black Ambient Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#06110a] via-[#050b07] to-[#020503] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[500px] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Islamic Geometric Pattern Left (8-Point Star Mandala) */}
      <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-20">
        <svg viewBox="0 0 500 500" className="w-full h-full text-emerald-400 stroke-current fill-none stroke-[1.2]">
          <circle cx="250" cy="250" r="230" strokeDasharray="4 6" />
          <circle cx="250" cy="250" r="190" />
          <circle cx="250" cy="250" r="140" strokeDasharray="3 5" />
          <circle cx="250" cy="250" r="90" />
          {/* 8-pointed star rosette */}
          <polygon points="250,60 384,116 440,250 384,384 250,440 116,384 60,250 116,116" />
          <polygon points="250,60 440,250 250,440 60,250" />
          <polygon points="384,116 384,384 116,384 116,116" />
          {/* Geometric petals */}
          <path d="M250 60 Q300 200 440 250 Q300 300 250 440 Q200 300 60 250 Q200 200 250 60" />
          <circle cx="250" cy="250" r="40" />
        </svg>
      </div>

      {/* Islamic Geometric Pattern Right (Polygon Star Interlace) */}
      <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none opacity-15">
        <svg viewBox="0 0 500 500" className="w-full h-full text-teal-400 stroke-current fill-none stroke-[1.2]">
          <circle cx="250" cy="250" r="240" strokeDasharray="5 7" />
          <circle cx="250" cy="250" r="180" />
          <polygon points="250,70 377,123 430,250 377,377 250,430 123,377 70,250 123,123" />
          <polygon points="250,110 349,151 390,250 349,349 250,390 151,349 110,250 151,151" />
          <path d="M70 250 L430 250 M250 70 L250 430 M123 123 L377 377 M377 123 L123 377" strokeDasharray="2 4" />
          <circle cx="250" cy="250" r="60" />
        </svg>
      </div>

      {/* Background Animated Calligraphy Left */}
      <div
        className={`absolute left-8 lg:left-16 top-1/3 -translate-y-1/2 pointer-events-none select-none z-0 transition-all duration-1000 ${
          isFading ? 'opacity-0 scale-95' : 'opacity-15 scale-100'
        }`}
      >
        <span className="font-serif text-6xl sm:text-7xl lg:text-8xl font-bold tracking-widest text-emerald-400/90 drop-shadow-[0_0_35px_rgba(16,185,129,0.2)]">
          {currentQuote.leftCalligraphy}
        </span>
      </div>

      {/* Background Animated Calligraphy Right */}
      <div
        className={`absolute right-8 lg:right-16 top-1/3 -translate-y-1/2 pointer-events-none select-none z-0 transition-all duration-1000 text-right ${
          isFading ? 'opacity-0 scale-95' : 'opacity-15 scale-100'
        }`}
      >
        <span className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-widest text-teal-400/90 drop-shadow-[0_0_35px_rgba(20,184,166,0.2)]">
          {currentQuote.rightCalligraphy}
        </span>
      </div>

      {/* Top Floating Islamic Ayah Pill */}
      <header className="pt-5 sm:pt-8 pb-3 sm:pb-4 px-3 sm:px-4 flex justify-center relative z-20">
        <div className="flex flex-col items-center gap-1.5 max-w-full">
          <div className="text-amber-400/80 text-xs tracking-widest">
            ۞
          </div>
          <div
            className={`inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl sm:rounded-full bg-[#08150d]/85 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium shadow-xl shadow-black/40 backdrop-blur-md transition-all duration-700 max-w-full sm:max-w-xl text-center ${
              isFading ? 'opacity-40 -translate-y-0.5' : 'opacity-100 translate-y-0'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="font-serif text-sm sm:text-base tracking-wide leading-relaxed break-words" dir="rtl">
              {currentQuote.arabic}
            </span>
          </div>
        </div>
      </header>

      {/* Main 2-Column Login Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-3 sm:py-4 relative z-10 max-w-4xl mx-auto w-full">
        <div className="w-full bg-[#0c1611]/95 border border-emerald-900/40 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Kolom Kiri: Identitas SYAMIL */}
          <div className="md:col-span-5 p-5 sm:p-8 lg:p-9 flex flex-col justify-between border-b md:border-b-0 md:border-r border-emerald-950/80 bg-[#08130e]/80">
            <div>
              {/* Badge SYAMIL */}
              {(profile.portalBadge ?? 'SYAMIL · Sistem Manajemen Masjid Terpadu') && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-semibold mb-3 sm:mb-4 shadow-sm max-w-full">
                  <Landmark className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="break-words">{profile.portalBadge ?? 'SYAMIL · Sistem Manajemen Masjid Terpadu'}</span>
                </div>
              )}

              {/* Nama Masjid */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight mb-2 sm:mb-2.5 break-words">
                {mosqueName}
              </h2>

              {/* Deskripsi Singkat */}
              {(profile.portalDescription ?? 'Platform terpadu untuk mengelola administrasi, keuangan, aset, dan kegiatan masjid.') && (
                <p className="text-xs text-slate-400 leading-relaxed mb-4 sm:mb-7 md:max-w-xs break-words">
                  {profile.portalDescription ?? 'Platform terpadu untuk mengelola administrasi, keuangan, aset, dan kegiatan masjid.'}
                </p>
              )}

              {/* 3 Keunggulan Sistem */}
              <div className="space-y-3 sm:space-y-4">
                {/* 1. RBAC */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">
                      {profile.portalFeature1Title ?? 'Hak Akses Berbasis Peran (RBAC)'}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {profile.portalFeature1Desc ?? 'Pemisahan wewenang Admin, Sekretaris, Bendahara, dan Humas.'}
                    </p>
                  </div>
                </div>

                {/* 2. Keamanan & Enkripsi */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">
                      {profile.portalFeature2Title ?? 'Keamanan & Enkripsi Data'}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {profile.portalFeature2Desc ?? 'Pencegahan SQL Injection, password hash bcrypt, dan audit trail log.'}
                    </p>
                  </div>
                </div>

                {/* 3. Token JWT */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">
                      {profile.portalFeature3Title ?? 'Autentikasi Token JWT HS256'}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {profile.portalFeature3Desc ?? 'Sesi aman terenkripsi dengan proteksi logout menyeluruh.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Form Login */}
          <div className="md:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-center bg-[#0c1611]/60">
            {/* Header Form */}
            <div className="mb-5 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Masuk ke Portal Pengurus
              </h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Silakan masukkan akun dan kata sandi Anda untuk mengakses dashboard manajemen masjid.
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold text-xs">
                  Username atau Email Resmi <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Masukkan username (contoh: admin, bendahara)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-[#070e0a]/90 text-white placeholder-slate-500 text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold text-xs">
                  Kata Sandi (Password) <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 bg-[#070e0a]/90 text-white placeholder-slate-500 text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Help / Support Notice */}
            <p className="text-[11px] text-slate-500 text-center mt-6 leading-relaxed">
              Jika mengalami kendala saat masuk akun, silakan hubungi{' '}
              {(profile.adminPhone?.trim() || profile.phone?.trim()) && (
                <>
                  <strong className="text-emerald-400 font-semibold font-mono select-text">
                    {profile.adminPhone?.trim() || profile.phone?.trim()}
                  </strong>{' '}
                </>
              )}
              <strong className="text-slate-400 font-semibold">Administrator DKM</strong>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 px-4 sm:px-6 pb-safe text-[11px] text-slate-500 relative z-10 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 max-w-6xl mx-auto w-full">
        <div className="text-slate-500 text-center md:text-left">
          {profile.loginFooterCenter?.trim()
            ? profile.loginFooterCenter
            : `${mosqueName} © 2026${
                (profile.footerBrandSubtitle ?? 'SYAMIL (Sistem Manajemen Terpadu Masjid)')
                  ? ` · ${profile.footerBrandSubtitle ?? 'SYAMIL (Sistem Manajemen Terpadu Masjid)'}`
                  : ''
              }`}
        </div>
        <div className="text-emerald-400/80 italic text-center md:text-right">
          "{currentQuote.translation}"
        </div>
      </footer>
    </div>
  );
};
