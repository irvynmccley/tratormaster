import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, Plus, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SellerItem } from '../../types';
import { createSeller, deleteSeller } from '../../lib/pocketbase';

interface ManageSellersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: SellerItem[];
  onSellersChange: (sellers: SellerItem[]) => void;
}

export const ManageSellersModal: React.FC<ManageSellersModalProps> = ({
  isOpen,
  onClose,
  sellers,
  onSellersChange
}) => {
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSellerName.trim();
    if (!name) return;

    if (sellers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setError('Este vendedor já está cadastrado.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await createSeller(name, newSellerEmail);
      onSellersChange([...sellers, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSellerName('');
      setNewSellerEmail('');
      setSuccessMsg(`Vendedor "${name}" cadastrado com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      console.error('Erro ao criar vendedor:', err);
      setError(err.message || 'Erro ao cadastrar vendedor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o vendedor "${name}"?`)) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteSeller(id);
      onSellersChange(sellers.filter(s => s.id !== id));
      setSuccessMsg(`Vendedor "${name}" removido.`);
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      console.error('Erro ao deletar vendedor:', err);
      setError(err.message || 'Erro ao remover vendedor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh]"
        >
          {/* Top Yellow Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-400" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                Cadastrar Vendedor (Consultor)
              </h3>
              <p className="text-xs text-zinc-400">
                Gerencie a equipe de consultores de vendas
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-4 text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl shrink-0">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 mb-4 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-xl font-bold shrink-0">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Seller Form */}
          <form onSubmit={handleAdd} className="space-y-2 mb-6 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={newSellerName}
                onChange={(e) => setNewSellerName(e.target.value)}
                placeholder="Nome do consultor *"
                required
                disabled={isLoading}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition-colors disabled:opacity-50"
              />
              <input
                type="email"
                value={newSellerEmail}
                onChange={(e) => setNewSellerEmail(e.target.value)}
                placeholder="E-mail (opcional)"
                disabled={isLoading}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition-colors disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !newSellerName.trim()}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-yellow-400/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>Cadastrar Novo Vendedor</span>
            </button>
          </form>

          {/* Sellers List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Vendedores Cadastrados ({sellers.length})
            </p>
            {sellers.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">Nenhum vendedor cadastrado.</p>
            ) : (
              sellers.map((seller) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-colors"
                >
                  <div>
                    <span className="text-sm font-bold text-zinc-200 block">{seller.name}</span>
                    {seller.email && (
                      <span className="text-xs text-zinc-500 block">{seller.email}</span>
                    )}
                  </div>
                  {!seller.id.startsWith('default-') ? (
                    <button
                      onClick={() => handleDelete(seller.id, seller.name)}
                      disabled={isLoading}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Excluir vendedor"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold px-2 py-0.5 bg-zinc-800/50 rounded">
                      Padrão
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
