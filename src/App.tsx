/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Trophy, 
  Target, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package,
  Trash2,
  ChevronRight,
  Share2,
  Edit2,
  Wrench,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  Calendar,
  Award,
  BarChart3,
  X,
  AlertCircle,
  Search,
  CheckCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList,
  ComposedChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toBlob, toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { supabase } from './lib/supabase';
import { Sale, Goal, CompanyGoal, Seller, Equipment, Condition, Marca, Kit, TipoCota } from './types';
import { EQUIPMENTS, SELLERS, CONDITIONS, INITIAL_GOALS, INITIAL_COMPANY_GOALS, MARCAS } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COMMISSION_RATE = 0.015; // 1.5%

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  const dateStrOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = dateStrOnly.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const CustomConsorcioTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-2xl shadow-xl border border-zinc-100 space-y-2 min-w-[200px]">
        <p className="font-bold text-sm text-zinc-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <span style={{ color: entry.color }} className="font-bold">{entry.name}</span>
            <span className="font-black text-zinc-900">{entry.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 text-xs pt-2 border-t border-zinc-100">
          <span className="font-bold text-zinc-500">Valor Vendido</span>
          <span className="font-black text-yellow-500">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valorVendido)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendas' | 'metas' | 'kits' | 'comissao' | 'comissao-recebida'>('dashboard');
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('trator_sales');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('trator_goals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_GOALS; }
    }
    return INITIAL_GOALS;
  });
  const [companyGoals, setCompanyGoals] = useState<CompanyGoal[]>(() => {
    const saved = localStorage.getItem('trator_company_goals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_COMPANY_GOALS; }
    }
    return INITIAL_COMPANY_GOALS;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'local' | 'error'>('local');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not configured. Using local storage as fallback.');
      setConnectionStatus('local');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setConnectionStatus('connected');
        // Fetch Sales
        try {
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .order('data', { ascending: false });
            
          if (salesError) {
            console.warn('Error fetching sales, falling back to local storage:', salesError);
            // If sales fail, we continue with local storage
            if (salesError.code === 'PGRST116' || salesError.message?.includes('does not exist')) {
              setErrorMessage('Atenção: Tabela "sales" não encontrada. Usando dados locais.');
            }
            setConnectionStatus('local');
          } else if (salesData) {
            const formattedSales: Sale[] = salesData.map(s => ({
              id: s.id,
              marca: s.marca as Marca,
              data: s.data,
              cliente: s.cliente,
              valor: Number(s.valor),
              vendedor: s.vendedor as Seller,
              eventoSyonet: s.evento_syonet,
              equipamento: s.equipamento as Equipment,
              notaFiscal: s.nota_fiscal,
              condicao: s.condicao as Condition,
              quantidadeCota: s.quantidade_cota,
              tipoCota: s.tipo_cota as TipoCota,
              comissaoPersonalizada: s.comissao_personalizada ? Number(s.comissao_personalizada) : undefined,
              observacao: s.observacao,
              recebidoGerente: s.recebido_gerente
            }));
            
            // Merge with local sales that might not have been synced
            const savedSales = localStorage.getItem('trator_sales');
            if (savedSales) {
              const localSales: Sale[] = JSON.parse(savedSales);
              const unsyncedSales = localSales.filter(ls => !formattedSales.some(fs => fs.id === ls.id));
              if (unsyncedSales.length > 0) {
                console.log('Merging unsynced local sales:', unsyncedSales.length);
                setSales([...unsyncedSales, ...formattedSales].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
              } else {
                setSales(formattedSales);
              }
            } else {
              setSales(formattedSales);
            }
          }
        } catch (e) {
          console.warn('Failed to process sales:', e);
          setConnectionStatus('local');
        }

        // Fetch Goals
        try {
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*');
            
          if (goalsError) {
            console.warn('Error fetching goals, using defaults:', goalsError);
          } else if (goalsData && goalsData.length > 0) {
            const formattedGoals: Goal[] = goalsData.map(g => ({
              vendedor: g.vendedor as Seller,
              equipamento: g.equipamento as Equipment,
              meta: Number(g.meta)
            }));
            
            const mergedGoals = INITIAL_GOALS.map(initialGoal => {
              const fetchedGoal = formattedGoals.find(g => g.vendedor === initialGoal.vendedor && g.equipamento === initialGoal.equipamento);
              return fetchedGoal || initialGoal;
            });
            setGoals(mergedGoals);
          }
        } catch (e) {
          console.warn('Failed to process goals:', e);
        }

        // Fetch Company Goals
        try {
          const { data: companyGoalsData, error: companyGoalsError } = await supabase
            .from('company_goals')
            .select('*');
            
          if (companyGoalsError) {
            console.warn('Error fetching company goals, using defaults:', companyGoalsError);
            // If it's just a missing table, don't block the whole app, but warn the user
            if (companyGoalsError.code === 'PGRST116' || companyGoalsError.message.includes('schema cache') || companyGoalsError.message.includes('does not exist')) {
              setErrorMessage('Atenção: Tabela "company_goals" não encontrada. As metas da empresa usarão valores padrão.');
              // We don't set connectionStatus to 'error' here to keep the app functional
            }
          } else if (companyGoalsData && companyGoalsData.length > 0) {
            const formattedCompanyGoals: CompanyGoal[] = companyGoalsData.map(g => ({
              equipamento: g.equipamento as Equipment,
              meta: Number(g.meta)
            }));
            
            const mergedCompanyGoals = INITIAL_COMPANY_GOALS.map(initialGoal => {
              const fetchedGoal = formattedCompanyGoals.find(g => g.equipamento === initialGoal.equipamento);
              return fetchedGoal || initialGoal;
            });
            setCompanyGoals(mergedCompanyGoals);
          }
        } catch (e) {
          console.warn('Failed to process company goals:', e);
        }
      } catch (error: any) {
        console.error('Error fetching data from Supabase:', error);
        setConnectionStatus('error');
        setErrorMessage(error.message || 'Erro ao conectar com o banco de dados.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('trator_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('trator_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('trator_company_goals', JSON.stringify(companyGoals));
  }, [companyGoals]);

  const addSale = async (newSale: Omit<Sale, 'id' | 'recebidoGerente'>) => {
    const saleId = crypto.randomUUID();
    const sale: Sale = {
      ...newSale,
      id: saleId,
      recebidoGerente: false,
    };
    
    // Optimistic update
    setSales(prev => [sale, ...prev]);

    if (supabase) {
      const { error } = await supabase.from('sales').insert([{
        id: saleId,
        marca: sale.marca,
        data: sale.data,
        cliente: sale.cliente,
        valor: sale.valor,
        vendedor: sale.vendedor,
        evento_syonet: sale.eventoSyonet,
        equipamento: sale.equipamento,
        nota_fiscal: sale.notaFiscal,
        condicao: sale.condicao,
        quantidade_cota: sale.quantidadeCota,
        tipo_cota: sale.tipoCota,
        comissao_personalizada: sale.comissaoPersonalizada,
        observacao: sale.observacao,
        recebido_gerente: sale.recebidoGerente
      }]);
      
      if (error) {
        console.error('Error adding sale:', error);
        // Revert on error could be implemented here
      }
    }
  };

  const editSale = async (updatedSale: Sale) => {
    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));

    if (supabase) {
      const { error } = await supabase.from('sales').update({
        marca: updatedSale.marca,
        data: updatedSale.data,
        cliente: updatedSale.cliente,
        valor: updatedSale.valor,
        vendedor: updatedSale.vendedor,
        evento_syonet: updatedSale.eventoSyonet,
        equipamento: updatedSale.equipamento,
        nota_fiscal: updatedSale.notaFiscal,
        condicao: updatedSale.condicao,
        quantidade_cota: updatedSale.quantidadeCota,
        tipo_cota: updatedSale.tipoCota,
        comissao_personalizada: updatedSale.comissaoPersonalizada,
        observacao: updatedSale.observacao,
        recebido_gerente: updatedSale.recebidoGerente
      }).eq('id', updatedSale.id);

      if (error) console.error('Error updating sale:', error);
    }
  };

  const toggleRecebidoGerente = async (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;
    
    const newStatus = !sale.recebidoGerente;
    
    setSales(prev => prev.map(s => 
      s.id === id ? { ...s, recebidoGerente: newStatus } : s
    ));

    if (supabase) {
      const { error } = await supabase.from('sales').update({
        recebido_gerente: newStatus
      }).eq('id', id);

      if (error) console.error('Error toggling recebido_gerente:', error);
    }
  };

  const deleteSale = async (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));

    if (supabase) {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) console.error('Error deleting sale:', error);
    }
  };

  const saveAllGoals = async (newCompanyGoals: CompanyGoal[], newGoals: Goal[]) => {
    setCompanyGoals(newCompanyGoals);
    setGoals(newGoals);

    if (supabase) {
      try {
        const { data: existingCompanyGoals } = await supabase.from('company_goals').select('id, equipamento');
        for (const cg of newCompanyGoals) {
          const existing = existingCompanyGoals?.find(e => e.equipamento === cg.equipamento);
          if (existing) {
            await supabase.from('company_goals').update({ meta: cg.meta }).eq('id', existing.id);
          } else {
            await supabase.from('company_goals').insert([{ equipamento: cg.equipamento, meta: cg.meta }]);
          }
        }

        const { data: existingGoals } = await supabase.from('goals').select('id, vendedor, equipamento');
        for (const g of newGoals) {
          const existing = existingGoals?.find(e => e.vendedor === g.vendedor && e.equipamento === g.equipamento);
          if (existing) {
            await supabase.from('goals').update({ meta: g.meta }).eq('id', existing.id);
          } else {
            await supabase.from('goals').insert([{ vendedor: g.vendedor, equipamento: g.equipamento, meta: g.meta }]);
          }
        }
      } catch (err) {
        console.error('Error saving all goals:', err);
      }
    }
  };

  const updateGoal = async (vendedor: Seller, equipamento: Equipment, meta: number) => {
    setGoals(prev => prev.map(g => 
      (g.vendedor === vendedor && g.equipamento === equipamento) ? { ...g, meta } : g
    ));

    if (supabase) {
      // Check if goal exists
      const { data } = await supabase.from('goals')
        .select('id')
        .eq('vendedor', vendedor)
        .eq('equipamento', equipamento)
        .maybeSingle();

      if (data) {
        // Update
        const { error } = await supabase.from('goals')
          .update({ meta })
          .eq('id', data.id);
        if (error) console.error('Error updating goal:', error);
      } else {
        // Insert
        const { error } = await supabase.from('goals')
          .insert([{ vendedor, equipamento, meta }]);
        if (error) console.error('Error inserting goal:', error);
      }
    }
  };

  const updateCompanyGoal = async (equipamento: Equipment, meta: number) => {
    setCompanyGoals(prev => prev.map(g => 
      (g.equipamento === equipamento) ? { ...g, meta } : g
    ));

    if (supabase) {
      // Check if goal exists
      const { data } = await supabase.from('company_goals')
        .select('id')
        .eq('equipamento', equipamento)
        .maybeSingle();

      if (data) {
        // Update
        const { error } = await supabase.from('company_goals')
          .update({ meta })
          .eq('id', data.id);
        if (error) console.error('Error updating company goal:', error);
      } else {
        // Insert
        const { error } = await supabase.from('company_goals')
          .insert([{ equipamento, meta }]);
        if (error) console.error('Error inserting company goal:', error);
      }
    }
  };

  const handleBackupJSON = () => {
    const dataObj = { sales, goals, companyGoals };
    const jsonStr = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_banco_de_dados_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupExcel = () => {
    const wb = XLSX.utils.book_new();

    // Vendas
    const wsVendas = XLSX.utils.json_to_sheet(sales.map(s => ({
      Data: formatDate(s.data),
      Vendedor: s.vendedor,
      Marca: s.marca,
      Equipamento: s.equipamento,
      Valor: s.valor,
      Cliente: s.cliente,
      'Nota Fiscal': s.notaFiscal,
      Condição: s.condicao,
      'Quantidade Cota': s.quantidadeCota,
      'Tipo Cota': s.tipoCota,
      'Comissão Personalizada': s.comissaoPersonalizada,
      Observação: s.observacao,
      'Recebido Gerente': s.recebidoGerente ? 'Sim' : 'Não'
    })));
    XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas");

    // Metas
    const wsMetas = XLSX.utils.json_to_sheet(goals);
    XLSX.utils.book_append_sheet(wb, wsMetas, "Metas Vendedores");

    const wsMetasEmpresa = XLSX.utils.json_to_sheet(companyGoals);
    XLSX.utils.book_append_sheet(wb, wsMetasEmpresa, "Metas Empresa");

    XLSX.writeFile(wb, `backup_planilhas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans">
      {/* Sidebar / Header */}
      <header className="bg-black text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-lg">
              <Package className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter uppercase">TratorMaster</h1>
              <p className="text-[10px] text-yellow-400 font-medium tracking-widest uppercase">Sempre perto de você</p>
              <div className="flex items-center gap-1 mt-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connectionStatus === 'connected' ? "bg-green-500" : 
                  connectionStatus === 'local' ? "bg-yellow-500" : "bg-red-500"
                )} />
                <span className="text-[8px] text-zinc-400 uppercase font-bold">
                  {connectionStatus === 'connected' ? "Sincronizado" : 
                   connectionStatus === 'local' ? "Modo Local (Configuração Pendente)" : "Erro de Conexão"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBackupJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                title="Backup Banco de Dados (JSON)"
              >
                <Download size={14} />
                JSON
              </button>
              <button 
                onClick={handleBackupExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                title="Backup Planilhas (Excel)"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
            </div>
            <nav className="flex bg-zinc-900 p-1 rounded-xl overflow-x-auto max-w-full">
              <TabButton 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')}
                icon={<LayoutDashboard size={18} />}
                label="Dashboard"
              />
            <TabButton 
              active={activeTab === 'vendas'} 
              onClick={() => setActiveTab('vendas')}
              icon={<Trophy size={18} />}
              label="Vendas"
            />
            <TabButton 
              active={activeTab === 'metas'} 
              onClick={() => setActiveTab('metas')}
              icon={<Target size={18} />}
              label="Metas"
            />
            <TabButton 
              active={activeTab === 'kits'} 
              onClick={() => setActiveTab('kits')}
              icon={<Wrench size={18} />}
              label="Kits"
            />
            <TabButton 
              active={activeTab === 'comissao'} 
              onClick={() => setActiveTab('comissao')}
              icon={<DollarSign size={18} />}
              label="Comissão Gerente"
            />
            <TabButton 
              active={activeTab === 'comissao-recebida'} 
              onClick={() => setActiveTab('comissao-recebida')}
              icon={<CheckCircle size={18} />}
              label="Comissões Recebidas"
            />
          </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {connectionStatus === 'local' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm flex flex-col gap-2">
            <p className="font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              Sincronização Desativada (Modo Local)
            </p>
            <p>O aplicativo não encontrou as chaves de conexão com o Supabase. Os dados estão sendo salvos **apenas neste aparelho**.</p>
            <div className="mt-2 p-3 bg-white/50 rounded-lg border border-yellow-100">
              <p className="font-semibold mb-1">Como resolver:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>No <strong>AI Studio</strong>: Vá em <strong>Secrets</strong> e adicione <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.</li>
                <li>Na <strong>Vercel</strong>: Vá em <strong>Settings &gt; Environment Variables</strong> e adicione as mesmas chaves.</li>
                <li>Após adicionar, faça um <strong>Redeploy</strong> na Vercel ou reinicie o preview aqui.</li>
              </ul>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl text-sm flex flex-col gap-2 relative">
            <button 
              onClick={() => setErrorMessage(null)} 
              className="absolute top-2 right-2 p-1 hover:bg-red-200 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
            <p className="font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              Atenção: Problema na Sincronização
            </p>
            <p>{errorMessage}</p>
            <p className="text-xs">Os dados estão sendo salvos apenas neste dispositivo. Verifique as chaves do Supabase nas configurações.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-xs font-bold underline hover:no-underline"
            >
              Tentar novamente
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DashboardTab sales={sales} goals={goals} companyGoals={companyGoals} />
            </motion.div>
          )}
          {activeTab === 'vendas' && (
            <motion.div 
              key="vendas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <VendasTab sales={sales} onAddSale={addSale} onEditSale={editSale} onDeleteSale={deleteSale} />
            </motion.div>
          )}
          {activeTab === 'metas' && (
            <motion.div 
              key="metas"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <MetasTab 
                goals={goals} 
                companyGoals={companyGoals}
                sales={sales} 
                onSaveAll={saveAllGoals}
              />
            </motion.div>
          )}
          {activeTab === 'kits' && (
            <motion.div 
              key="kits"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <KitsTab sales={sales} />
            </motion.div>
          )}
          {activeTab === 'comissao' && (
            <motion.div 
              key="comissao"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ComissaoGerenteTab sales={sales} onToggleRecebido={toggleRecebidoGerente} />
            </motion.div>
          )}
          {activeTab === 'comissao-recebida' && (
            <motion.div 
              key="comissao-recebida"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ComissaoRecebidaTab sales={sales} onToggleRecebido={toggleRecebidoGerente} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-black text-white/50 p-8 mt-12 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest">© 2026 Gestão Gerencial</p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium",
        active ? "bg-yellow-400 text-black shadow-inner" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// --- DASHBOARD TAB ---
function DashboardTab({ 
  sales, 
  goals, 
  companyGoals 
}: { 
  sales: Sale[], 
  goals: Goal[], 
  companyGoals: CompanyGoal[] 
}) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // 1. Performance por Equipamento (Empresa) - Realizado vs Meta Empresa
  const equipmentPerformance = useMemo(() => {
    return EQUIPMENTS.filter(e => e !== 'Consórcio').map(equip => {
      const realized = sales.filter(s => s.equipamento === equip && (s.marca || 'JCB').trim().toUpperCase() === 'JCB').length;
      const meta = companyGoals.find(g => g.equipamento === equip)?.meta || 0;
      return {
        name: equip,
        realizado: realized,
        meta: meta
      };
    }).filter(e => e.meta > 0 || e.realizado > 0);
  }, [sales, companyGoals]);

  // 2. Performance por Consultor (Realizado vs Meta Individual)
  const consultantPerformance = useMemo(() => {
    return SELLERS.filter(s => ['Anderson', 'Carlos', 'Thalita'].includes(s)).map(seller => {
      const realized = sales.filter(s => 
        (s.vendedor || '').trim().toUpperCase() === seller.toUpperCase() && 
        (s.marca || 'JCB').trim().toUpperCase() === 'JCB'
      ).length;
      const meta = goals.filter(g => g.vendedor === seller && g.equipamento !== 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
      return {
        name: seller,
        realizado: realized,
        meta: meta
      };
    }).filter(p => p.meta > 0 || p.realizado > 0);
  }, [sales, goals]);

  // 4. Performance de Consórcio por Consultor
  const consorcioPerformance = useMemo(() => {
    return SELLERS.filter(s => ['Anderson', 'Carlos', 'Thalita'].includes(s)).map(seller => {
      const sellerSales = sales.filter(s => 
        (s.vendedor || '').trim().toUpperCase() === seller.toUpperCase() && 
        s.equipamento === 'Consórcio'
      );
      const realized = sellerSales.reduce((acc, s) => acc + (s.quantidadeCota || 1), 0);
      const valorVendido = sellerSales.reduce((acc, s) => acc + s.valor, 0);
      const meta = goals.filter(g => g.vendedor === seller && g.equipamento === 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
      return {
        name: seller,
        realizado: realized,
        meta: meta,
        valorVendido
      };
    }).filter(p => p.meta > 0 || p.realizado > 0);
  }, [sales, goals]);

  const totalValorConsorcio = useMemo(() => {
    return sales.filter(s => s.equipamento === 'Consórcio').reduce((acc, s) => acc + s.valor, 0);
  }, [sales]);

  // 3. Acompanhamento Mensal da Empresa (Realizado vs Meta Total)
  const companyMonthlyProgress = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const totalCompanyMeta = companyGoals.filter(g => g.equipamento !== 'Consórcio').reduce((acc, g) => acc + g.meta, 0);

    const progress: any[] = months.map((month, idx) => {
      const realized = sales.filter(s => {
        const d = new Date(s.data);
        return d.getUTCMonth() === idx && d.getUTCFullYear() === currentYear && (s.marca || 'JCB').trim().toUpperCase() === 'JCB';
      }).length;
      return {
        name: month,
        realizado: realized
      };
    });

    const totalRealized = progress.reduce((acc, p) => acc + p.realizado, 0);

    progress.push({
      name: 'Total',
      realizado: totalRealized,
      metaTotal: totalCompanyMeta
    });

    return progress;
  }, [sales, companyGoals, currentYear]);

  const totalCompanyMeta = companyGoals.filter(g => g.equipamento !== 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
  const totalRealized = sales.filter(s => (s.marca || 'JCB').trim().toUpperCase() === 'JCB').length;
  const currentMonthSales = sales.filter(s => {
    const d = new Date(s.data);
    return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear && (s.marca || 'JCB').trim().toUpperCase() === 'JCB';
  }).length;
  const achievementPercent = totalCompanyMeta > 0 ? (totalRealized / totalCompanyMeta) * 100 : 0;
  
  const remainingMonths = 12 - currentMonth;
  const monthlyNecessity = Math.max(0, Math.ceil((totalCompanyMeta - totalRealized) / remainingMonths));

  const handleShare = async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      // Usar toPng diretamente, que é mais confiável que toBlob em alguns navegadores
      const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2 });
      
      // Tentar converter dataUrl para Blob para a Web Share API
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${title}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: title,
            text: `Confira o gráfico: ${title}`,
            files: [file]
          });
          return;
        } catch (shareError) {
          console.error('Share failed', shareError);
        }
      }
      
      // Fallback para download direto
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${title}.png`;
      link.click();
      alert('Imagem baixada! Você pode anexá-la no WhatsApp.');
      window.open(`https://wa.me/?text=Confira%20o%20gr%C3%A1fico%20${title}`, '_blank');
    } catch (err) {
      console.error('Failed to share', err);
      alert('Erro ao gerar a imagem para compartilhamento.');
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-yellow-400/20 transition-all" />
          <div className="relative space-y-4">
            <div className="bg-zinc-800 w-10 h-10 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Vendas do Mês</p>
              <h3 className="text-4xl font-black tracking-tighter">{currentMonthSales}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 relative overflow-hidden group">
          <div className="relative space-y-4">
            <div className="bg-zinc-50 w-10 h-10 rounded-xl flex items-center justify-center">
              <Target size={20} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Necessidade Mensal</p>
              <h3 className="text-4xl font-black tracking-tighter text-zinc-900">{monthlyNecessity}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 relative overflow-hidden group">
          <div className="relative space-y-4">
            <div className="bg-zinc-50 w-10 h-10 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Consultores</p>
              <h3 className="text-4xl font-black tracking-tighter text-zinc-900">3</h3>
            </div>
          </div>
        </div>

        <div className="bg-yellow-400 p-8 rounded-[2rem] shadow-2xl shadow-yellow-400/20 relative overflow-hidden group">
          <div className="relative space-y-4">
            <div className="bg-black/10 w-10 h-10 rounded-xl flex items-center justify-center">
              <Award size={20} className="text-black" />
            </div>
            <div>
              <p className="text-black/60 text-[10px] font-black uppercase tracking-widest">Atingimento</p>
              <h3 className="text-4xl font-black tracking-tighter text-black">
                {achievementPercent.toFixed(0)}%
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* 1. Performance por Equipamento */}
        <div id="chart-equip" className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase tracking-tighter text-zinc-900">Performance por Equipamento</h4>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Realizado vs Meta Empresa</p>
            </div>
            <button onClick={() => handleShare('chart-equip', 'Performance_Equipamento')} className="p-2 hover:bg-zinc-50 rounded-xl transition-colors">
              <Share2 size={18} className="text-zinc-400" />
            </button>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipmentPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#000000', fontSize: 9, fontWeight: 800 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="realizado" name="Realizado" fill="#18181b" radius={[6, 6, 0, 0]} barSize={30}>
                  <LabelList dataKey="realizado" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#18181b' }} />
                </Bar>
                <Bar dataKey="meta" name="Meta" fill="#facc15" radius={[6, 6, 0, 0]} barSize={30}>
                  <LabelList dataKey="meta" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#eab308' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Performance por Consultor */}
        <div id="chart-seller" className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase tracking-tighter text-zinc-900">Performance por Consultor</h4>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Realizado vs Meta Individual</p>
            </div>
            <button onClick={() => handleShare('chart-seller', 'Performance_Consultor')} className="p-2 hover:bg-zinc-50 rounded-xl transition-colors">
              <Share2 size={18} className="text-zinc-400" />
            </button>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consultantPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="realizado" name="Realizado" fill="#18181b" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="realizado" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#18181b' }} />
                </Bar>
                <Bar dataKey="meta" name="Meta" fill="#facc15" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="meta" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#eab308' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Evolução Mensal vs Meta */}
        <div id="chart-monthly" className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 space-y-8 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase tracking-tighter text-zinc-900">Realizado x Meta Filial VDC</h4>
            </div>
            <button onClick={() => handleShare('chart-monthly', 'Realizado_x_Meta')} className="p-2 hover:bg-zinc-50 rounded-xl transition-colors">
              <Share2 size={18} className="text-zinc-400" />
            </button>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={companyMonthlyProgress} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                <Bar dataKey="realizado" name="Vendas Realizadas" fill="#18181b" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="realizado" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#18181b' }} />
                </Bar>
                <Bar dataKey="metaTotal" name="Meta Total" fill="#facc15" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="metaTotal" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#eab308' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Performance de Consórcio por Consultor */}
        <div id="chart-consorcio" className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 space-y-8 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase tracking-tighter text-zinc-900">Performance de Consórcio por Consultor</h4>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Cotas Realizadas vs Meta</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Vendido</p>
                <p className="text-lg font-black text-yellow-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValorConsorcio)}</p>
              </div>
              <button onClick={() => handleShare('chart-consorcio', 'Consorcio_por_Consultor')} className="p-2 hover:bg-zinc-50 rounded-xl transition-colors">
                <Share2 size={18} className="text-zinc-400" />
              </button>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consorcioPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip 
                  content={<CustomConsorcioTooltip />}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="realizado" name="Cotas Realizadas" fill="#18181b" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="realizado" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#18181b' }} />
                </Bar>
                <Bar dataKey="meta" name="Meta de Cotas" fill="#facc15" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="meta" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#eab308' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend }: { label: string, value: string, icon: React.ReactNode, trend?: string }) {
  return (
    <div className="bg-black text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-yellow-400/20 transition-all duration-500" />
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
        {trend && <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{trend}</span>}
      </div>
      <p className="text-zinc-400 text-sm font-medium mb-1">{label}</p>
      <h4 className="text-2xl font-black tracking-tight">{value}</h4>
    </div>
  );
}

// --- COMISSÃO GERENTE TAB ---
const MANAGER_COMMISSION_RATE = 0.002; // 0.2%

function ComissaoGerenteTab({ sales, onToggleRecebido }: { sales: Sale[], onToggleRecebido: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only JCB, EP and Clark sales, and only pending (not received)
  const validBrands = ['JCB', 'EP', 'CLARK'];
  const eligibleSales = sales.filter(s => {
    const marca = (s.marca || '').trim().toUpperCase();
    return validBrands.includes(marca) && !s.recebidoGerente;
  });

  const totalSalesValue = eligibleSales.reduce((acc, s) => acc + s.valor, 0);
  
  const salesJCB = eligibleSales.filter(s => (s.marca || 'JCB').trim().toUpperCase() === 'JCB').reduce((acc, s) => acc + s.valor, 0);
  const salesEP = eligibleSales.filter(s => (s.marca || '').trim().toUpperCase() === 'EP').reduce((acc, s) => acc + s.valor, 0);
  const salesClark = eligibleSales.filter(s => (s.marca || '').trim().toUpperCase() === 'CLARK').reduce((acc, s) => acc + s.valor, 0);

  const getSaleCommission = (s: Sale) => {
    return s.valor * MANAGER_COMMISSION_RATE;
  };

  const totalManagerCommission = eligibleSales.reduce((acc, s) => acc + getSaleCommission(s), 0);

  const filteredSales = eligibleSales.filter(s => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (s.cliente || '').toLowerCase().includes(searchLower) ||
      (s.equipamento || '').toLowerCase().includes(searchLower) ||
      (s.notaFiscal || '').toLowerCase().includes(searchLower)
    );
  });

  const sortedSales = [...filteredSales].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="space-y-8">
      <div className="bg-black text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-10 -mt-10 blur-3xl" />
        <h3 className="text-zinc-400 text-sm font-medium mb-4">Resumo de Vendas e Comissão (JCB, EP, Clark)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Total de Vendas</p>
            <h4 className="text-3xl font-black text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalesValue)}
            </h4>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Por Marca</p>
            <div className="space-y-1 text-sm font-medium text-zinc-300">
              <div className="flex justify-between"><span>JCB:</span> <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesJCB)}</span></div>
              <div className="flex justify-between"><span>EP:</span> <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesEP)}</span></div>
              <div className="flex justify-between"><span>Clark:</span> <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesClark)}</span></div>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Pendente de Recebimento</p>
            <h4 className="text-3xl font-black text-red-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalManagerCommission)}
            </h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp size={20} className="text-yellow-500" />
            Detalhamento de Comissões - Gerência
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                <th className="px-3 py-3 whitespace-nowrap">Data</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Equipamento</th>
                <th className="px-3 py-3 whitespace-nowrap">Nota Fiscal</th>
                <th className="px-3 py-3 whitespace-nowrap">Valor da Venda</th>
                <th className="px-3 py-3 whitespace-nowrap">Comissão (0,2%)</th>
                <th className="px-3 py-3 whitespace-nowrap">Recebido?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-zinc-400 italic">Nenhuma venda para calcular comissão.</td>
                </tr>
              ) : (
                sortedSales.map(sale => {
                  const commission = getSaleCommission(sale);
                  return (
                    <tr key={sale.id} className={cn(
                      "hover:bg-zinc-50 transition-colors",
                      sale.recebidoGerente && "opacity-50"
                    )}>
                      <td className={cn("px-3 py-3 text-xs text-zinc-600 whitespace-nowrap", sale.recebidoGerente && "line-through")}>
                        {formatDate(sale.data)}
                      </td>
                      <td className={cn("px-3 py-3 font-medium text-xs break-words", sale.recebidoGerente && "line-through")}>{sale.cliente}</td>
                      <td className={cn("px-3 py-3 text-xs text-zinc-600 break-words", sale.recebidoGerente && "line-through")}>{sale.equipamento || '-'}</td>
                      <td className={cn("px-3 py-3 text-xs text-zinc-600 break-words", sale.recebidoGerente && "line-through")}>{sale.notaFiscal || '-'}</td>
                      <td className={cn("px-3 py-3 whitespace-nowrap", sale.recebidoGerente && "line-through")}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor)}
                      </td>
                      <td className={cn("px-3 py-3 text-yellow-600 font-bold whitespace-nowrap", sale.recebidoGerente && "line-through")}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(commission)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={sale.recebidoGerente}
                            onChange={() => onToggleRecebido(sale.id)}
                            className="w-5 h-5 accent-yellow-400 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            {sale.recebidoGerente ? "Recebido" : "Pendente"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedSales.length > 0 && (
              <tfoot className="bg-zinc-900 text-white">
                <tr>
                  <td colSpan={4} className="px-3 py-4 font-bold text-right uppercase tracking-widest text-[10px]">Total Pendente Gerente:</td>
                  <td colSpan={2} className="px-3 py-4 font-black text-xl text-yellow-400 whitespace-nowrap">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalManagerCommission)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function ComissaoRecebidaTab({ sales, onToggleRecebido }: { sales: Sale[], onToggleRecebido: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only JCB, EP and Clark sales, and only received
  const validBrands = ['JCB', 'EP', 'CLARK'];
  const eligibleSales = sales.filter(s => {
    const marca = (s.marca || '').trim().toUpperCase();
    return validBrands.includes(marca) && s.recebidoGerente;
  });

  const getSaleCommission = (s: Sale) => {
    return s.valor * MANAGER_COMMISSION_RATE;
  };

  const totalReceivedCommission = eligibleSales.reduce((acc, s) => acc + getSaleCommission(s), 0);

  const filteredSales = eligibleSales.filter(s => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (s.cliente || '').toLowerCase().includes(searchLower) ||
      (s.equipamento || '').toLowerCase().includes(searchLower) ||
      (s.notaFiscal || '').toLowerCase().includes(searchLower)
    );
  });

  const sortedSales = [...filteredSales].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="space-y-8">
      <div className="bg-black text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full -mr-10 -mt-10 blur-3xl" />
        <h3 className="text-zinc-400 text-sm font-medium mb-4">Comissões Recebidas (JCB, EP, Clark)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Total Recebido</p>
            <h4 className="text-3xl font-black text-green-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceivedCommission)}
            </h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-bold flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Vendas com Comissão Recebida
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                <th className="px-3 py-3 whitespace-nowrap">Data</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Equipamento</th>
                <th className="px-3 py-3 whitespace-nowrap">Nota Fiscal</th>
                <th className="px-3 py-3 whitespace-nowrap">Valor da Venda</th>
                <th className="px-3 py-3 whitespace-nowrap">Comissão (0,2%)</th>
                <th className="px-3 py-3 whitespace-nowrap">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-zinc-400 italic">Nenhuma comissão recebida.</td>
                </tr>
              ) : (
                sortedSales.map(sale => {
                  const commission = getSaleCommission(sale);
                  return (
                    <tr key={sale.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-3 py-3 text-xs text-zinc-600 whitespace-nowrap">
                        {formatDate(sale.data)}
                      </td>
                      <td className="px-3 py-3 font-medium text-xs break-words">{sale.cliente}</td>
                      <td className="px-3 py-3 text-xs text-zinc-600 break-words">{sale.equipamento || '-'}</td>
                      <td className="px-3 py-3 text-xs text-zinc-600 break-words">{sale.notaFiscal || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor)}
                      </td>
                      <td className="px-3 py-3 text-green-600 font-bold whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(commission)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={sale.recebidoGerente}
                            onChange={() => onToggleRecebido(sale.id)}
                            className="w-5 h-5 accent-green-500 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">
                            Desmarcar
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedSales.length > 0 && (
              <tfoot className="bg-zinc-900 text-white">
                <tr>
                  <td colSpan={5} className="px-3 py-4 font-bold text-right uppercase tracking-widest text-[10px]">Total Recebido:</td>
                  <td colSpan={2} className="px-3 py-4 font-black text-xl text-green-400 whitespace-nowrap">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceivedCommission)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// --- VENDAS TAB ---
function VendasTab({ sales, onAddSale, onEditSale, onDeleteSale }: { sales: Sale[], onAddSale: (sale: any) => void, onEditSale: (sale: Sale) => void, onDeleteSale: (id: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    vendedor: 'all',
    marca: 'all',
    equipamento: 'all',
    month: 'all'
  });
  
  const initialFormState: Partial<Sale> = {
    marca: '' as Marca,
    data: new Date().toISOString().split('T')[0],
    eventoSyonet: '',
    cliente: '',
    equipamento: '',
    valor: '' as unknown as number,
    vendedor: '' as Seller,
    condicao: '' as Condition,
    notaFiscal: '',
    quantidadeCota: '' as unknown as number,
    tipoCota: '' as unknown as any,
    comissaoPersonalizada: '' as unknown as number,
    observacao: ''
  };

  const [formData, setFormData] = useState<Partial<Sale>>(initialFormState);

  const handleEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setFormData({
      marca: sale.marca || '',
      data: sale.data ? sale.data.split('T')[0] : new Date().toISOString().split('T')[0],
      eventoSyonet: sale.eventoSyonet || '',
      cliente: sale.cliente || '',
      equipamento: sale.equipamento || '',
      valor: sale.valor || ('' as unknown as number),
      vendedor: sale.vendedor || '',
      condicao: sale.condicao || '',
      notaFiscal: sale.notaFiscal || '',
      quantidadeCota: sale.quantidadeCota || ('' as unknown as number),
      tipoCota: sale.tipoCota || ('' as unknown as any),
      comissaoPersonalizada: sale.comissaoPersonalizada !== undefined ? sale.comissaoPersonalizada : ('' as unknown as number),
      observacao: sale.observacao || ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.marca || !formData.cliente || !formData.valor || !formData.vendedor) {
      alert("Preencha todos os campos obrigatórios (Marca, Cliente, Valor e Vendedor).");
      return;
    }
    
    const dateStr = formData.data || new Date().toISOString().split('T')[0];
    const dataIso = `${dateStr}T12:00:00.000Z`;

    const saleData: any = {
      marca: formData.marca,
      data: dataIso,
      cliente: formData.cliente,
      valor: Number(formData.valor),
      vendedor: formData.vendedor,
    };

    if (formData.vendedor === 'Outros') {
      saleData.observacao = formData.observacao;
    }

    if (formData.marca === 'JCB') {
      saleData.eventoSyonet = formData.eventoSyonet;
      saleData.equipamento = formData.equipamento;
      saleData.notaFiscal = formData.notaFiscal;
      saleData.condicao = formData.condicao;
    } else if (formData.marca === 'EP' || formData.marca === 'Clark') {
      saleData.eventoSyonet = formData.eventoSyonet;
      saleData.notaFiscal = formData.notaFiscal;
    } else if (formData.marca === 'Consórcio') {
      saleData.quantidadeCota = Number(formData.quantidadeCota);
      saleData.equipamento = 'Consórcio';
      saleData.tipoCota = formData.tipoCota;
      if (formData.tipoCota === 'Campanha Pontual') {
        saleData.comissaoPersonalizada = Number(formData.comissaoPersonalizada);
      }
    }

    if (editingId) {
      onEditSale({ ...saleData, id: editingId, recebidoGerente: sales.find(s => s.id === editingId)?.recebidoGerente });
      setEditingId(null);
    } else {
      onAddSale(saleData);
    }
    
    setFormData(initialFormState);
    setSuccessMessage('Venda salva com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const availableMonths = Array.from(new Set(sales.map(s => {
    const d = new Date(s.data);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }))).sort().reverse();

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.cliente.toLowerCase().includes(filters.search.toLowerCase());
    const matchesVendedor = filters.vendedor === 'all' || s.vendedor === filters.vendedor;
    const matchesMarca = filters.marca === 'all' || (s.marca || 'JCB').trim().toUpperCase() === filters.marca.toUpperCase();
    const matchesEquipamento = filters.equipamento === 'all' || s.equipamento === filters.equipamento;
    
    let matchesMonth = true;
    if (filters.month !== 'all') {
      const d = new Date(s.data);
      const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      matchesMonth = monthStr === filters.month;
    }
    
    return matchesSearch && matchesVendedor && matchesMarca && matchesEquipamento && matchesMonth;
  });

  const sortedSales = [...filteredSales].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 sticky top-24">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            {editingId ? <Edit2 size={20} className="text-yellow-500" /> : <Plus size={20} className="text-yellow-500" />}
            {editingId ? 'Editar Venda' : 'Lançar Nova Venda'}
          </h3>
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputGroup label="Marca *">
              <select 
                value={formData.marca}
                onChange={e => setFormData({...formData, marca: e.target.value as Marca})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                required
              >
                <option value="" disabled>Selecione a marca</option>
                {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </InputGroup>

            <InputGroup label="Data *">
              <input 
                type="date" 
                value={formData.data}
                onChange={e => setFormData({...formData, data: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                required
              />
            </InputGroup>

            {formData.marca !== 'Consórcio' && (
              <InputGroup label="Evento Syonet">
                <input 
                  type="text" 
                  value={formData.eventoSyonet}
                  onChange={e => setFormData({...formData, eventoSyonet: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                  placeholder="Ex: 123456"
                />
              </InputGroup>
            )}

            <InputGroup label="Cliente *">
              <input 
                type="text" 
                value={formData.cliente}
                onChange={e => setFormData({...formData, cliente: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                placeholder="Nome do cliente"
                required
              />
            </InputGroup>

            {formData.marca === 'JCB' && (
              <InputGroup label="Equipamento *">
                <select 
                  value={formData.equipamento}
                  onChange={e => setFormData({...formData, equipamento: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                  required
                >
                  <option value="" disabled>Selecione o equipamento</option>
                  {EQUIPMENTS.filter(e => e !== 'Consórcio').map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </InputGroup>
            )}

            {formData.marca === 'Consórcio' && (
              <>
                <InputGroup label="Tipo de Cota *">
                  <div className="flex flex-col gap-2 mt-2">
                    {['Pontual', 'Tradicional', 'Campanha Pontual'].map(tipo => (
                      <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tipoCota"
                          value={tipo}
                          checked={formData.tipoCota === tipo}
                          onChange={e => setFormData({...formData, tipoCota: e.target.value as any})}
                          className="w-4 h-4 accent-yellow-400"
                          required
                        />
                        <span className="text-sm text-zinc-700">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </InputGroup>
                
                {formData.tipoCota === 'Campanha Pontual' && (
                  <InputGroup label="Comissão Personalizada (R$) *">
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.comissaoPersonalizada}
                      onChange={e => setFormData({...formData, comissaoPersonalizada: e.target.value ? Number(e.target.value) : ('' as unknown as number)})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                      placeholder="0,00"
                      required
                    />
                  </InputGroup>
                )}

                <InputGroup label="Quantidade de Cotas *">
                  <input 
                    type="number" 
                    min="1"
                    value={formData.quantidadeCota}
                    onChange={e => setFormData({...formData, quantidadeCota: Number(e.target.value)})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                    required
                  />
                </InputGroup>
              </>
            )}

            <InputGroup label="Valor (R$) *">
              <input 
                type="number" 
                step="0.01"
                value={formData.valor}
                onChange={e => setFormData({...formData, valor: e.target.value ? Number(e.target.value) : ('' as unknown as number)})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                placeholder="0,00"
                required
              />
            </InputGroup>

            <InputGroup label="Vendedor *">
              <select 
                value={formData.vendedor}
                onChange={e => setFormData({...formData, vendedor: e.target.value as Seller})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                required
              >
                <option value="" disabled>Selecione o vendedor</option>
                {SELLERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </InputGroup>

            {formData.vendedor === 'Outros' && (
              <InputGroup label="Observação (Nome do Vendedor)">
                <input 
                  type="text" 
                  value={formData.observacao}
                  onChange={e => setFormData({...formData, observacao: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                  placeholder="Nome ou detalhes do vendedor"
                />
              </InputGroup>
            )}

            {formData.marca !== 'Consórcio' && (
              <InputGroup label="Nota Fiscal">
                <input 
                  type="text" 
                  value={formData.notaFiscal}
                  onChange={e => setFormData({...formData, notaFiscal: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                  placeholder="Número da NF"
                />
              </InputGroup>
            )}

            {formData.marca === 'JCB' && (
              <InputGroup label="Condição">
                <select 
                  value={formData.condicao}
                  onChange={e => setFormData({...formData, condicao: e.target.value as Condition})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                >
                  <option value="" disabled>Selecione a condição</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </InputGroup>
            )}

            <div className="flex gap-2 mt-4">
              <button 
                type="submit"
                className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                {editingId ? <Edit2 size={18} className="text-yellow-400" /> : <Plus size={18} className="text-yellow-400" />}
                {editingId ? 'Salvar Edição' : 'Confirmar Venda'}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData(initialFormState);
                  }}
                  className="px-4 bg-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-300 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="lg:col-span-2 space-y-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold mb-2">
            <BarChart3 size={18} className="text-yellow-500" />
            Filtros de Venda
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Buscar Cliente</label>
              <input 
                type="text"
                placeholder="Nome do cliente..."
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Vendedor</label>
              <select 
                value={filters.vendedor}
                onChange={e => setFilters({...filters, vendedor: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              >
                <option value="all">Todos</option>
                {SELLERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Marca</label>
              <select 
                value={filters.marca}
                onChange={e => setFilters({...filters, marca: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              >
                <option value="all">Todas</option>
                {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Equipamento</label>
              <select 
                value={filters.equipamento}
                onChange={e => setFilters({...filters, equipamento: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              >
                <option value="all">Todos</option>
                {EQUIPMENTS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Mês/Ano</label>
              <select 
                value={filters.month}
                onChange={e => setFilters({...filters, month: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              >
                <option value="all">Todos</option>
                {availableMonths.map(m => {
                  const [year, month] = m.split('-');
                  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' });
                  return (
                    <option key={m} value={m}>
                      {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          {(filters.search || filters.vendedor !== 'all' || filters.marca !== 'all' || filters.equipamento !== 'all' || filters.month !== 'all') && (
            <button 
              onClick={() => setFilters({ search: '', vendedor: 'all', marca: 'all', equipamento: 'all', month: 'all' })}
              className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 hover:text-yellow-700 underline"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Sales List */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-yellow-500" />
              {filters.search || filters.vendedor !== 'all' || filters.marca !== 'all' || filters.month !== 'all' ? 'Vendas Filtradas' : 'Últimas Vendas'}
              <span className="text-xs text-zinc-400 font-normal ml-2">({sortedSales.length} registros)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  <th className="px-3 py-3 whitespace-nowrap">Data</th>
                  <th className="px-3 py-3">Equip/Marca</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3 text-center">Vendedor</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="px-3 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-zinc-400 italic">Nenhuma venda encontrada com os filtros atuais.</td>
                  </tr>
                ) : (
                  sortedSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-zinc-50 transition-colors group">
                      <td className="px-3 py-3 text-zinc-600 whitespace-nowrap text-xs">
                        {formatDate(sale.data)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs font-bold text-zinc-700">
                            {sale.marca === 'Consórcio' 
                              ? `${sale.quantidadeCota || 1} Cota(s)${sale.tipoCota ? ` - ${sale.tipoCota}` : ''}` 
                              : sale.equipamento}
                          </span>
                          <span className="px-1.5 py-0.5 bg-zinc-100 rounded text-[9px] font-bold uppercase">{(sale.marca || 'JCB').trim().toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-xs break-words">
                        {sale.cliente}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-[10px] font-bold uppercase">{sale.vendedor}</span>
                      </td>
                      <td className="px-3 py-3 font-bold text-right whitespace-nowrap text-xs">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center items-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(sale)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-all flex items-center justify-center"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => onDeleteSale(sale.id)}
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-all flex items-center justify-center"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">{label}</label>
      {children}
    </div>
  );
}

// --- METAS TAB ---
function MetasTab({ 
  goals, 
  companyGoals, 
  sales, 
  onSaveAll 
}: { 
  goals: Goal[], 
  companyGoals: CompanyGoal[], 
  sales: Sale[], 
  onSaveAll: (cg: CompanyGoal[], g: Goal[]) => Promise<void>
}) {
  const targetSellers: Seller[] = ['Anderson', 'Carlos', 'Thalita'];
  
  const [localCompanyGoals, setLocalCompanyGoals] = useState<CompanyGoal[]>(companyGoals);
  const [localGoals, setLocalGoals] = useState<Goal[]>(goals);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setLocalCompanyGoals(companyGoals);
    setLocalGoals(goals);
  }, [companyGoals, goals]);

  const handleUpdateCompanyGoal = (equipamento: Equipment, meta: number) => {
    setLocalCompanyGoals(prev => {
      const exists = prev.find(g => g.equipamento === equipamento);
      if (exists) return prev.map(g => g.equipamento === equipamento ? { ...g, meta } : g);
      return [...prev, { equipamento, meta }];
    });
  };

  const handleUpdateGoal = (vendedor: Seller, equipamento: Equipment, meta: number) => {
    setLocalGoals(prev => {
      const exists = prev.find(g => g.vendedor === vendedor && g.equipamento === equipamento);
      if (exists) return prev.map(g => (g.vendedor === vendedor && g.equipamento === equipamento) ? { ...g, meta } : g);
      return [...prev, { vendedor, equipamento, meta }];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    await onSaveAll(localCompanyGoals, localGoals);
    setIsSaving(false);
    setSaveMessage('Metas salvas com sucesso!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-yellow-400 p-3 rounded-2xl shadow-lg shadow-yellow-400/20">
          <Target className="text-black" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-900">Gestão de Metas</h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Configure a meta global da empresa por equipamento e distribua entre os consultores estratégicos.
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-2 mt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase tracking-widest px-8 py-3 rounded-2xl transition-all shadow-xl shadow-yellow-400/20 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Metas'}
          </button>
          
          {saveMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100"
            >
              {saveMessage}
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {EQUIPMENTS.map(equip => {
          const companyGoal = localCompanyGoals.find(cg => cg.equipamento === equip)?.meta || 0;
          const individualGoals = localGoals.filter(g => g.equipamento === equip && targetSellers.includes(g.vendedor));
          const distributedTotal = individualGoals.reduce((acc, g) => acc + g.meta, 0);
          
          const realized = equip === 'Consórcio'
            ? sales.filter(s => s.equipamento === 'Consórcio').reduce((acc, s) => acc + (s.quantidadeCota || 1), 0)
            : sales.filter(s => s.equipamento === equip && (s.marca || 'JCB').trim().toUpperCase() === 'JCB').length;
            
          const remaining = companyGoal - distributedTotal;
          
          return (
            <div key={equip} className="bg-white rounded-[2rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden group transition-all hover:shadow-2xl hover:shadow-yellow-400/5">
              <div className="p-8 bg-zinc-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                
                <div className="space-y-2 relative">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em]">Equipamento</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tight">{equip}</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-8 relative">
                  <div className="space-y-2">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest block text-right">Meta Empresa</span>
                    <div className="flex items-center gap-3 justify-end group/meta">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={companyGoal}
                          onChange={e => handleUpdateCompanyGoal(equip as Equipment, parseInt(e.target.value) || 0)}
                          className="bg-zinc-800/50 text-3xl font-black text-yellow-400 w-28 px-4 py-2 rounded-xl text-right outline-none border-2 border-transparent focus:border-yellow-400 focus:bg-zinc-800 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="absolute -right-2 -top-2 opacity-0 group-hover/meta:opacity-100 transition-opacity">
                          <Edit2 size={12} className="text-yellow-400" />
                        </div>
                      </div>
                      <span className="text-zinc-600 font-black text-sm uppercase">Un</span>
                    </div>
                  </div>
                  
                  <div className="h-16 w-px bg-zinc-800 hidden lg:block" />
                  
                  <div className="space-y-2">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest block text-right">Realizado</span>
                    <div className="flex items-baseline gap-2 justify-end">
                      <span className="text-4xl font-black text-white">{realized}</span>
                      <span className="text-xs font-bold text-zinc-600 uppercase">Un</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-zinc-50/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div className="space-y-1">
                    <h4 className="font-black text-zinc-900 uppercase text-xs tracking-widest">Distribuição por Consultor</h4>
                    <p className="text-zinc-400 text-[10px] font-medium">Atribua as metas individuais para Anderson, Carlos e Thalita.</p>
                  </div>
                  
                  <div className={cn(
                    "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 shadow-sm transition-all",
                    distributedTotal === companyGoal ? "bg-green-50 border-green-100 text-green-600" : 
                    distributedTotal > companyGoal ? "bg-red-50 border-red-100 text-red-600" : "bg-blue-50 border-blue-100 text-blue-600"
                  )}>
                    {distributedTotal === companyGoal ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        100% Distribuído
                      </div>
                    ) : distributedTotal > companyGoal ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Excesso: {distributedTotal - companyGoal} un
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        Restante: {companyGoal - distributedTotal} un
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {targetSellers.map(seller => {
                    const goal = individualGoals.find(g => g.vendedor === seller);
                    
                    const sellerRealized = equip === 'Consórcio'
                      ? sales.filter(s => 
                          (s.vendedor || '').trim().toUpperCase() === seller.toUpperCase() && 
                          s.equipamento === 'Consórcio'
                        ).reduce((acc, s) => acc + (s.quantidadeCota || 1), 0)
                      : sales.filter(s => 
                          (s.vendedor || '').trim().toUpperCase() === seller.toUpperCase() && 
                          s.equipamento === equip && 
                          (s.marca || 'JCB').trim().toUpperCase() === 'JCB'
                        ).length;
                        
                    const progress = goal?.meta ? Math.min((sellerRealized / goal.meta) * 100, 100) : 0;

                    return (
                      <div key={seller} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:border-yellow-400 transition-all hover:shadow-xl hover:shadow-zinc-200/50 group/card">
                        <div className="flex justify-between items-start mb-6">
                          <div className="space-y-1">
                            <span className="font-black uppercase text-xs tracking-tight text-zinc-400 block">Consultor</span>
                            <span className="font-black uppercase text-sm tracking-tight text-zinc-900">{seller}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100 group-hover/card:border-yellow-200 group-hover/card:bg-yellow-50 transition-all">
                            <input 
                              type="number" 
                              value={goal?.meta || 0}
                              onChange={e => handleUpdateGoal(seller, equip as Equipment, parseInt(e.target.value) || 0)}
                              className="w-10 bg-transparent text-right font-black text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] font-black text-zinc-400 uppercase">Meta</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-end justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Realizado</span>
                              <span className="text-3xl font-black text-zinc-900">{sellerRealized}</span>
                            </div>
                            <div className="text-right space-y-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Progresso</span>
                              <span className={cn(
                                "text-lg font-black",
                                progress >= 100 ? "text-green-600" : "text-zinc-900"
                              )}>{progress.toFixed(0)}%</span>
                            </div>
                          </div>

                          <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className={cn(
                                "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
                                progress >= 100 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- KITS TAB ---
function KitsTab({ sales }: { sales: Sale[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const jcbSales = sales.filter(s => (s.marca || 'JCB').trim().toUpperCase() === 'JCB').map(s => ({
    id: s.id,
    data: s.data,
    eventoSyonet: s.eventoSyonet || '',
    cliente: s.cliente,
    notaFiscal: s.notaFiscal || '',
    vendedor: s.vendedor,
  })).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Extract unique months for the filter using UTC to avoid timezone shifts
  const availableMonths = Array.from(new Set(jcbSales.map(s => {
    const d = new Date(s.data);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }))).sort().reverse();

  const filteredKits = selectedMonth === 'all' 
    ? jcbSales 
    : jcbSales.filter(s => {
        const d = new Date(s.data);
        const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return monthStr === selectedMonth;
      });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Relatório de Kits (Vendas JCB) - ${selectedMonth === 'all' ? 'Todos os meses' : selectedMonth}`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Data', 'Evento Syonet', 'Cliente', 'Nota Fiscal', 'Vendedor']],
      body: filteredKits.map(k => [
        formatDate(k.data),
        k.eventoSyonet,
        k.cliente,
        k.notaFiscal || '-',
        k.vendedor
      ]),
    });
    
    doc.save(`Kits_JCB_${selectedMonth}.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredKits.map(k => ({
      Data: formatDate(k.data),
      'Evento Syonet': k.eventoSyonet,
      Cliente: k.cliente,
      'Nota Fiscal': k.notaFiscal || '-',
      Vendedor: k.vendedor
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kits");
    XLSX.writeFile(wb, `Kits_JCB_${selectedMonth}.xlsx`);
  };

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredKits.map(k => ({
      Data: formatDate(k.data),
      'Evento Syonet': k.eventoSyonet,
      Cliente: k.cliente,
      'Nota Fiscal': k.notaFiscal || '-',
      Vendedor: k.vendedor
    })));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Kits_JCB_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold flex items-center gap-2">
            <Wrench size={20} className="text-yellow-500" />
            Kits (Importados de Vendas JCB)
          </h3>
          
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
            >
              <option value="all">Todos os meses</option>
              {availableMonths.map(m => {
                const [year, month] = m.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' });
                return (
                  <option key={m} value={m}>
                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
                  </option>
                );
              })}
            </select>

            <div className="flex items-center gap-2 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
              <button 
                onClick={exportPDF}
                className="p-2 hover:bg-white hover:shadow-sm rounded text-red-600 transition-all"
                title="Exportar PDF"
              >
                <FileText size={18} />
              </button>
              <button 
                onClick={exportExcel}
                className="p-2 hover:bg-white hover:shadow-sm rounded text-green-600 transition-all"
                title="Exportar Excel"
              >
                <FileSpreadsheet size={18} />
              </button>
              <button 
                onClick={exportCSV}
                className="p-2 hover:bg-white hover:shadow-sm rounded text-blue-600 transition-all"
                title="Exportar CSV"
              >
                <FileDown size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                <th className="px-3 py-3 whitespace-nowrap">Data</th>
                <th className="px-3 py-3 whitespace-nowrap">Evento Syonet</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3 whitespace-nowrap">Nota Fiscal</th>
                <th className="px-3 py-3 whitespace-nowrap">Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredKits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-zinc-400 italic">Nenhum kit registrado para este período.</td>
                </tr>
              ) : (
                filteredKits.map(kit => (
                  <tr key={kit.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-zinc-600 whitespace-nowrap">
                      {formatDate(kit.data)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{kit.eventoSyonet}</td>
                    <td className="px-3 py-3 font-medium text-xs break-words">{kit.cliente}</td>
                    <td className="px-3 py-3 text-xs text-zinc-600">{kit.notaFiscal || '-'}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-[10px] font-bold uppercase">{kit.vendedor}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
