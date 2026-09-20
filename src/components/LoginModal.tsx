import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, X, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { authService } from '../lib/pocketbase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Acesso de Gestor',
  message = 'Identifique-se para gerenciar vendas, metas, comissões e configurações.'
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.login(email.trim(), password);
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      console.error('Falha de autenticação:', err);
      if (err.status === 400) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (err.status === 0 || err.message?.includes('fetch')) {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
      } else {
        setError(err.message || 'Ocorreu um erro ao tentar autenticar.');
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl"
        >
          {/* Top Yellow Accent Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            title="Fechar"
            disabled={isLoading}
          >
            <X size={20} />
          </button>

          <div className="p-8">
            {/* Header / Brand Icon */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-wide uppercase">
                  {title}
                </h2>
                <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest">
                  TratorMaster • JCB
                </span>
              </div>
            </div>

            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              {message}
            </p>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-3.5 mb-6 text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  E-mail de Acesso
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
                    placeholder="seu.email@tratormaster.com.br"
                    required
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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
                  className="w-full py-3.5 px-4 bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Validando acesso...</span>
                    </>
                  ) : (
                    <span>Entrar no Sistema</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default LoginModal;
