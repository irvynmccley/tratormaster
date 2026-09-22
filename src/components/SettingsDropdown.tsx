import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  KeyRound,
  Wrench,
  Tag,
  UserPlus,
  LogOut,
  ChevronDown
} from 'lucide-react';

interface SettingsDropdownProps {
  onOpenChangePassword: () => void;
  onOpenManageProducts: () => void;
  onOpenManageCategories: () => void;
  onOpenManageSellers: () => void;
  onLogout: () => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  onOpenChangePassword,
  onOpenManageProducts,
  onOpenManageCategories,
  onOpenManageSellers,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Gear Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 p-2 rounded-xl transition-all border cursor-pointer ${
          isOpen
            ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20'
            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
        }`}
        title="Configurações e Cadastros"
      >
        <Settings size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 origin-top-right bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-zinc-800"
          >
            {/* Header / Title */}
            <div className="px-4 py-2.5 bg-zinc-950/60">
              <p className="text-[10px] font-black uppercase tracking-wider text-yellow-400">
                Menu de Gestão
              </p>
              <p className="text-xs text-zinc-400">Cadastros e Segurança</p>
            </div>

            {/* Cadastros Section */}
            <div className="p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenManageProducts();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="p-1 rounded-lg bg-yellow-400/10 text-yellow-400">
                  <Wrench size={15} />
                </div>
                <span>Cadastrar Produto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenManageCategories();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="p-1 rounded-lg bg-yellow-400/10 text-yellow-400">
                  <Tag size={15} />
                </div>
                <span>Cadastrar Categoria</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenManageSellers();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="p-1 rounded-lg bg-yellow-400/10 text-yellow-400">
                  <UserPlus size={15} />
                </div>
                <span>Cadastrar Vendedor</span>
              </button>
            </div>

            {/* Security Section */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenChangePassword();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="p-1 rounded-lg bg-zinc-800 text-zinc-300">
                  <KeyRound size={15} />
                </div>
                <span>Alterar Senha</span>
              </button>
            </div>

            {/* Logout Section */}
            <div className="p-1.5 bg-zinc-950/40">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="p-1 rounded-lg bg-red-950/50 text-red-400">
                  <LogOut size={15} />
                </div>
                <span>Sair</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsDropdown;
