/* Formato dos módulos. O app (app/js/modulo.js) sabe desenhar cada tipo de ferramenta; para criar um módulo novo
   basta descrever as ferramentas aqui, sem mexer no app. Orientações educativas, sem diagnóstico. */
export type Faixa = { id: string; rotulo: string }
export type Frases = { a: string; l: string }   // a = acolher / abrir; l = manter o limite / combinar

export type Situacao = {
  id: string; nome: string; leitura: string; fazer: string[]; evitar: string[]
  frases: Record<string, Frases>; depois: string[]; alerta?: string
}
export type Ferramenta =
  | { id: string; tipo: 'situacoes'; nome: string; descricao: string; icone: string; situacoes: Situacao[]; porFaixa: Record<string, { expectativa: string; dica: string }> }
  | { id: string; tipo: 'rotinaSono'; nome: string; descricao: string; icone: string; porFaixa: Record<string, { horas: [number, number]; dormir: string; acordar: string; dica: string }>; passos: { texto: string; antes: number; faixas?: string[] }[] }
  | { id: string; tipo: 'combinado'; nome: string; descricao: string; icone: string; titulo: string; intro: string; fecho: string
      secoes: { id: string; titulo: string; modo: 'multi' | 'escolha'; itens: { id: string; texto: string; padrao?: boolean; faixas?: string[] }[]; dica?: Record<string, string> }[] }
  | { id: string; tipo: 'ideias'; nome: string; descricao: string; icone: string; categorias: { id: string; nome: string }[]; itens: { texto: string; categoria: string; faixas?: string[] }[] }
  | { id: string; tipo: 'modelo'; nome: string; descricao: string; icone: string; modelos: { id: string; nome: string; campos: { id: string; rotulo: string; area?: boolean; opcional?: boolean; exemplo?: string }[]; texto: string }[] }
  | { id: string; tipo: 'registro'; nome: string; descricao: string; icone: string; resumo?: 'sono' | 'minutos'
      campos: { id: string; rotulo: string; tipo: 'data' | 'hora' | 'escolha' | 'numero' | 'texto'; opcoes?: { id: string; nome: string }[]; insight?: boolean; padrao?: string }[] }
  | { id: string; tipo: 'ajuda'; nome: string; descricao: string; icone: string; blocos: { titulo: string; itens: string[] }[]; recursos?: { nome: string; texto: string }[] }

export type Modulo = {
  id: string; nome: string; icone: string; resumo: string
  faixas: Faixa[]; ferramentas: Ferramenta[]
  /** mostra o bloco "Quando procurar ajuda" em destaque no início do módulo */
  ajudaDestaque?: boolean
}
export const FAIXAS_INFANCIA: Faixa[] = [
  { id: '2-3', rotulo: '2 a 3 anos' }, { id: '4-5', rotulo: '4 a 5 anos' }, { id: '6-7', rotulo: '6 a 7 anos' }, { id: '8-10', rotulo: '8 a 10 anos' },
]
export const FAIXAS_ADOLESCENCIA: Faixa[] = [
  { id: '11-12', rotulo: '11 a 12 anos' }, { id: '13-14', rotulo: '13 a 14 anos' }, { id: '15-17', rotulo: '15 a 17 anos' },
]
