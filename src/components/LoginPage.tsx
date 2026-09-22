import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { authService } from '../lib/pocketbase';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor, informe seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.login(email.trim(), password);
      setIsLoading(false);
      onLoginSuccess();
    } catch (err: any) {
      setIsLoading(false);
      console.error('Falha no login:', err);
      if (err.status === 400) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (err.status === 0 || err.message?.includes('fetch')) {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão à internet.');
      } else {
        setError(err.message || 'Ocorreu um erro ao validar seu acesso.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-yellow-400 selection:text-black">
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-500/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-400/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Login Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Top Card / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-400 rounded-2xl shadow-xl shadow-yellow-400/20 mb-4">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-yellow-400 font-black text-xl">
              TM
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-wider uppercase flex items-center justify-center gap-2">
            TRATORMASTER
          </h1>
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mt-1">
            SEMPRE PERTO DE VOCÊ • JCB
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          {/* Subtle Top Yellow Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />

          <div className="mb-6">
            <h2 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
              <ShieldCheck size={20} className="text-yellow-400" />
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Informe suas credenciais para acessar o painel de gestão comercial.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-3.5 mb-6 text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gestor@tratormaster.com.br"
                  required
                  autoFocus
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full pl-11 pr-12 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-yellow-400/25 hover:shadow-yellow-400/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-black" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note inside card */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PocketBase Seguro
            </span>
            <span>TratorMaster v2.0</span>
          </div>
        </div>

        {/* Security watermark */}
        <p className="text-center text-zinc-600 text-xs mt-6 flex items-center justify-center gap-1">
          <Sparkles size={12} className="text-yellow-500/70" />
          Acesso restrito à equipe autorizada TratorMaster
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
