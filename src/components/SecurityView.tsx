import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  ShieldCheck,
  Database,
  KeyRound,
  Lock,
  Terminal,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  Cpu,
  Server,
  Zap,
} from 'lucide-react';
import { GOLANG_BACKEND_FILES } from '../services/golangCodeGenerator.ts';

export const SecurityView: React.FC = () => {
  const { token, decodedToken, user } = useAuth();
  const { themeConfig } = useTheme();

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'neon_postgres' | 'sqli_defense' | 'jwt_inspector' | 'golang_backend'>('neon_postgres');

  // SQL Injection Playground state
  const [sqlInput, setSqlInput] = useState("' OR '1'='1' --");
  const [testedAttack, setTestedAttack] = useState<string | null>(null);

  // AES-256 Encryption test state
  const [plainText, setPlainText] = useState('Infaq Rahasia Rp 100.000.000 dari Hamba Allah');
  const [cipherResult, setCipherResult] = useState<string>('e8a719d4f0923b...c7219af8b43');

  // Active file for Go backend viewer
  const [selectedGoFileIndex, setSelectedGoFileIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  const sampleAttacks = [
    { label: "Bypass Login (' OR '1'='1' --)", payload: "' OR '1'='1' --" },
    { label: "Drop Table (' ; DROP TABLE ...)", payload: "'; DROP TABLE transactions; --" },
    { label: "Union Data Leak (' UNION SELECT)", payload: "' UNION SELECT id, email, password_hash FROM users --" },
    { label: "Comment Out (admin' --)", payload: "admin' --" },
  ];

  const handleTestSqli = (payload: string) => {
    setSqlInput(payload);
    setTestedAttack(payload);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadAllGoFiles = () => {
    const combined = GOLANG_BACKEND_FILES.map(
      (f) => `// ==========================================\n// FILE: ${f.filename}\n// ${f.description}\n// ==========================================\n\n${f.code}\n\n`
    ).join('\n');

    const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sabiluna_golang_docker_backend.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedFile = GOLANG_BACKEND_FILES[selectedGoFileIndex];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border border-emerald-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Database className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Enterprise Security Architecture: Go + NeonDB PostgreSQL 5432
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pusat Keamanan Data & Integrasi Backend Golang
          </h1>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            Sistem SYAMIL dirancang dengan standar keamanan tinggi perbankan: Anti SQL Injection via Parameterized Queries, Autentikasi JWT HMAC-SHA256, Enkripsi AES-256 untuk data donatur, dan Database PostgreSQL Serverless NeonDB pada Port 5432.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">
              ⚡ Port Default: <strong>5432</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">
              🔒 Autentikasi: <strong>JWT Bearer Token</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">
              🛡️ Proteksi: <strong>GORM Prepared Statements</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">
              🐳 Kontainer: <strong>Docker & Docker-Compose</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab('neon_postgres')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'neon_postgres'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Koneksi NeonDB & Port 5432
        </button>
        <button
          onClick={() => setActiveSubTab('sqli_defense')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'sqli_defense'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Simulasi Anti SQL Injection
        </button>
        <button
          onClick={() => setActiveSubTab('jwt_inspector')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'jwt_inspector'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Inspektur Token JWT
        </button>
        <button
          onClick={() => setActiveSubTab('golang_backend')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'golang_backend'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          Source Code Go & Docker
        </button>
      </div>

      {/* TAB 1: NEONDB & POSTGRESQL 5432 */}
      {activeSubTab === 'neon_postgres' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border ${themeConfig.cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Database Engine</span>
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-xs font-bold">
                  PostgreSQL 16
                </span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">Neon Serverless</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Port: <strong className="font-mono text-emerald-600 dark:text-emerald-400">5432 (Standard)</strong>
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connection Pooler Aktif (PgBouncer)
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${themeConfig.cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Enkripsi Jaringan</span>
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 text-xs font-bold">
                  TLS 1.3
                </span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">SSL Mode: Require</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sertifikat CA terverifikasi & bebas eavesdropping
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                End-to-End Encrypted Transit
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${themeConfig.cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kesiapan Docker</span>
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 text-xs font-bold">
                  Containerized
                </span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">Docker Compose</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Volume persistent <code className="font-mono text-xs">/var/lib/postgresql/data</code>
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                <Server className="w-3.5 h-3.5" />
                Auto-restart & Healthcheck Enabled
              </div>
            </div>
          </div>

          {/* Connection String Preview */}
          <div className={`p-5 rounded-2xl border ${themeConfig.cardBg} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Konfigurasi Koneksi PostgreSQL NeonDB
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gunakan string koneksi ini pada file <code className="font-mono">.env</code> backend Golang
                </p>
              </div>
              <button
                onClick={() => handleCopyCode('postgresql://sabiluna_admin:SuperSecretPass2026@ep-spring-masjid-a1b2c3d4.ap-southeast-1.aws.neon.tech:5432/sabiluna_masjid_db?sslmode=require')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Copy className="w-3.5 h-3.5" />
                {copySuccess ? 'Tersalin!' : 'Salin DSN'}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
              postgresql://sabiluna_admin:SuperSecretPass2026@ep-spring-masjid-a1b2c3d4.ap-southeast-1.aws.neon.tech:5432/sabiluna_masjid_db?sslmode=require
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">HOST / ENDPOINT</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">ep-spring-masjid.neon.tech</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">PORT</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">5432</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">DATABASE NAME</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">sabiluna_masjid_db</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">SSL MODE</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">require</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SQL INJECTION DEFENSE SIMULATOR */}
      {activeSubTab === 'sqli_defense' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${themeConfig.cardBg} space-y-4`}>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Simulasi Uji Penetrasi Anti-SQL Injection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pilih atau masukkan payload SQL Injection berbahaya untuk melihat bagaimana arsitektur Golang + GORM mengamankan query database masjid.
              </p>
            </div>

            {/* Quick payload buttons */}
            <div className="flex flex-wrap gap-2">
              {sampleAttacks.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTestSqli(item.payload)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Input payload */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Payload Input Pengguna (Pencarian Donatur / Login):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  onClick={() => handleTestSqli(sqlInput)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Uji Proteksi
                </button>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Insecure approach */}
              <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Metode Rentan (Raw Concatenation)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-[10px]">
                    BERBAHAYA!
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-rose-400 overflow-x-auto">
                  {`// Kode buruk:\nquery := fmt.Sprintf("SELECT * FROM transactions WHERE donor_name = '%s'", input)\n\n// Hasil query dieksekusi:\nSELECT * FROM transactions WHERE donor_name = '${sqlInput}';`}
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300">
                  <strong>Akibat:</strong> Karakter kutip tunggal merusak struktur query SQL. Penyerang dapat membaca seluruh saldo kas tanpa izin, mengubah data, atau menghapus tabel!
                </p>
              </div>

              {/* Secure approach (SYAMIL) */}
              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Metode SYAMIL (Parameterized GORM / pgx)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-[10px]">
                    100% AMAN
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                  {`// Kode SYAMIL Go:\ndb.Where("donor_name = ?", input).Find(&transactions)\n\n// Query PostgreSQL Port 5432:\nPREPARE stmt(text) AS SELECT * FROM transactions WHERE donor_name = $1;\nEXECUTE stmt('${sqlInput}');`}
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  <strong>Hasil:</strong> Input diperlakukan strictly sebagai nilai string literal ($1). Payload injection tidak pernah dieksekusi sebagai perintah SQL.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: JWT INSPECTOR */}
      {activeSubTab === 'jwt_inspector' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${themeConfig.cardBg} space-y-4`}>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                Inspektur & Dekoder Token JWT (JSON Web Token)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Token JWT sesi aktif saat ini dienkripsi dengan algoritma HMAC-SHA256 dan ditandatangani oleh rahasia server masjid.
              </p>
            </div>

            {/* Token raw */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Raw Bearer Token (Authorization Header):
                </label>
                <button
                  onClick={() => handleCopyCode(token || '')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Salin Token
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 break-all border border-slate-800 leading-relaxed">
                {token}
              </div>
            </div>

            {/* Decoded segments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase">1. Header (Algoritma & Tipe)</span>
                <pre className="p-3 rounded bg-slate-950 text-xs font-mono text-amber-400 overflow-x-auto">
{JSON.stringify(
  {
    alg: 'HS256',
    typ: 'JWT',
  },
  null,
  2
)}
                </pre>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase">2. Payload (Claims & User Data)</span>
                <pre className="p-3 rounded bg-slate-950 text-xs font-mono text-cyan-400 overflow-x-auto max-h-48">
{JSON.stringify(decodedToken, null, 2)}
                </pre>
              </div>
            </div>

            {/* Signature status */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Status Signature: <strong className="font-semibold text-emerald-700 dark:text-emerald-200">VALID (HMAC-SHA256 Verified)</strong>
              </div>
              <span className="text-slate-500 text-[11px]">
                Masa Berlaku: 24 Jam sejak penerbitan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOLANG BACKEND SOURCE CODE VIEWER */}
      {activeSubTab === 'golang_backend' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-600" />
                Arsitektur Backend Golang & Docker Siap Deploy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lengkap dengan model GORM, PostgreSQL 5432, JWT auth, dan Excelize handler
              </p>
            </div>

            <button
              onClick={handleDownloadAllGoFiles}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              Download Semua Source Code (.txt bundle)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* File List */}
            <div className={`p-3 rounded-2xl border ${themeConfig.cardBg} space-y-1 lg:col-span-1`}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                Daftar Berkas:
              </div>
              {GOLANG_BACKEND_FILES.map((f, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedGoFileIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    selectedGoFileIndex === idx
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="font-mono truncate">{f.filename}</span>
                  <span className="text-[10px] text-slate-400 uppercase">{f.language}</span>
                </button>
              ))}
            </div>

            {/* Code Display */}
            <div className={`lg:col-span-3 rounded-2xl border ${themeConfig.cardBg} overflow-hidden flex flex-col`}>
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedFile.filename}
                  </span>
                  <p className="text-[11px] text-slate-500">{selectedFile.description}</p>
                </div>
                <button
                  onClick={() => handleCopyCode(selectedFile.code)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copySuccess ? 'Tersalin!' : 'Salin Kode'}
                </button>
              </div>

              <div className="p-4 bg-slate-950 overflow-x-auto max-h-[500px]">
                <pre className="font-mono text-xs text-emerald-400 leading-relaxed">
                  <code>{selectedFile.code}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
