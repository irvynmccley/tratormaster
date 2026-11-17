import React, { useState, useMemo } from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, TrendingUp, Users, Copy, Check, PieChart } from 'lucide-react';
import { Sale, Goal, CompanyGoal } from '../../types';
import { EQUIPMENTS, SELLERS, SEGMENTOS } from '../../constants';

interface PerformanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  goals: Goal[];
  companyGoals: CompanyGoal[];
}

export const PerformanceReportModal: React.FC<PerformanceReportModalProps> = ({
  isOpen,
  onClose,
  sales = [],
  goals = [],
  companyGoals = []
}) => {
  const [copied, setCopied] = useState(false);

  // Garantir segurança máxima contra dados nulos ou indefinidos
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeCompanyGoals = Array.isArray(companyGoals) ? companyGoals : [];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // 1. Vendas de Máquinas JCB
  const jcbSales = useMemo(() => {
    return safeSales.filter(s => {
      if (!s) return false;
      const marca = (s.marca || 'JCB').trim().toUpperCase();
      return marca === 'JCB' && s.equipamento !== 'Consórcio';
    });
  }, [safeSales]);

  const totalCompanyMeta = useMemo(() => {
    return safeCompanyGoals
      .filter(g => g && g.equipamento !== 'Consórcio')
      .reduce((acc, g) => acc + (Number(g.meta) || 0), 0);
  }, [safeCompanyGoals]);

  const totalRealized = jcbSales.length;
  const companyAchievement = totalCompanyMeta > 0 ? (totalRealized / totalCompanyMeta) * 100 : 0;
  const remainingTarget = Math.max(0, totalCompanyMeta - totalRealized);
  const remainingMonths = Math.max(1, 12 - currentMonth);
  const monthlyRunRate = remainingMonths > 0 ? (remainingTarget / remainingMonths).toFixed(1) : '0';

  // 2. Participação dos Modelos em relação ao total vendido
  const modelStats = useMemo(() => {
    const list = EQUIPMENTS.filter(e => e !== 'Consórcio' && e !== '3CX Plus').map(equip => {
      const isTarget = (saleEquip: string) => saleEquip === equip || (equip === 'Retro 3CX (BHL)' && saleEquip === '3CX Plus');
      const count = jcbSales.filter(s => isTarget(s.equipamento || '')).length;
      const meta = safeCompanyGoals.find(g => g && g.equipamento === equip)?.meta || 0;
      const share = totalRealized > 0 ? (count / totalRealized) * 100 : 0;
      const ach = meta > 0 ? (count / meta) * 100 : 0;
      return {
        name: equip,
        count,
        meta,
        share,
        ach
      };
    }).filter(e => e.count > 0 || e.meta > 0);

    return list.sort((a, b) => b.count - a.count);
  }, [jcbSales, safeCompanyGoals, totalRealized]);

  const carroChefe = modelStats[0] || null;

  // 3. Performance por Consultor
  const sellersData = useMemo(() => {
    return SELLERS.filter(s => ['Anderson', 'Carlos', 'Thalita'].includes(s)).map(seller => {
      const sellerUpper = seller.toUpperCase();
      const sellerSales = jcbSales.filter(s => (s.vendedor || '').trim().toUpperCase() === sellerUpper).length;
      const sellerMeta = safeGoals
        .filter(g => g && (g.vendedor || '').toUpperCase() === sellerUpper && g.equipamento !== 'Consórcio')
        .reduce((acc, g) => acc + (Number(g.meta) || 0), 0);
      const sellerAch = sellerMeta > 0 ? (sellerSales / sellerMeta) * 100 : 0;
      const gap = sellerSales - sellerMeta;

      // Consórcio
      const sellerConsSales = safeSales.filter(s => 
        s && 
        (s.vendedor || '').trim().toUpperCase() === sellerUpper && 
        s.equipamento === 'Consórcio'
      );
      const consRealized = sellerConsSales.reduce((acc, s) => acc + (Number(s.quantidadeCota) || 1), 0);
      const consMeta = safeGoals
        .filter(g => g && (g.vendedor || '').toUpperCase() === sellerUpper && g.equipamento === 'Consórcio')
        .reduce((acc, g) => acc + (Number(g.meta) || 0), 0);
      const consAch = consMeta > 0 ? (consRealized / consMeta) * 100 : 0;

      return {
        name: seller,
        sales: sellerSales,
        meta: sellerMeta,
        achievement: sellerAch,
        gap,
        consRealized,
        consMeta,
        consAch
      };
    });
  }, [jcbSales, safeGoals, safeSales]);

  const topSeller = useMemo(() => {
    if (!sellersData.length) return null;
    return [...sellersData].sort((a, b) => b.sales - a.sales)[0];
  }, [sellersData]);

  // 4. Segmentos
  const segStats = useMemo(() => {
    const validSegSales = safeSales.filter(s => Boolean(s && s.seguimento));
    const totalSegCount = validSegSales.length;
    return SEGMENTOS.map(seg => {
      const count = validSegSales.filter(s => (s.seguimento || '').trim().toLowerCase() === seg.toLowerCase()).length;
      const pct = totalSegCount > 0 ? ((count / totalSegCount) * 100).toFixed(0) : '0';
      return { name: seg, count, pct };
    });
  }, [safeSales]);

  const topSegment = useMemo(() => {
    if (!segStats.length) return null;
    return [...segStats].sort((a, b) => b.count - a.count)[0];
  }, [segStats]);

  // 5. Diagnóstico Analítico
  let statusGeral: 'superando' | 'adequado' | 'atencao' = 'adequado';
  if (companyAchievement >= 100) statusGeral = 'superando';
  else if (companyAchievement < 75) statusGeral = 'atencao';

  const parecerAnalitico = useMemo(() => {
    const concentracao = carroChefe ? `${carroChefe.name} responde por ${carroChefe.share.toFixed(1)}% do volume total (${carroChefe.count} un)` : '';
    const concentracaoSeller = topSeller ? `${topSeller.name} lidera as conversões com ${((topSeller.sales / (totalRealized || 1)) * 100).toFixed(0)}% das máquinas entregues` : '';
    
    if (statusGeral === 'superando') {
      return `Superação de Meta (${companyAchievement.toFixed(1)}%): Com ${totalRealized} máquinas faturadas frente à meta de ${totalCompanyMeta}, a operação alcançou saldo positivo (+${totalRealized - totalCompanyMeta} un). ${concentracao}. O canal de maior tração setorial é ${topSegment?.name || 'Locação'} (${topSegment?.pct}% das demandas registradas).`;
    }
    
    if (statusGeral === 'atencao') {
      return `Atingimento de ${companyAchievement.toFixed(1)}% (${totalRealized}/${totalCompanyMeta} un): Gap de ${remainingTarget} máquinas para fechamento do período, exigindo ritmo de tração de ~${monthlyRunRate} un/mês. Forte concentração de vendas em ${carroChefe?.name || 'Escavadeiras'} (${carroChefe?.share.toFixed(1)}% do mix), enquanto ${concentracaoSeller}.`;
    }

    return `Desempenho Comercial em ${companyAchievement.toFixed(1)}% (${totalRealized}/${totalCompanyMeta} un): Restam ${remainingTarget} unidades para cumprimento integral da meta (necessidade de ~${monthlyRunRate} un/mês). O mix é puxado por ${carroChefe?.name || 'modelos principais'} (${carroChefe?.share.toFixed(1)}% de share). ${concentracaoSeller}.`;
  }, [statusGeral, companyAchievement, totalRealized, totalCompanyMeta, remainingTarget, monthlyRunRate, carroChefe, topSeller, topSegment]);

  // Texto formatado para exportação/cópia
  const reportText = `📊 RELATÓRIO ANALÍTICO DE DESEMPENHO | TRATORMASTER (${currentYear})
  
🎯 VISÃO EXECUTIVA FILIAL:
• Meta Anual: ${totalCompanyMeta} máquinas | Realizado: ${totalRealized} máquinas
• Atingimento Global: ${companyAchievement.toFixed(1)}% | Déficit: ${remainingTarget} un (Run-rate: ~${monthlyRunRate} un/mês)

🚜 PARTICIPAÇÃO DOS MODELOS (% SHARE):
${modelStats.map(m => `• ${m.name}: ${m.share.toFixed(1)}% (${m.count} un vendidas | Meta: ${m.meta} un)`).join('\n')}

👥 DESEMPENHO DOS CONSULTORES:
${sellersData.map(s => `• ${s.name}: ${s.sales}/${s.meta} máq (${s.achievement.toFixed(0)}%) | Consórcio: ${s.consRealized}/${s.consMeta} cotas (${s.consAch.toFixed(0)}%)`).join('\n')}

🌾 DISTRIBUIÇÃO POR SEGUIMENTO:
${segStats.map(s => `• ${s.name}: ${s.pct}% (${s.count} un)`).join(' | ')}

📈 DIAGNÓSTICO DO ANALISTA DE DADOS:
${parecerAnalitico}`;

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(reportText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white uppercase">Relatório Analítico de Desempenho</h3>
              <p className="text-xs text-zinc-400">Realizado vs Meta • Filial Tratormaster {currentYear}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-zinc-800">
          
          {/* Diagnóstico Analítico Aprimorado */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            statusGeral === 'superando' 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : statusGeral === 'adequado'
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}>
            <div className="mt-0.5">
              {statusGeral === 'superando' ? (
                <CheckCircle2 size={20} className="text-emerald-600" />
              ) : statusGeral === 'adequado' ? (
                <TrendingUp size={20} className="text-amber-600" />
              ) : (
                <AlertTriangle size={20} className="text-rose-600" />
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Diagnóstico do Analista de Dados</span>
              <p className="text-sm font-semibold leading-relaxed">{parecerAnalitico}</p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Meta Global</p>
              <p className="text-xl font-black text-zinc-900 mt-1">{totalCompanyMeta} <span className="text-xs font-semibold text-zinc-500">máq</span></p>
            </div>
            <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Realizado</p>
              <p className="text-xl font-black text-zinc-900 mt-1">{totalRealized} <span className="text-xs font-semibold text-zinc-500">máq</span></p>
            </div>
            <div className="p-3.5 bg-yellow-50 border border-yellow-200/80 rounded-2xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-700">Atingimento</p>
              <p className="text-xl font-black text-yellow-800 mt-1">{companyAchievement.toFixed(1)}%</p>
            </div>
          </div>

          {/* Participação dos Modelos no Total Vendido (% Share) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <PieChart size={14} className="text-yellow-600" />
                Participação por Modelo (% do Total Vendido)
              </h4>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Share de Vendas</span>
            </div>

            <div className="space-y-2">
              {modelStats.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-2">Nenhuma venda de equipamento registrada.</p>
              ) : (
                modelStats.map(item => (
                  <div key={item.name} className="p-3 bg-zinc-50/70 border border-zinc-200/70 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">{item.name}</span>
                        <span className="text-[11px] text-zinc-400">({item.count} un)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-200/70">
                          {item.share.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso do Share */}
                    <div className="w-full bg-zinc-200/70 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(item.share, 2))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Performance por Consultor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <Users size={14} className="text-yellow-600" />
                Desempenho por Consultor
              </h4>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Realizado / Meta</span>
            </div>

            <div className="space-y-2">
              {sellersData.map(seller => (
                <div key={seller.name} className="p-3 bg-zinc-50/70 border border-zinc-200/70 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-zinc-900 text-sm block">{seller.name}</span>
                    <span className="text-[11px] text-zinc-500 block">
                      Consórcio: <strong className="text-zinc-800">{seller.consRealized}/{seller.consMeta}</strong> ({seller.consAch.toFixed(0)}%)
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-black text-sm text-zinc-900">{seller.sales} / {seller.meta}</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        seller.achievement >= 100 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : seller.achievement >= 75
                          ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {seller.achievement.toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block">
                      {seller.gap >= 0 ? `+${seller.gap} un sobre a meta` : `${Math.abs(seller.gap)} un restantes`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divisão por Seguimento */}
          <div className="p-4 bg-zinc-50 border border-zinc-200/70 rounded-2xl space-y-2 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Divisão por Seguimento</span>
            <div className="flex items-center justify-between gap-2 pt-1">
              {segStats.map(s => (
                <div key={s.name} className="text-center flex-1">
                  <span className="text-[10px] font-bold text-zinc-500 block">{s.name}</span>
                  <span className="font-black text-zinc-900 text-sm">{s.pct}%</span>
                  <span className="text-[9px] text-zinc-400 block">({s.count} un)</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-xs font-bold text-zinc-800 transition-colors cursor-pointer shadow-sm"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            {copied ? 'Copiado para Área de Transferência!' : 'Copiar Relatório'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
