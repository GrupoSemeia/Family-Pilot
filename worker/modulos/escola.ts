import { type Modulo, FAIXAS_INFANCIA } from './tipos'

export const escola: Modulo = {
  id: 'escola', nome: 'SOS Escola', icone: '🎒',
  resumo: 'Organize situações escolares e prepare conversas com professores e responsáveis.',
  faixas: FAIXAS_INFANCIA,
  ferramentas: [
    {
      id: 'situacoes', tipo: 'situacoes', icone: '🆘', nome: 'SOS Escola',
      descricao: 'Quando surgem dificuldades com tarefas, amizades ou adaptação.',
      porFaixa: {
        '2-3': { expectativa: 'A separação dos pais ainda é difícil. Chorar na entrada é comum e costuma passar em minutos depois da despedida.', dica: 'Despedida curta, calorosa e sempre igual. Saia mesmo se ele chorar; voltar prolonga o sofrimento.' },
        '4-5': { expectativa: 'Ele se adapta melhor quando entende a rotina e sabe quem o espera. Conflitos com colegas fazem parte do aprendizado social.', dica: 'Converse à noite sobre o dia seguinte e desenhe o que vai acontecer na escola.' },
        '6-7': { expectativa: 'Aparecem o dever de casa, a leitura e a comparação com colegas. A frustração com a tarefa é frequente.', dica: 'Reserve um horário e um lugar fixos para o dever, e fique por perto sem fazer por ele.' },
        '8-10': { expectativa: 'Amizades ficam mais importantes e a pressão por notas aumenta. Conflitos e exclusão entre colegas podem machucar muito.', dica: 'Pergunte sobre as amizades e o ambiente, e não só sobre notas.' },
      },
      situacoes: [
        {
          id: 'nao-quer-ir', nome: 'Não quer ir para a escola',
          leitura: 'A recusa pode vir de separação, cansaço, dificuldade com colegas ou com a tarefa. Entender o motivo vem antes de insistir.',
          fazer: ['Pergunte com curiosidade, sem pressão: "O que tem sido difícil na escola?"', 'Mantenha a rotina e a ida à escola, com firmeza e carinho.', 'Faça uma despedida curta e previsível.', 'Combine com a professora um sinal de apoio ou uma tarefa especial na chegada.', 'Observe sinais físicos (dor de barriga, dor de cabeça) que aparecem só em dias de escola.'],
          evitar: ['Deixar em casa na primeira recusa', 'Dizer "é bobagem"', 'Prolongar a despedida'],
          frases: {
            '2-3': { a: 'Você quer ficar com a mamãe e eu sei.', l: 'Agora é hora da escola. Eu volto depois do lanche.' },
            '4-5': { a: 'Dá saudade, eu sei.', l: 'Vou deixar você na escola e te busco na hora do sol. Sua professora está te esperando.' },
            '6-7': { a: 'Parece que algo na escola está difícil. Quer me contar?', l: 'Mesmo assim a gente vai à escola, e eu vou conversar com a sua professora para te ajudar.' },
            '8-10': { a: 'Eu percebo que você está chateado com a escola.', l: 'Você precisa ir à escola. Vamos descobrir juntos o que está difícil e resolver.' },
          },
          depois: ['Converse com a professora sobre o que ela observa.', 'Anote no Diário os dias difíceis, para achar um padrão.'],
          alerta: 'Se a recusa dura semanas, vem com dores físicas ou choro intenso, ou se há suspeita de bullying, procure a escola e um profissional.',
        },
        {
          id: 'dever', nome: 'Dever de casa vira briga',
          leitura: 'Cansaço, dificuldade na tarefa e falta de rotina estão por trás de muitas brigas. O dever é dele, não seu.',
          fazer: ['Escolha um horário e um lugar fixos, sem tela e com pouco barulho.', 'Faça uma pausa curta antes de começar (lanche e movimento).', 'Divida em partes e faça pausas de 5 minutos a cada 15 a 25.', 'Ofereça ajuda a entender, não a fazer.', 'Se travar, comunique à professora; não resolva por ele.'],
          evitar: ['Fazer a tarefa por ele', 'Ficar ao lado criticando', 'Deixar o dever para a hora de dormir'],
          frases: {
            '2-3': { a: 'Você gosta de desenhar.', l: 'Vamos fazer juntos uma folhinha curta.' },
            '4-5': { a: 'Hoje está difícil, eu sei.', l: 'Vamos fazer uma parte e depois um lanche.' },
            '6-7': { a: 'Dá preguiça, e eu entendo.', l: 'A gente começa às 16h, na mesa. Eu fico perto, mas você faz.' },
            '8-10': { a: 'Parece que você ficou travado.', l: 'Vamos fazer uma pausa de 5 minutos e voltar. Se continuar difícil, avisamos a professora.' },
          },
          depois: ['Comunique à professora se a tarefa for sempre difícil ou longa demais.', 'Reconheça o esforço, mesmo se o resultado não for perfeito.'],
          alerta: 'Se há dificuldade persistente de leitura, escrita ou atenção, converse com a escola e peça avaliação ao pediatra.',
        },
        {
          id: 'colegas', nome: 'Conflito ou exclusão entre colegas',
          leitura: 'Conflitos entre colegas são comuns e ajudam a aprender a conviver. Agressões repetidas, exclusão e humilhação precisam de ação.',
          fazer: ['Ouça sem interromper e sem julgar. Agradeça por ter contado.', 'Pergunte o que aconteceu, onde, quem estava, quantas vezes.', 'Se for algo pontual, treine com ele o que dizer e fazer.', 'Se for repetido ou machucar, anote e fale com a escola por escrito.', 'Mantenha contato com a escola até resolver.'],
          evitar: ['Dizer "revide"', 'Resolver diretamente com a outra criança', 'Minimizar o que ele sentiu'],
          frases: {
            '2-3': { a: 'Aquilo doeu, né? Eu estou aqui.', l: 'Vou conversar com a professora para ajudar.' },
            '4-5': { a: 'Que chato isso que aconteceu.', l: 'Se alguém tirar seu brinquedo, diga "não" e chame a professora.' },
            '6-7': { a: 'Obrigado por me contar. Você não fez nada errado.', l: 'Vou falar com a professora, e você me conta se acontecer de novo.' },
            '8-10': { a: 'Imagino como isso foi difícil. Fico feliz que me contou.', l: 'Vamos anotar o que aconteceu e levar à coordenação. Você não está sozinho.' },
          },
          depois: ['Use o modelo "Relato à escola" para registrar o que aconteceu.', 'Acompanhe como ele se sente nos próximos dias.'],
          alerta: 'Se houver ameaça, agressão física, humilhação repetida ou ele estiver muito triste ou com medo de ir à escola, procure a direção da escola e um profissional. Em violência, o Disque 100 recebe denúncias.',
        },
        {
          id: 'nota', nome: 'Notas baixas ou desânimo',
          leitura: 'A nota é um sinal, não o problema em si. Pode haver dificuldade de aprendizado, de atenção, desânimo ou problemas emocionais.',
          fazer: ['Converse com curiosidade: "Como você se sente sobre isso?"', 'Procure a professora para entender onde está a dificuldade.', 'Valorize o esforço e o progresso, não só a nota.', 'Organize uma rotina de estudo simples e com pausas.', 'Observe sono, alimentação e humor.'],
          evitar: ['Comparar com irmãos ou colegas', 'Castigar pela nota', 'Terceirizar tudo para o reforço'],
          frases: {
            '2-3': { a: 'Você está aprendendo.', l: 'Vamos treinar um pouquinho juntos.' },
            '4-5': { a: 'Está difícil e a gente vai ajudar.', l: 'Todo dia vamos treinar um pouquinho.' },
            '6-7': { a: 'Eu sei que você se esforçou.', l: 'Vamos conversar com a professora para entender como ajudar.' },
            '8-10': { a: 'Percebi que você está desanimado com a escola.', l: 'Vamos montar um plano de estudo juntos e rever em duas semanas.' },
          },
          depois: ['Reconheça os progressos pequenos.', 'Considere avaliação se a dificuldade persistir.'],
          alerta: 'Queda brusca no rendimento junto com tristeza, isolamento ou irritação merece conversa com a escola e com um profissional.',
        },
        {
          id: 'adaptacao', nome: 'Escola nova ou mudança de turma',
          leitura: 'Mudanças geram insegurança. A adaptação costuma levar algumas semanas.',
          fazer: ['Visite a escola antes, se possível.', 'Converse sobre o que vai acontecer, com um desenho ou fotos.', 'Combine com a escola uma adaptação gradual.', 'Mantenha a rotina de casa estável.', 'Pergunte todo dia o que foi bom e o que foi difícil.'],
          evitar: ['Prometer que "vai ser ótimo"', 'Mostrar sua ansiedade na despedida', 'Mudar muitas coisas ao mesmo tempo'],
          frases: {
            '2-3': { a: 'Escola nova tem muita coisa para ver.', l: 'Eu te deixo e volto. Sua professora fica com você.' },
            '4-5': { a: 'É normal ter um pouco de medo.', l: 'Vamos ver a escola juntos e conhecer a sua professora.' },
            '6-7': { a: 'Mudar é difícil, mas dá para fazer amigos.', l: 'Nas primeiras semanas, vou perguntar todo dia como foi.' },
            '8-10': { a: 'Eu sei que você está preocupado com os novos colegas.', l: 'Vamos pensar juntos em como se apresentar. Se algo ficar difícil, me conta.' },
          },
          depois: ['Converse com a professora depois de duas semanas.', 'Observe sono, apetite e humor.'],
        },
      ],
    },
    {
      id: 'conversas', tipo: 'modelo', icone: '✉️', nome: 'Conversa com a escola',
      descricao: 'Modelos de mensagem para professores e coordenação.',
      modelos: [
        {
          id: 'professor', nome: 'Mensagem para o(a) professor(a)',
          campos: [
            { id: 'professor', rotulo: 'Nome do(a) professor(a)', exemplo: 'Ana' },
            { id: 'crianca', rotulo: 'Nome da criança', exemplo: 'Pedro' },
            { id: 'situacao', rotulo: 'O que você observou em casa', area: true, exemplo: 'Está com dificuldade para começar o dever de casa e chora antes de ir à escola.' },
            { id: 'pedido', rotulo: 'O que você gostaria de saber ou pedir', area: true, exemplo: 'Como ele tem se comportado na escola e se há algo que eu possa fazer em casa.' },
          ],
          texto: 'Olá, {professor}! Tudo bem?\n\nSou responsável por {crianca} e queria conversar sobre uma situação que tenho observado em casa: {situacao}\n\nGostaria de {pedido}\n\nObrigado(a) pela atenção e pelo cuidado com {crianca}. Estou à disposição para conversar no melhor horário para você.\n\nAtenciosamente,',
        },
        {
          id: 'reuniao', nome: 'Pedido de reunião',
          campos: [
            { id: 'destinatario', rotulo: 'Para quem (professor, coordenação, direção)', exemplo: 'Coordenação' },
            { id: 'crianca', rotulo: 'Nome da criança e turma', exemplo: 'Pedro, 3º ano B' },
            { id: 'assunto', rotulo: 'Assunto da reunião', area: true, exemplo: 'Dificuldades nos estudos e adaptação à turma.' },
            { id: 'horarios', rotulo: 'Dias e horários possíveis', exemplo: 'Terça ou quinta, depois das 17h' },
          ],
          texto: 'Olá, {destinatario}.\n\nGostaria de agendar uma conversa sobre {crianca}. O assunto é: {assunto}\n\nTenho disponibilidade nos seguintes dias e horários: {horarios}.\n\nAgradeço desde já e fico no aguardo de um retorno.\n\nAtenciosamente,',
        },
        {
          id: 'relato', nome: 'Relato à escola (conflito ou bullying)',
          campos: [
            { id: 'destinatario', rotulo: 'Para quem (coordenação, direção)', exemplo: 'Coordenação' },
            { id: 'crianca', rotulo: 'Nome da criança e turma', exemplo: 'Pedro, 3º ano B' },
            { id: 'fatos', rotulo: 'O que aconteceu (fatos, datas, locais)', area: true, exemplo: 'Em 10/10, no recreio, colegas o chamaram por apelidos e o impediram de brincar. Já aconteceu outras vezes.' },
            { id: 'envolvidos', rotulo: 'Quem estava envolvido, se souber', opcional: true, exemplo: 'Dois colegas da mesma turma.' },
            { id: 'pedido', rotulo: 'O que você pede à escola', area: true, exemplo: 'Que a escola apure o ocorrido, converse com as crianças e me informe das providências.' },
          ],
          texto: 'Olá, {destinatario}.\n\nEscrevo para comunicar uma situação que envolve {crianca}.\n\nO que aconteceu: {fatos}\n\nEnvolvidos: {envolvidos}\n\nGostaria de pedir: {pedido}\n\nPeço que me informe, por escrito, sobre as providências tomadas. Estou à disposição para uma reunião.\n\nAtenciosamente,',
        },
      ],
    },
    {
      id: 'estudo', tipo: 'combinado', icone: '📚', nome: 'Combinado de Estudo',
      descricao: 'Monte a rotina de dever de casa e preparo da escola.',
      titulo: 'Nosso combinado de estudo',
      intro: 'Combinamos como organizar o dever de casa e a rotina da escola, para estudar sem brigas.',
      fecho: 'O dever é responsabilidade da criança. Os adultos apoiam, mas não fazem por ela.',
      secoes: [
        { id: 'horario', titulo: 'Quando', modo: 'escolha', itens: [{ id: 'h1', texto: 'Logo depois do lanche e de um pouco de descanso.', padrao: true }, { id: 'h2', texto: 'Depois de uma atividade física ou brincadeira.' }, { id: 'h3', texto: 'No horário fixo combinado todos os dias.' }] },
        { id: 'lugar', titulo: 'Onde e como', modo: 'multi', itens: [{ id: 'l1', texto: 'Em um lugar fixo, com pouca distração.', padrao: true }, { id: 'l2', texto: 'Sem televisão nem celular durante o dever.', padrao: true }, { id: 'l3', texto: 'Com material separado (lápis, caderno, borracha).', padrao: true }] },
        { id: 'ritmo', titulo: 'Ritmo', modo: 'multi', itens: [{ id: 'r1', texto: 'Pausas curtas a cada 15 a 25 minutos.', padrao: true, faixas: ['6-7', '8-10'] }, { id: 'r2', texto: 'Dever curto de cada vez, com um adulto por perto.', padrao: true, faixas: ['4-5', '6-7'] }, { id: 'r3', texto: 'Começar pelo mais difícil.', faixas: ['8-10'] }] },
        { id: 'apoio', titulo: 'Apoio dos adultos', modo: 'multi', itens: [{ id: 'a1', texto: 'O adulto ajuda a entender, não faz a tarefa.', padrao: true }, { id: 'a2', texto: 'Se a criança travar, pedimos ajuda à professora.', padrao: true }, { id: 'a3', texto: 'Elogiamos o esforço e o progresso.', padrao: true }] },
        { id: 'vespera', titulo: 'Na véspera', modo: 'multi', itens: [{ id: 'v1', texto: 'Mochila pronta e roupa separada antes de dormir.', padrao: true }, { id: 'v2', texto: 'Conferir recados e agenda da escola.', faixas: ['6-7', '8-10'] }] },
      ],
    },
    {
      id: 'diario', tipo: 'registro', icone: '📓', nome: 'Diário da Escola',
      descricao: 'Registre como foi o dia escolar.',
      campos: [
        { id: 'data', rotulo: 'Dia', tipo: 'data' },
        { id: 'humor', rotulo: 'Como ele voltou da escola', tipo: 'escolha', insight: true, obrigatorio: true, opcoes: [{ id: 'bem', nome: 'Bem' }, { id: 'mais-ou-menos', nome: 'Mais ou menos' }, { id: 'mal', nome: 'Mal' }] },
        { id: 'tema', rotulo: 'O que marcou o dia', tipo: 'escolha', insight: true, obrigatorio: true, opcoes: [{ id: 'dever', nome: 'Dever de casa' }, { id: 'colegas', nome: 'Colegas' }, { id: 'professor', nome: 'Professor' }, { id: 'prova', nome: 'Prova ou nota' }, { id: 'ida', nome: 'Ida para a escola' }, { id: 'outro', nome: 'Outro' }] },
        { id: 'obs', rotulo: 'Anotações (opcional)', tipo: 'texto' },
      ],
    },
    {
      id: 'ajuda', tipo: 'ajuda', icone: '🛟', nome: 'Quando procurar ajuda',
      descricao: 'Sinais de que vale buscar apoio da escola ou de profissionais.',
      blocos: [
        { titulo: 'Converse com a escola e com um profissional se:', itens: ['A recusa de ir à escola dura semanas, com dores físicas ou choro intenso.', 'Há queda brusca nas notas junto com tristeza, isolamento ou irritação.', 'Há dificuldade persistente de leitura, escrita ou atenção.', 'Há suspeita de bullying, agressão ou humilhação repetida.', 'Ele fala em se machucar ou não querer ir mais.'] },
        { titulo: 'Quem pode ajudar:', itens: ['Professor, orientação ou coordenação da escola.', 'Pediatra e psicólogo infantil.', 'Avaliação pedagógica ou neuropsicopedagógica, se houver dificuldades de aprendizagem.'] },
      ],
      recursos: [{ nome: 'Disque 100', texto: 'Denúncia de violações contra crianças e adolescentes. Ligação gratuita, 24 horas.' }],
    },
  ],
}
