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
  FileDown
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
  LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { supabase } from './lib/supabase';
import { Sale, Goal, Seller, Equipment, Condition, Marca, Kit } from './types';
import { EQUIPMENTS, SELLERS, CONDITIONS, INITIAL_GOALS, MARCAS } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COMMISSION_RATE = 0.015; // 1.5%

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendas' | 'metas' | 'kits' | 'comissao'>('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not configured. Using local storage as fallback.');
      const savedSales = localStorage.getItem('trator_sales');
      if (savedSales) setSales(JSON.parse(savedSales));
      
      const savedGoals = localStorage.getItem('trator_goals');
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch Sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .order('data', { ascending: false });
          
        if (salesError) throw salesError;

        if (salesData) {
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
            recebidoGerente: s.recebido_gerente
          }));
          setSales(formattedSales);
        }

        // Fetch Goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*');
          
        if (goalsError) throw goalsError;

        if (goalsData && goalsData.length > 0) {
          const formattedGoals: Goal[] = goalsData.map(g => ({
            vendedor: g.vendedor as Seller,
            equipamento: g.equipamento as Equipment,
            meta: Number(g.meta)
          }));
          
          // Merge fetched goals with INITIAL_GOALS to ensure all combinations exist
          const mergedGoals = INITIAL_GOALS.map(initialGoal => {
            const fetchedGoal = formattedGoals.find(g => g.vendedor === initialGoal.vendedor && g.equipamento === initialGoal.equipamento);
            return fetchedGoal || initialGoal;
          });
          setGoals(mergedGoals);
        }
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!supabase) {
      localStorage.setItem('trator_sales', JSON.stringify(sales));
    }
  }, [sales]);

  useEffect(() => {
    if (!supabase) {
      localStorage.setItem('trator_goals', JSON.stringify(goals));
    }
  }, [goals]);

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
        .single();

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
            </div>
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
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DashboardTab sales={sales} goals={goals} />
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
              <MetasTab goals={goals} sales={sales} onUpdateGoal={updateGoal} />
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
function DashboardTab({ sales, goals }: { sales: Sale[], goals: Goal[] }) {
  const totalSales = sales.reduce((acc, s) => acc + s.valor, 0);
  const salesCount = sales.length;

  const handleShare = async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${title}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to share', err);
    }
  };

  const equipmentPerformance = useMemo(() => {
    return EQUIPMENTS.filter(e => e !== 'Consórcio').map(equip => {
      const realized = sales.filter(s => s.equipamento === equip).length;
      const meta = goals.filter(g => g.equipamento === equip).reduce((acc, g) => acc + g.meta, 0);
      return {
        name: equip,
        realizado: realized,
        meta: meta
      };
    }).filter(e => e.meta > 0 || e.realizado > 0);
  }, [sales, goals]);

  const salesBySellerQty = useMemo(() => {
    return SELLERS.map(seller => {
      const realized = sales.filter(s => s.vendedor === seller && s.equipamento !== 'Consórcio').length;
      const meta = goals.filter(g => g.vendedor === seller && g.equipamento !== 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
      return {
        name: seller,
        realizado: realized,
        meta: meta
      };
    }).sort((a, b) => b.realizado - a.realizado);
  }, [sales, goals]);

  const consorcioData = useMemo(() => {
    const consorcioSales = sales.filter(s => s.equipamento === 'Consórcio');
    
    const bySeller = SELLERS.map(seller => {
      const sellerSales = consorcioSales.filter(s => s.vendedor === seller);
      const realized = sellerSales.reduce((acc, s) => acc + (s.quantidadeCota || 1), 0);
      const meta = goals.filter(g => g.vendedor === seller && g.equipamento === 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
      const valor = sellerSales.reduce((acc, s) => acc + s.valor, 0);
      return { name: seller, realizado: realized, meta, valor };
    });

    const byMonthMap = new Map<string, { month: string, [seller: string]: any, totalQty: number, totalValue: number }>();
    
    consorcioSales.forEach(s => {
      const date = new Date(s.data);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, { month: monthLabel, totalQty: 0, totalValue: 0 });
      }
      
      const monthData = byMonthMap.get(monthKey)!;
      const qtd = s.quantidadeCota || 1;
      monthData[s.vendedor] = (monthData[s.vendedor] || 0) + qtd;
      monthData.totalQty += qtd;
      monthData.totalValue += s.valor;
    });

    const byMonth = Array.from(byMonthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    
    const totalGeralValor = consorcioSales.reduce((acc, s) => acc + s.valor, 0);
    const totalGeralQty = consorcioSales.reduce((acc, s) => acc + (s.quantidadeCota || 1), 0);
    const totalGeralMeta = goals.filter(g => g.equipamento === 'Consórcio').reduce((acc, g) => acc + g.meta, 0);

    return { bySeller, byMonth, totalGeralValor, totalGeralQty, totalGeralMeta };
  }, [sales, goals]);

  // Colors for each consultant
  const sellerColors: Record<string, string> = {
    'Anderson': 'url(#colorAnderson)',
    'Carlos': 'url(#colorCarlos)',
    'Thalita': 'url(#colorThalita)'
  };

  // Custom 3D Bar Shape
  const ThreeDBar = (props: any) => {
    const { fill, x, y, width, height } = props;
    const depth = 8;
    if (height === 0 || isNaN(height)) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} />
        <path d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`} fill={fill} filter="brightness(1.2)" />
        <path d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`} fill={fill} filter="brightness(0.8)" />
      </g>
    );
  };

  return (
    <div className="space-y-8">
      <svg width="0" height="0">
        <defs>
          <linearGradient id="colorRealizado" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="colorMeta" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d4d4d8" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>
          <linearGradient id="colorAnderson" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="colorCarlos" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="colorThalita" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
        </defs>
      </svg>

      <div className="grid grid-cols-1 gap-6">
        <StatCard 
          label="Total de Vendas (Geral)" 
          value={`${salesCount} unidades`}
          icon={<DollarSign className="text-yellow-400" />}
          trend={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSales)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div id="panel-consultores" className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 relative lg:col-span-2">
          <button onClick={() => handleShare('panel-consultores', 'Vendas_Consultor')} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Compartilhar">
            <Share2 size={18} />
          </button>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Users size={20} className="text-yellow-500" />
            Vendas por Consultor (Máquinas)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesBySellerQty} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar shape={<ThreeDBar />} name="Realizado" dataKey="realizado">
                  {salesBySellerQty.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={sellerColors[entry.name] || 'url(#colorRealizado)'} />
                  ))}
                  <LabelList dataKey="realizado" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#52525b' }} />
                </Bar>
                <Bar shape={<ThreeDBar />} name="Meta" dataKey="meta" fill="url(#colorMeta)">
                  <LabelList dataKey="meta" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#52525b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div id="panel-equipamentos" className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 relative lg:col-span-2">
          <button onClick={() => handleShare('panel-equipamentos', 'Desempenho_Equipamentos')} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Compartilhar">
            <Share2 size={18} />
          </button>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Target size={20} className="text-yellow-500" />
            Desempenho por Equipamento (Realizado vs Meta)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipmentPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0}
                  height={80}
                  style={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar shape={<ThreeDBar />} name="Realizado" dataKey="realizado" fill="url(#colorRealizado)">
                  <LabelList dataKey="realizado" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#52525b' }} />
                </Bar>
                <Bar shape={<ThreeDBar />} name="Meta" dataKey="meta" fill="url(#colorMeta)">
                  <LabelList dataKey="meta" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#52525b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div id="panel-consorcio" className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 relative lg:col-span-2">
          <button onClick={() => handleShare('panel-consorcio', 'Painel_Consorcio')} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Compartilhar">
            <Share2 size={18} />
          </button>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Package size={20} className="text-yellow-500" />
            Painel Consórcio
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Meta Total (Cotas)</p>
                <p className="text-2xl font-black">{consorcioData.totalGeralMeta}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Cotas Vendidas</p>
                <p className="text-2xl font-black">{consorcioData.totalGeralQty}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Valor Total (R$)</p>
                <p className="text-xl font-black text-yellow-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(consorcioData.totalGeralValor)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {consorcioData.bySeller.map(seller => (
                <div key={seller.name} className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">{seller.name}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Meta:</span>
                      <span className="font-bold">{seller.meta} cotas</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Vendidas:</span>
                      <span className="font-bold">{seller.realizado} cotas</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-zinc-200 mt-2">
                      <span className="text-zinc-500">Valor Total:</span>
                      <span className="font-bold text-yellow-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.valor)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consorcioData.bySeller} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8f9fa' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Bar shape={<ThreeDBar />} name="Cotas Vendidas" dataKey="realizado">
                    {consorcioData.bySeller.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={sellerColors[entry.name] || 'url(#colorRealizado)'} />
                    ))}
                    <LabelList dataKey="realizado" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#52525b' }} />
                  </Bar>
                  <Bar shape={<ThreeDBar />} name="Meta" dataKey="meta" fill="url(#colorMeta)">
                    <LabelList dataKey="meta" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#52525b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {consorcioData.byMonth.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-zinc-700 mb-3">Evolução Mensal (Cotas)</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consorcioData.byMonth} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8f9fa' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" />
                      {SELLERS.map(seller => (
                        <Bar key={seller} shape={<ThreeDBar />} name={seller} dataKey={seller} stackId="a" fill={sellerColors[seller] || 'url(#colorRealizado)'} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMISSÃO GERENTE TAB ---
const MANAGER_COMMISSION_RATE = 0.002; // 0.2%

function ComissaoGerenteTab({ sales, onToggleRecebido }: { sales: Sale[], onToggleRecebido: (id: string) => void }) {
  const totalSalesValue = sales.reduce((acc, s) => acc + s.valor, 0);
  
  const salesJCB = sales.filter(s => s.marca === 'JCB').reduce((acc, s) => acc + s.valor, 0);
  const salesEP = sales.filter(s => s.marca === 'EP').reduce((acc, s) => acc + s.valor, 0);
  const salesClark = sales.filter(s => s.marca === 'Clark').reduce((acc, s) => acc + s.valor, 0);

  const pendingSales = sales.filter(s => !s.recebidoGerente);
  const totalManagerCommission = pendingSales.reduce((acc, s) => acc + (s.valor * MANAGER_COMMISSION_RATE), 0);

  const sortedSales = [...sales].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="space-y-8">
      <div className="bg-black text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-10 -mt-10 blur-3xl" />
        <h3 className="text-zinc-400 text-sm font-medium mb-4">Resumo de Vendas e Comissão</h3>
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
        <div className="p-6 border-b border-zinc-100">
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp size={20} className="text-yellow-500" />
            Detalhamento de Comissões - Gerência
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Valor da Venda</th>
                <th className="px-6 py-4">Comissão (0,2%)</th>
                <th className="px-6 py-4">Recebido?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma venda para calcular comissão.</td>
                </tr>
              ) : (
                sortedSales.map(sale => {
                  const commission = sale.valor * MANAGER_COMMISSION_RATE;
                  return (
                    <tr key={sale.id} className={cn(
                      "hover:bg-zinc-50 transition-colors",
                      sale.recebidoGerente && "opacity-50"
                    )}>
                      <td className={cn("px-6 py-4 text-sm text-zinc-600", sale.recebidoGerente && "line-through")}>
                        {new Date(sale.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className={cn("px-6 py-4 font-medium", sale.recebidoGerente && "line-through")}>{sale.cliente}</td>
                      <td className={cn("px-6 py-4 text-sm text-zinc-600", sale.recebidoGerente && "line-through")}>{sale.equipamento}</td>
                      <td className={cn("px-6 py-4", sale.recebidoGerente && "line-through")}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor)}
                      </td>
                      <td className={cn("px-6 py-4 text-yellow-600 font-bold", sale.recebidoGerente && "line-through")}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(commission)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={sale.recebidoGerente}
                            onChange={() => onToggleRecebido(sale.id)}
                            className="w-5 h-5 accent-yellow-400 cursor-pointer"
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
                  <td colSpan={4} className="px-6 py-4 font-bold text-right uppercase tracking-widest text-[10px]">Total Pendente Gerente:</td>
                  <td colSpan={2} className="px-6 py-4 font-black text-xl text-yellow-400">
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

function StatCard({ label, value, icon, trend }: { label: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-black text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-yellow-400/20 transition-all duration-500" />
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{trend}</span>
      </div>
      <p className="text-zinc-400 text-sm font-medium mb-1">{label}</p>
      <h4 className="text-2xl font-black tracking-tight">{value}</h4>
    </div>
  );
}

// --- VENDAS TAB ---
function VendasTab({ sales, onAddSale, onEditSale, onDeleteSale }: { sales: Sale[], onAddSale: (sale: any) => void, onEditSale: (sale: Sale) => void, onDeleteSale: (id: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Sale>>({
    marca: MARCAS[0],
    data: new Date().toISOString().split('T')[0],
    eventoSyonet: '',
    cliente: '',
    equipamento: EQUIPMENTS[0],
    valor: 0,
    vendedor: SELLERS[0],
    condicao: CONDITIONS[0],
    notaFiscal: '',
    quantidadeCota: 1
  });

  const handleEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setFormData({
      marca: sale.marca || 'JCB',
      data: sale.data ? sale.data.split('T')[0] : new Date().toISOString().split('T')[0],
      eventoSyonet: sale.eventoSyonet || '',
      cliente: sale.cliente || '',
      equipamento: sale.equipamento || EQUIPMENTS[0],
      valor: sale.valor || 0,
      vendedor: sale.vendedor || SELLERS[0],
      condicao: sale.condicao || CONDITIONS[0],
      notaFiscal: sale.notaFiscal || '',
      quantidadeCota: sale.quantidadeCota || 1
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente || !formData.valor) return;
    
    const dataIso = new Date(formData.data || new Date()).toISOString();

    const saleData: any = {
      marca: formData.marca,
      data: dataIso,
      cliente: formData.cliente,
      valor: Number(formData.valor),
      vendedor: formData.vendedor,
    };

    if (formData.marca === 'JCB') {
      saleData.eventoSyonet = formData.eventoSyonet;
      saleData.equipamento = formData.equipamento;
      saleData.notaFiscal = formData.notaFiscal;
      saleData.condicao = formData.condicao;
    } else if (formData.marca === 'EP' || formData.marca === 'Clark') {
      saleData.eventoSyonet = formData.eventoSyonet;
      saleData.equipamento = formData.equipamento;
      saleData.notaFiscal = formData.notaFiscal;
    } else if (formData.marca === 'Consórcio') {
      saleData.quantidadeCota = Number(formData.quantidadeCota);
      saleData.equipamento = 'Consórcio';
    }

    if (editingId) {
      onEditSale({ ...saleData, id: editingId, recebidoGerente: sales.find(s => s.id === editingId)?.recebidoGerente });
      setEditingId(null);
    } else {
      onAddSale(saleData);
    }
    
    setFormData({
      marca: MARCAS[0],
      data: new Date().toISOString().split('T')[0],
      eventoSyonet: '',
      cliente: '',
      equipamento: EQUIPMENTS[0],
      valor: 0,
      vendedor: SELLERS[0],
      condicao: CONDITIONS[0],
      notaFiscal: '',
      quantidadeCota: 1
    });
  };

  const sortedSales = [...sales].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 sticky top-24">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            {editingId ? <Edit2 size={20} className="text-yellow-500" /> : <Plus size={20} className="text-yellow-500" />}
            {editingId ? 'Editar Venda' : 'Lançar Nova Venda'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputGroup label="Marca">
              <select 
                value={formData.marca}
                onChange={e => setFormData({...formData, marca: e.target.value as Marca})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
              >
                {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </InputGroup>

            <InputGroup label="Data">
              <input 
                type="date" 
                value={formData.data}
                onChange={e => setFormData({...formData, data: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
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

            <InputGroup label="Cliente">
              <input 
                type="text" 
                value={formData.cliente}
                onChange={e => setFormData({...formData, cliente: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                placeholder="Nome do cliente"
              />
            </InputGroup>

            {formData.marca !== 'Consórcio' && (
              <InputGroup label="Equipamento">
                {formData.marca === 'JCB' ? (
                  <select 
                    value={formData.equipamento}
                    onChange={e => setFormData({...formData, equipamento: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                  >
                    {EQUIPMENTS.filter(e => e !== 'Consórcio').map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={formData.equipamento}
                    onChange={e => setFormData({...formData, equipamento: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                    placeholder="Nome do equipamento"
                  />
                )}
              </InputGroup>
            )}

            {formData.marca === 'Consórcio' && (
              <InputGroup label="Quantidade de Cotas">
                <input 
                  type="number" 
                  min="1"
                  value={formData.quantidadeCota}
                  onChange={e => setFormData({...formData, quantidadeCota: Number(e.target.value)})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                />
              </InputGroup>
            )}

            <InputGroup label="Valor (R$)">
              <input 
                type="number" 
                step="0.01"
                value={formData.valor || ''}
                onChange={e => setFormData({...formData, valor: e.target.value ? Number(e.target.value) : 0})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                placeholder="0,00"
              />
            </InputGroup>

            <InputGroup label="Vendedor">
              <select 
                value={formData.vendedor}
                onChange={e => setFormData({...formData, vendedor: e.target.value as Seller})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
              >
                {SELLERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </InputGroup>

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
                    setFormData({
                      marca: MARCAS[0],
                      data: new Date().toISOString().split('T')[0],
                      eventoSyonet: '',
                      cliente: '',
                      equipamento: EQUIPMENTS[0],
                      valor: 0,
                      vendedor: SELLERS[0],
                      condicao: CONDITIONS[0],
                      notaFiscal: '',
                      quantidadeCota: 1
                    });
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
      <div className="lg:col-span-2 space-y-8">
        {/* Sales List */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-yellow-500" />
              Últimas Vendas
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Marca</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Equipamento</th>
                  <th className="px-6 py-4">Vendedor</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma venda registrada ainda.</td>
                  </tr>
                ) : (
                  sortedSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-zinc-50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {new Date(sale.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase">{sale.marca || 'JCB'}</span>
                      </td>
                      <td className="px-6 py-4 font-medium">{sale.cliente}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {sale.marca === 'Consórcio' ? `${sale.quantidadeCota || 1} Cota(s)` : sale.equipamento}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase">{sale.vendedor}</span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(sale)}
                            className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteSale(sale.id)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
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
function MetasTab({ goals, sales, onUpdateGoal }: { goals: Goal[], sales: Sale[], onUpdateGoal: (v: Seller, e: Equipment, m: number) => void }) {
  const [selectedSeller, setSelectedSeller] = useState<Seller>(SELLERS[0]);

  const sellerGoals = goals.filter(g => g.vendedor === selectedSeller);
  
  const getRealized = (equip: Equipment) => {
    return sales.filter(s => s.vendedor === selectedSeller && s.equipamento === equip).length;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 justify-center">
        {SELLERS.map(seller => (
          <button
            key={seller}
            onClick={() => setSelectedSeller(seller)}
            className={cn(
              "px-8 py-3 rounded-2xl font-bold uppercase tracking-tighter transition-all",
              selectedSeller === seller 
                ? "bg-black text-white shadow-2xl scale-105" 
                : "bg-white text-zinc-400 hover:text-black hover:bg-zinc-100"
            )}
          >
            {seller}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sellerGoals.map(goal => {
          const realized = getRealized(goal.equipamento);
          const progress = Math.min((realized / goal.meta) * 100, 100);
          
          return (
            <div key={goal.equipamento} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
              <h4 className="text-xs font-black uppercase tracking-tight text-zinc-400 mb-4 h-8 line-clamp-2">{goal.equipamento}</h4>
              
              <div className="flex items-end justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Realizado</span>
                  <span className="text-3xl font-black">{realized}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Meta</span>
                  <input 
                    type="number" 
                    value={goal.meta}
                    onChange={e => onUpdateGoal(selectedSeller, goal.equipamento, parseInt(e.target.value) || 0)}
                    className="w-16 text-right font-bold text-lg bg-zinc-50 border-b-2 border-transparent focus:border-yellow-400 outline-none"
                  />
                </div>
              </div>

              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden mt-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={cn(
                    "h-full rounded-full",
                    progress >= 100 ? "bg-green-500" : "bg-yellow-400"
                  )}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] font-bold text-zinc-400">{progress.toFixed(0)}%</span>
                {progress >= 100 && <span className="text-[10px] font-bold text-green-600 uppercase">Meta Atingida!</span>}
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

  const jcbSales = sales.filter(s => s.marca === 'JCB').map(s => ({
    id: s.id,
    data: s.data,
    eventoSyonet: s.eventoSyonet || '',
    cliente: s.cliente,
    notaFiscal: s.notaFiscal || '',
    vendedor: s.vendedor,
  })).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Extract unique months for the filter
  const availableMonths = Array.from(new Set(jcbSales.map(s => {
    const d = new Date(s.data);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))).sort().reverse();

  const filteredKits = selectedMonth === 'all' 
    ? jcbSales 
    : jcbSales.filter(s => {
        const d = new Date(s.data);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return monthStr === selectedMonth;
      });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Relatório de Kits (Vendas JCB) - ${selectedMonth === 'all' ? 'Todos os meses' : selectedMonth}`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Data', 'Evento Syonet', 'Cliente', 'Nota Fiscal', 'Vendedor']],
      body: filteredKits.map(k => [
        new Date(k.data).toLocaleDateString('pt-BR'),
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
      Data: new Date(k.data).toLocaleDateString('pt-BR'),
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
      Data: new Date(k.data).toLocaleDateString('pt-BR'),
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
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Evento Syonet</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Nota Fiscal</th>
                <th className="px-6 py-4">Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredKits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum kit registrado para este período.</td>
                </tr>
              ) : (
                filteredKits.map(kit => (
                  <tr key={kit.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {new Date(kit.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{kit.eventoSyonet}</td>
                    <td className="px-6 py-4 font-medium">{kit.cliente}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{kit.notaFiscal || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase">{kit.vendedor}</span>
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
