import type { Modulo } from './tipos'
import { sono } from './sono'
import { telas } from './telas'
import { alimentacao } from './alimentacao'
import { limites } from './limites'
import { escola } from './escola'
import { adolescencia } from './adolescencia'

/** Módulos que usam o motor genérico do app (o SOS Birra tem telas próprias e vem de conteudo.ts). */
export const MODULOS: Record<string, Modulo> = { sono, telas, alimentacao, limites, escola, adolescencia }

/** Vitrine de todos os módulos (nome, frase e descrição), usada na tela "Módulos" e no pagamento. */
export const CATALOGO: Record<string, { nome: string; icone: string; frase: string; detalhe: string }> = {
  birra: { nome: 'SOS Birra', icone: '🧩', frase: 'Quando seu filho perde o controle e você não sabe como reagir.', detalhe: 'Orientações personalizadas para birras, choro intenso e frustrações, com 4 bônus interativos.' },
  sono: { nome: 'SOS Sono', icone: '🌙', frase: 'Quando chega a hora de dormir e começa outra batalha.', detalhe: 'Rotinas noturnas adaptadas à idade e horários de descanso.' },
  telas: { nome: 'SOS Telas', icone: '📱', frase: 'Quando tirar o celular vira motivo de discussão.', detalhe: 'Combinados de uso de telas e sugestões de atividades alternativas.' },
  alimentacao: { nome: 'SOS Alimentação', icone: '🍽️', frase: 'Quando a hora de comer vira um momento de tensão.', detalhe: 'Refeições organizadas e orientações educativas para a resistência alimentar.' },
  limites: { nome: 'SOS Limites', icone: '❤️', frase: 'Quando você precisa dizer não, mas não sabe como.', detalhe: 'Frases e estratégias para limites adequados à idade.' },
  escola: { nome: 'SOS Escola', icone: '🎒', frase: 'Quando surgem dificuldades com tarefas, amizades ou adaptação escolar.', detalhe: 'Organize situações escolares e prepare conversas com professores e responsáveis.' },
  adolescencia: { nome: 'SOS Adolescência', icone: '🌱', frase: 'Quando conversar com seu filho parece cada vez mais difícil.', detalhe: 'Ferramentas para conversas sobre autonomia, conflitos familiares e vida digital.' },
}
