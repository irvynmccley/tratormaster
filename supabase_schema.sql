-- ==========================================
-- SCRIPT DE BANCO DE DADOS PARA O SUPABASE
-- ==========================================
-- Copie e cole este código no SQL Editor do seu projeto Supabase e clique em "Run".

-- 1. Tabela de Vendas (Sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca TEXT NOT NULL,
    data TIMESTAMP WITH TIME ZONE NOT NULL,
    cliente TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    vendedor TEXT NOT NULL,
    evento_syonet TEXT,
    equipamento TEXT,
    nota_fiscal TEXT,
    condicao TEXT,
    quantidade_cota INTEGER,
    observacao TEXT,
    recebido_gerente BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Metas (Goals)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor TEXT NOT NULL,
    equipamento TEXT NOT NULL,
    meta INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Metas da Empresa (Company Goals)
CREATE TABLE IF NOT EXISTS public.company_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipamento TEXT NOT NULL,
    meta INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Kits (Kits Manuais)
CREATE TABLE IF NOT EXISTS public.kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TIMESTAMP WITH TIME ZONE NOT NULL,
    evento_syonet TEXT NOT NULL,
    cliente TEXT NOT NULL,
    nota_fiscal TEXT,
    vendedor TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Políticas de Segurança (RLS - Row Level Security)
-- Por enquanto, vamos permitir leitura e escrita pública para facilitar a migração.
-- Em produção, você deve restringir isso usando a autenticação do Supabase.

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública em sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública em sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública em sales" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção pública em sales" ON public.sales FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública em goals" ON public.goals FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública em goals" ON public.goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública em goals" ON public.goals FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção pública em goals" ON public.goals FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública em company_goals" ON public.company_goals FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública em company_goals" ON public.company_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública em company_goals" ON public.company_goals FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção pública em company_goals" ON public.company_goals FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública em kits" ON public.kits FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública em kits" ON public.kits FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública em kits" ON public.kits FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção pública em kits" ON public.kits FOR DELETE USING (true);
