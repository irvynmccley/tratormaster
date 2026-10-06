import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Plus, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PaymentConditionItem } from '../../types';
import { createPaymentCondition, deletePaymentCondition } from '../../lib/pocketbase';

interface ManageConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conditions: PaymentConditionItem[];
  onConditionsChange: (conditions: PaymentConditionItem[]) => void;
}

export const ManageConditionsModal: React.FC<ManageConditionsModalProps> = ({
  isOpen,
  onClose,
  conditions,
  onConditionsChange
}) => {
  const [newConditionName, setNewConditionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newConditionName.trim();
    if (!name) return;

    if (conditions.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('Esta condição de pagamento já está cadastrada.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await createPaymentCondition(name);
      onConditionsChange([...conditions, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewConditionName('');
      setSuccessMsg(`"${name}" cadastrada com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      console.error('Erro ao criar condição de pagamento:', err);
      setError(err.message || 'Erro ao cadastrar condição de pagamento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a condição de pagamento "${name}"?`)) return;

    setIsLoading(true);
    setError(null);

    try {
      await deletePaymentCondition(id);
      onConditionsChange(conditions.filter(c => c.id !== id));
      setSuccessMsg(`"${name}" removida.`);
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      console.error('Erro ao deletar condição de pagamento:', err);
      setError(err.message || 'Erro ao remover condição de pagamento.');
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
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                Cadastrar Condição de Pagamento
              </h3>
              <p className="text-xs text-zinc-400">
                Gerencie as opções disponíveis no formulário de venda
              </p>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-semibold">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="mb-6 flex gap-2">
            <input
              type="text"
              placeholder="Ex: Financiamento - Banco do Brasil"
              value={newConditionName}
              onChange={(e) => setNewConditionName(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-yellow-400/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !newConditionName.trim()}
              className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={3} />}
              <span>Adicionar</span>
            </button>
          </form>

          {/* List header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Condições Cadastradas
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 font-bold px-2 py-0.5 rounded-full">
              {conditions.length}
            </span>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {conditions.length === 0 ? (
              <p className="text-center py-8 text-xs text-zinc-500 italic">
                Nenhuma condição de pagamento cadastrada.
              </p>
            ) : (
              conditions.map((condition) => (
                <div
                  key={condition.id}
                  className="flex items-center justify-between p-3 bg-zinc-950/60 hover:bg-zinc-800/40 border border-zinc-800/80 rounded-xl transition-colors group"
                >
                  <span className="text-xs font-semibold text-zinc-200">
                    {condition.name}
                  </span>
                  <button
                    onClick={() => handleDelete(condition.id, condition.name)}
                    disabled={isLoading}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                    title={`Excluir ${condition.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
