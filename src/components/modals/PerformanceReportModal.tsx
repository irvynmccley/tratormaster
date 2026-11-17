import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Target, Award, Users, Copy, Check } from 'lucide-react';
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
  sales,
  goals,
  companyGoals
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Métricas Gerais da Empresa (JCB)
  const jcbSales = sales.filter(s => (s.marca || 'JCB').trim().toUpperCase() === 'JCB');
  const totalCompanyMeta = companyGoals.filter(g => g.equipamento !== 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
  const totalRealized = jcbSales.length;
  const companyAchievement = totalCompanyMeta > 0 ? (totalRealized / totalCompanyMeta) * 100 : 0;
  const remainingTarget = Math.max(0, totalCompanyMeta - totalRealized);
  const remainingMonths = Math.max(1, 12 - currentMonth);
  const monthlyRunRate = Math.ceil(remainingTarget / remainingMonths);

  // Performance por Consultor (JCB Máquinas)
  const sellersData = SELLERS.filter(s => ['Anderson', 'Carlos', 'Thalita'].includes(s)).map(seller => {
    const sellerSales = jcbSales.filter(s => (s.vendedor || '').trim().toUpperCase() === seller.toUpperCase()).length;
    const sellerMeta = goals.filter(g => g.vendedor === seller && g.equipamento !== 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
    const sellerAch = sellerMeta > 0 ? (sellerSales / sellerMeta) * 100 : 0;
    const gap = sellerSales - sellerMeta;

    // Consórcio
    const sellerConsSales = sales.filter(s => (s.vendedor || '').trim().toUpperCase() === seller.toUpperCase() && s.equipamento === 'Consórcio');
    const consRealized = sellerConsSales.reduce((acc, s) => acc + (s.quantidadeCota || 1), 0);
    const consMeta = goals.filter(g => g.vendedor === seller && g.equipamento === 'Consórcio').reduce((acc, g) => acc + g.meta, 0);
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

  // Equipamentos Destaque e Gargalo
  const equipData = EQUIPMENTS.filter(e => e !== 'Consórcio' && e !== '3CX Plus').map(equip => {
    const isTarget = (saleEquip: string) => saleEquip === equip || (equip === 'Retro 3CX (BHL)' && saleEquip === '3CX Plus');
    const realized = jcbSales.filter(s => isTarget(s.equipamento || '')).length;
    const meta = companyGoals.find(g => g.equipamento === equip)?.meta || 0;
    const ach = meta > 0 ? (realized / meta) * 100 : 0;
    return { name: equip, realized, meta, ach, gap: realized - meta };
  }).filter(e => e.meta > 0 || e.realized > 0);

  const topEquip = [...equipData].sort((a, b) => b.ach - a.ach)[0];
  const bottomEquip = [...equipData].filter(e => e.meta > 0).sort((a, b) => a.ach - b.ach)[0];

  // Segmentos
  const validSegSales = sales.filter(s => Boolean(s.seguimento));
  const totalSegCount = validSegSales.length;
  const segStats = SEGMENTOS.map(seg => {
    const count = validSegSales.filter(s => (s.seguimento || '').trim().toLowerCase() === seg.toLowerCase()).length;
    const pct = totalSegCount > 0 ? ((count / totalSegCount) * 100).toFixed(0) : '0';
    return { name: seg, count, pct };
  });

  // Geração de Parecer Executivo Direto
  let statusGeral: 'superando' | 'adequado' | 'atencao' = 'adequado';
  if (companyAchievement >= 100) statusGeral = 'superando';
  else if (companyAchievement < 75) statusGeral = 'atencao';

  const parecerExecutivo = statusGeral === 'superando'
    ? `A filial atingiu e superou a meta anual com ${companyAchievement.toFixed(1)}% de aproveitamento (${totalRealized} de ${totalCompanyMeta} máquinas vendidas). Foco em maximizar margem e acelerar entregas.`
    : statusGeral === 'adequado'
    ? `Operação em ritmo consistente com ${companyAchievement.toFixed(1)}% da meta realizada (${totalRealized}/${totalCompanyMeta}). Faltam ${remainingTarget} máquinas para fechar o ano (ritmo necessário: ~${monthlyRunRate} un/mês).`
    : `Atenção ao fechamento de metas: atingimento atual de ${companyAchievement.toFixed(1)}% (${totalRealized}/${totalCompanyMeta}). Déficit de ${remainingTarget} máquinas; requer aceleração comercial para atingir ${monthlyRunRate} un/mês.`;

  // Montar texto para cópia rápida (WhatsApp / Email)
  const reportText = `📊 RELATÓRIO ANALÍTICO REALIZADO x META | TRATORMASTER (${currentYear})
  
🎯 VISÃO GERAL FILIAL:
• Meta Anual: ${totalCompanyMeta} máquinas
• Realizado: ${totalRealized} máquinas (${companyAchievement.toFixed(1)}% atingido)
• Saldo Restante: ${remainingTarget} unidades (~${monthlyRunRate} un/mês necessárias)

👥 DESEMPENHO DOS CONSULTORES:
${sellersData.map(s => `• ${s.name}: ${s.sales}/${s.meta} máquinas (${s.achievement.toFixed(0)}%) | Consórcio: ${s.consRealized}/${s.consMeta} cotas (${s.consAch.toFixed(0)}%)`).join('\n')}

🚜 EQUIPAMENTOS:
• Maior Aderência: ${topEquip ? `${topEquip.name} (${topEquip.realized}/${topEquip.meta} - ${topEquip.ach.toFixed(0)}%)` : 'N/A'}
• Ponto de Atenção: ${bottomEquip ? `${bottomEquip.name} (${bottomEquip.realized}/${bottomEquip.meta} - ${bottomEquip.ach.toFixed(0)}%)` : 'N/A'}

🌾 SEGMENTOS PARTICIPAÇÃO:
${segStats.map(s => `• ${s.name}: ${s.count} un (${s.pct}%)`).join(' | ')}

💡 PARECER EXECUTIVO:
${parecerExecutivo}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]"
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
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-zinc-800">
          
          {/* Parecer Executivo Direto */}
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
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Diagnóstico Executivo</span>
              <p className="text-sm font-semibold leading-relaxed">{parecerExecutivo}</p>
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

          {/* Destaque Equipamentos & Segmentos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-zinc-50 border border-zinc-200/70 rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Destaques por Equipamento</span>
              {topEquip && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 truncate mr-2">Maior atingimento:</span>
                  <span className="font-black text-zinc-900 whitespace-nowrap">{topEquip.name} ({topEquip.ach.toFixed(0)}%)</span>
                </div>
              )}
              {bottomEquip && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 truncate mr-2">Maior atenção:</span>
                  <span className="font-black text-rose-700 whitespace-nowrap">{bottomEquip.name} ({bottomEquip.ach.toFixed(0)}%)</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200/70 rounded-2xl space-y-2">
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
      </motion.div>
    </div>
  );
};
