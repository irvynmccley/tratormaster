import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Plus, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CategoryItem } from '../../types';
import { createCategory, deleteCategory } from '../../lib/pocketbase';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onCategoriesChange: (categories: CategoryItem[]) => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChange
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('Esta categoria/marca já está cadastrada.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await createCategory(name);
      onCategoriesChange([...categories, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
      setSuccessMsg(`Categoria "${name}" cadastrada com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      console.error('Erro ao criar categoria:', err);
      setError(err.message || 'Erro ao cadastrar categoria.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteCategory(id);
      onCategoriesChange(categories.filter(c => c.id !== id));
      setSuccessMsg(`Categoria "${name}" removida.`);
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      console.error('Erro ao deletar categoria:', err);
      setError(err.message || 'Erro ao remover categoria.');
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
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                Cadastrar Categoria (Marca)
              </h3>
              <p className="text-xs text-zinc-400">
                Gerencie as marcas e linhas de atuação comercial
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

          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="flex gap-2 mb-6 shrink-0">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ex: Peças & Serviços"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !newCategoryName.trim()}
              className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-yellow-400/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>Adicionar</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Categorias Cadastradas ({categories.length})
            </p>
            {categories.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">Nenhuma categoria cadastrada.</p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-colors"
                >
                  <span className="text-sm font-bold text-zinc-200">{category.name}</span>
                  {!category.id.startsWith('default-') ? (
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      disabled={isLoading}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Excluir categoria"
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
