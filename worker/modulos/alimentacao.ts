import { type Modulo, FAIXAS_INFANCIA } from './tipos'

/* Base: divisão de responsabilidades à mesa. Os pais decidem o que, quando e onde se come; a criança decide se come
   e quanto. Sem pressão, sem prêmio e sem castigo com a comida. */
export const alimentacao: Modulo = {
  id: 'alimentacao', nome: 'SOS Alimentação', icone: '🍽️',
  resumo: 'Refeições organizadas e orientações para a resistência alimentar.',
  faixas: FAIXAS_INFANCIA,
  ferramentas: [
    {
      id: 'refeicao', tipo: 'situacoes', icone: '🆘', nome: 'SOS Refeição',
      descricao: 'Quando a hora de comer vira um momento de tensão.',
      porFaixa: {
        '2-3': { expectativa: 'Recusar comida nova é esperado nessa idade. Pode ser preciso oferecer o mesmo alimento 10 a 15 vezes, sem pressão, para ele aceitar.', dica: 'Ofereça pequenas porções, junto de algo que ele já come. Coma o mesmo alimento na frente dele.' },
        '4-5': { expectativa: 'A criança já opina sobre o que gosta. Participar do preparo aumenta a vontade de provar.', dica: 'Deixe-o escolher entre duas opções saudáveis e ajudar em tarefas simples da cozinha.' },
        '6-7': { expectativa: 'Ele entende o "porquê" dos alimentos, e o ambiente da mesa influencia muito. Comparações com irmãos pioram a resistência.', dica: 'Converse sobre o dia durante a refeição, em vez de falar sobre quanto ele comeu.' },
        '8-10': { expectativa: 'A criança tem mais autonomia e gostos definidos. Respeito aos gostos, com a oferta variada, funciona melhor do que obrigar.', dica: 'Envolva-o no planejamento do cardápio da semana, dentro de uma lista de opções.' },
      },
      situacoes: [
        {
          id: 'recusa', nome: 'Recusa comida nova ou legumes',
          leitura: 'Desconfiar de comida nova é uma proteção natural. A aceitação vem com a repetição, sem pressão.',
          fazer: ['Sirva uma porção bem pequena do alimento novo ao lado de algo que ele já come.', 'Coma o mesmo alimento na frente dele, com prazer, sem comentar sobre ele.', 'Ofereça de novo outro dia, sem insistir. Pode levar muitas tentativas.', 'Deixe-o tocar, cheirar e lamber. Isso já é progresso.', 'Retire o prato com calma se não quiser, sem castigo e sem prêmio.'],
          evitar: ['Obrigar a "provar uma garfada"', 'Fazer "aviãozinho" ou chantagem', 'Dizer "se comer, ganha sobremesa"'],
          frases: {
            '2-3': { a: 'Hoje você não quer. Tudo bem.', l: 'Está no prato. Você come se quiser.' },
            '4-5': { a: 'Esse é novo, né? Pode só cheirar.', l: 'Eu coloco um pouquinho. Você decide se prova.' },
            '6-7': { a: 'Eu sei que você não gosta muito desse.', l: 'Na mesa tem este prato. Se não comer, tudo bem, mas o próximo lanche é às 15h.' },
            '8-10': { a: 'Respeito que você não goste, mas vale tentar de vez em quando.', l: 'Você escolhe uma parte do prato para provar. A gente conversa depois do que achou.' },
          },
          depois: ['Registre no Diário o que foi aceito, mesmo que pouco.', 'Reapresente o alimento em outro formato (cozido, assado, cru, em pedaços).'],
        },
        {
          id: 'so-quer-doce', nome: 'Só quer lanche ou doce e pede outra comida',
          leitura: 'Doces e lanches são fáceis de gostar. Se estiverem sempre disponíveis, a fome para a refeição diminui.',
          fazer: ['Mantenha horários fixos para refeições e lanches, com intervalo de 2 a 3 horas.', 'Não deixe o lanche ou a bolacha à disposição fora do horário.', 'Sirva a refeição que a família come, com pelo menos um alimento que ele costuma aceitar.', 'Não prepare uma segunda refeição se ele recusar.', 'Inclua um doce pequeno e ocasional sem torná-lo prêmio.'],
          evitar: ['Dar lanche logo depois de recusar a refeição', 'Usar doce como prêmio ou castigo', 'Proibir completamente'],
          frases: {
            '2-3': { a: 'Você quer bolacha. Eu sei.', l: 'Agora é hora do almoço. O lanche é depois.' },
            '4-5': { a: 'Você gosta muito de bolacha!', l: 'A bolacha é no lanche da tarde. Agora é o almoço.' },
            '6-7': { a: 'Eu sei que você prefere doce.', l: 'A comida de agora é esta. O próximo lanche é às 15h.' },
            '8-10': { a: 'Todo mundo gosta de doce, eu também.', l: 'Doce tem seu momento. Agora é refeição, e o próximo lanche é no horário combinado.' },
          },
          depois: ['Combine uma "lista de lanches" para a semana, escolhida em conjunto.'],
        },
        {
          id: 'demora', nome: 'Demora para comer ou brinca na mesa',
          leitura: 'Brincar e demorar é comum quando a criança não está com fome ou quando a refeição não tem um fim claro.',
          fazer: ['Combine a duração: a refeição dura cerca de 20 a 30 minutos.', 'Desligue telas e tire brinquedos da mesa.', 'Avise: "Faltam 5 minutos".', 'Ao final, retire os pratos com calma e sem comentários.', 'Mantenha o próximo lanche para o horário, não antes.'],
          evitar: ['Prolongar por uma hora', 'Dar comida na boca de criança que já come sozinha, só para acabar', 'Brigar enquanto come'],
          frases: {
            '2-3': { a: 'Você está brincando com a comida.', l: 'Acabou o tempo de comer. Vamos limpar as mãos.' },
            '4-5': { a: 'Parece que você não está com muita fome.', l: 'A refeição termina quando o relógio apitar. Se tiver fome depois, o lanche é às 15h.' },
            '6-7': { a: 'Eu vejo que você está distraído.', l: 'Faltam 5 minutos. Depois eu retiro o prato.' },
            '8-10': { a: 'Percebi que você está sem pressa.', l: 'A refeição fecha em 10 minutos. Se não comer, esperamos o próximo horário.' },
          },
          depois: ['Se a demora se repete, ofereça porções menores e veja se o horário do lanche está atrapalhando.'],
        },
        {
          id: 'birra-mesa', nome: 'Faz birra ou joga comida',
          leitura: 'Birra na mesa é, muitas vezes, cansaço, frustração ou teste de limite. Jogar comida é uma forma de dizer "acabou".',
          fazer: ['Mantenha a calma e retire o prato sem drama.', 'Diga a regra em uma frase curta: "A comida fica na mesa".', 'Se continuar, encerre a refeição e leve-o para fora da mesa, sem castigo.', 'Volte a oferecer comida no horário seguinte, sem compensar.', 'Veja se a criança está com sono, fome demais ou distraída por telas.'],
          evitar: ['Gritar ou ameaçar', 'Forçar a comida', 'Rir da atitude'],
          frases: {
            '2-3': { a: 'Você acabou.', l: 'A comida não joga. Acabou o almoço.' },
            '4-5': { a: 'Você está bravo com o prato.', l: 'Comida não joga. Se não quiser mais, diga "terminei".' },
            '6-7': { a: 'Eu vejo que você está com raiva.', l: 'Na mesa a gente não joga comida. Vamos encerrar e tentar de novo no lanche.' },
            '8-10': { a: 'Parece que algo te irritou.', l: 'Comida não é para jogar. Vamos conversar depois, e o próximo lanche é às 15h.' },
          },
          depois: ['Observe se a birra ocorre sempre na mesma refeição, para ajustar horário e fome.'],
        },
        {
          id: 'nao-come', nome: 'Hoje não quis comer quase nada',
          leitura: 'O apetite das crianças varia de refeição para refeição e de dia para dia. Em geral, elas compensam ao longo da semana.',
          fazer: ['Não force. Ofereça água.', 'Mantenha o próximo lanche no horário, com opção nutritiva.', 'Observe a semana toda, não só um dia.', 'Verifique se há sinais de doença (febre, dor, vômito, diarreia).', 'Anote no Diário para ver o padrão da semana.'],
          evitar: ['Compensar com doces', 'Deixar petisco o tempo todo', 'Preocupar-se na frente da criança'],
          frases: {
            '2-3': { a: 'Hoje você está sem fome.', l: 'Tudo bem. Daqui a pouco tem lanche.' },
            '4-5': { a: 'Seu corpo hoje pediu pouco.', l: 'Tudo bem. No lanche eu ofereço de novo.' },
            '6-7': { a: 'Hoje não estava com muita fome.', l: 'Sem problema. O próximo lanche é às 15h.' },
            '8-10': { a: 'Você está sem apetite hoje.', l: 'Tudo bem. Se sentir fome, o lanche está no horário. Se não estiver bem, me conte.' },
          },
          depois: ['Se isso dura vários dias, há perda de peso ou ele parece doente, converse com o pediatra.'],
          alerta: 'Se ele ficou o dia todo sem comer e sem beber, tem febre, vômitos ou parece muito mole, procure atendimento médico.',
        },
      ],
    },
    {
      id: 'combinado', tipo: 'combinado', icone: '🤝', nome: 'Combinado da Refeição',
      descricao: 'Monte as regras da mesa para toda a família.',
      titulo: 'Nosso combinado da hora de comer',
      intro: 'Cada um faz a sua parte para a refeição ser um momento bom da família.',
      fecho: 'Os adultos decidem o que, quando e onde se come. Cada criança decide se come e quanto, dentro do que foi servido.',
      secoes: [
        { id: 'horario', titulo: 'Horários', modo: 'multi', itens: [{ id: 'h1', texto: 'Refeições e lanches em horários fixos, com 2 a 3 horas de intervalo.', padrao: true }, { id: 'h2', texto: 'Fora desses horários, só água.', padrao: true }, { id: 'h3', texto: 'A refeição dura cerca de 20 a 30 minutos.', padrao: true }] },
        { id: 'mesa', titulo: 'Na mesa', modo: 'multi', itens: [{ id: 'm1', texto: 'Sentamos juntos, sem telas.', padrao: true }, { id: 'm2', texto: 'Conversamos sobre o dia.', padrao: true }, { id: 'm3', texto: 'Cada um serve ou ajuda a servir a própria porção.', faixas: ['4-5', '6-7', '8-10'] }, { id: 'm4', texto: 'Podemos pedir mais ou dizer "terminei".', padrao: true }] },
        { id: 'comida', titulo: 'Sobre a comida', modo: 'multi', itens: [{ id: 'c1', texto: 'Sempre há um alimento que a criança costuma aceitar.', padrao: true }, { id: 'c2', texto: 'Alimentos novos aparecem em porções pequenas, sem obrigar a comer.', padrao: true }, { id: 'c3', texto: 'Não se usa comida como prêmio nem como castigo.', padrao: true }, { id: 'c4', texto: 'Doces ficam para ocasiões combinadas.', padrao: true }] },
        { id: 'recusa', titulo: 'Se a criança não quer comer', modo: 'escolha', itens: [{ id: 'r1', texto: 'Tudo bem. A refeição termina e o próximo lanche é no horário combinado.', padrao: true }, { id: 'r2', texto: 'A criança pode ficar à mesa, sem comer, até o tempo da refeição terminar.' }] },
      ],
    },
    {
      id: 'ideias', tipo: 'ideias', icone: '🥕', nome: 'Ideias para a mesa',
      descricao: 'Estratégias práticas para apresentar alimentos.',
      categorias: [{ id: 'apresentar', nome: 'Apresentar alimentos' }, { id: 'participar', nome: 'Participar' }, { id: 'ambiente', nome: 'Ambiente' }],
      itens: [
        { texto: 'Servir um pedacinho do alimento novo ao lado de um que ele ama.', categoria: 'apresentar', faixas: ['2-3', '4-5', '6-7', '8-10'] },
        { texto: 'Oferecer o mesmo alimento de formas diferentes: cozido, assado, cru, em palitos.', categoria: 'apresentar', faixas: ['2-3', '4-5', '6-7'] },
        { texto: 'Cortar frutas e legumes em formas divertidas.', categoria: 'apresentar', faixas: ['2-3', '4-5'] },
        { texto: 'Montar um prato "arco-íris" com várias cores.', categoria: 'apresentar', faixas: ['4-5', '6-7'] },
        { texto: 'Deixar a criança lavar, rasgar folhas e misturar ingredientes.', categoria: 'participar', faixas: ['2-3', '4-5'] },
        { texto: 'Levar ao mercado e deixar escolher uma fruta ou legume novo.', categoria: 'participar', faixas: ['4-5', '6-7', '8-10'] },
        { texto: 'Planejar uma refeição da semana em conjunto.', categoria: 'participar', faixas: ['6-7', '8-10'] },
        { texto: 'Plantar temperos ou tomatinhos em um vaso.', categoria: 'participar', faixas: ['4-5', '6-7', '8-10'] },
        { texto: 'Comer junto, com todos servindo-se do mesmo prato.', categoria: 'ambiente', faixas: ['2-3', '4-5', '6-7', '8-10'] },
        { texto: 'Sem telas e com música calma ao fundo.', categoria: 'ambiente', faixas: ['4-5', '6-7', '8-10'] },
        { texto: 'Usar pratos e talheres adequados ao tamanho dele.', categoria: 'ambiente', faixas: ['2-3', '4-5'] },
        { texto: 'Fazer um "dia do teste" semanal: todos provam algo novo, sem obrigação.', categoria: 'ambiente', faixas: ['6-7', '8-10'] },
      ],
    },
    {
      id: 'diario', tipo: 'registro', icone: '📓', nome: 'Diário Alimentar',
      descricao: 'Registre como foi cada refeição e o que ele aceitou.',
      campos: [
        { id: 'data', rotulo: 'Dia', tipo: 'data' },
        { id: 'refeicao', rotulo: 'Refeição', tipo: 'escolha', insight: true, opcoes: [{ id: 'cafe', nome: 'Café da manhã' }, { id: 'almoco', nome: 'Almoço' }, { id: 'lanche', nome: 'Lanche' }, { id: 'jantar', nome: 'Jantar' }] },
        { id: 'aceitou', rotulo: 'O que aceitou', tipo: 'escolha', insight: true, opcoes: [{ id: 'tudo', nome: 'Quase tudo' }, { id: 'metade', nome: 'Cerca de metade' }, { id: 'pouco', nome: 'Pouco' }, { id: 'nada', nome: 'Nada' }] },
        { id: 'novo', rotulo: 'Alimento novo', tipo: 'texto' },
        { id: 'obs', rotulo: 'Anotações (opcional)', tipo: 'texto' },
      ],
    },
    {
      id: 'ajuda', tipo: 'ajuda', icone: '🩺', nome: 'Quando procurar ajuda',
      descricao: 'Sinais de que vale conversar com o pediatra.',
      blocos: [{ titulo: 'Converse com o pediatra se:', itens: ['Está perdendo peso ou não está ganhando peso e altura como esperado.', 'Aceita uma lista muito pequena de alimentos e recusa grupos inteiros (ou texturas).', 'Engasga, vomita ou tem dor com frequência ao comer.', 'Sente muito medo ou ansiedade na hora de comer.', 'Fica muito tempo sem comer ou beber, ou parece desidratado.', 'Os horários de refeição geram brigas todos os dias há semanas.'] }],
    },
  ],
}
