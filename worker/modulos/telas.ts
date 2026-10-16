import { type Modulo, FAIXAS_INFANCIA } from './tipos'

/* Referência geral usada nos textos: a Sociedade Brasileira de Pediatria orienta, de forma resumida, evitar telas antes
   dos 2 anos, até cerca de 1 hora por dia dos 2 aos 5 anos (sempre com supervisão) e 1 a 2 horas por dia dos 6 aos 10,
   sem telas durante as refeições e nas 1 a 2 horas antes de dormir. Cada família adapta, com o pediatra, se precisar. */
export const telas: Modulo = {
  id: 'telas', nome: 'SOS Telas', icone: '📱',
  resumo: 'Combinados de uso de telas e sugestões de atividades alternativas.',
  faixas: FAIXAS_INFANCIA,
  ferramentas: [
    {
      id: 'desligar', tipo: 'situacoes', icone: '🆘', nome: 'SOS Hora de Desligar',
      descricao: 'Quando tirar o celular vira motivo de discussão.',
      porFaixa: {
        '2-3': { expectativa: 'Nessa idade a criança ainda não entende "tempo". Parar o vídeo é difícil porque a imagem prende a atenção sem ela decidir.', dica: 'Avise "acabou" com uma frase curta e já proponha a próxima atividade, junto com ele.' },
        '4-5': { expectativa: 'Ele já entende "depois", mas não segura a frustração. Um aviso antes e um fim previsível reduzem a briga.', dica: 'Use um cronômetro visual (ampulheta, timer colorido). O "relógio" manda, não você.' },
        '6-7': { expectativa: 'Ele aceita regras se forem claras e previsíveis. O "só mais um" é teste do limite.', dica: 'Combine a regra antes de ligar o aparelho, não na hora de desligar.' },
        '8-10': { expectativa: 'Jogos e vídeos têm fases e recompensas que dificultam parar no meio. A irritação ao parar é forte, mas deve respeitar o combinado.', dica: 'Combine "termina a partida" em vez de "termina agora", sempre dentro de um limite máximo.' },
      },
      situacoes: [
        {
          id: 'nao-desliga', nome: 'Não quer desligar quando acaba o tempo',
          leitura: 'O fim da tela é o fim de algo muito atraente. A irritação é frustração, não má-criação.',
          fazer: ['Avise antes: "Faltam 5 minutos" e "Falta 1 minuto".', 'Quando o tempo acabar, desligue com calma, junto com ele, sem discutir.', 'Diga o que vem depois ("agora vamos lavar as mãos para o lanche").', 'Fique perto para acolher a frustração, mantendo o fim da tela.', 'Mantenha sempre a mesma regra, sem exceções por cansaço.'],
          evitar: ['Arrancar o aparelho da mão', 'Ameaçar tirar a tela por dias', 'Ceder só desta vez'],
          frases: {
            '2-3': { a: 'Você gosta muito. Eu sei.', l: 'Acabou. Vamos guardar juntos.' },
            '4-5': { a: 'É difícil parar quando está legal.', l: 'O tempo acabou. Vamos guardar e escolher outra brincadeira.' },
            '6-7': { a: 'Dá raiva parar no meio, eu entendo.', l: 'O combinado era 30 minutos e acabou. Amanhã tem de novo.' },
            '8-10': { a: 'Eu sei que você estava no meio da partida.', l: 'Termina esta rodada e desliga. Foi o que combinamos.' },
          },
          depois: ['Elogie as vezes em que ele desligar sem briga.', 'Ofereça uma atividade que ele goste logo em seguida.'],
        },
        {
          id: 'mais-cinco', nome: 'Negocia: "só mais cinco minutinhos"',
          leitura: 'Ele está testando se a regra é firme. Cada vez que cede, a negociação aumenta.',
          fazer: ['Antes de ligar, repita o combinado: "Hoje são 30 minutos."', 'Diga "sim" ao que for possível (terminar a fase) e "não" ao resto.', 'Mantenha o tom de voz calmo e igual.', 'Se ele insistir, repita a mesma frase sem se justificar de novo.'],
          evitar: ['Discutir longamente', 'Dar "só mais cinco" que viram vinte', 'Mudar a regra conforme seu humor'],
          frases: {
            '2-3': { a: 'Você quer mais.', l: 'Acabou. Vamos lavar as mãos.' },
            '4-5': { a: 'Você quer mais um pouquinho.', l: 'Hoje o tempo acabou. Amanhã tem mais.' },
            '6-7': { a: 'Entendo que você queria mais tempo.', l: 'O combinado é este. Se quiser, a gente conversa depois sobre o tempo de amanhã.' },
            '8-10': { a: 'Eu ouvi seu pedido.', l: 'A regra continua a mesma. Se achar injusto, podemos rever o combinado no fim de semana, e não agora.' },
          },
          depois: ['Reveja o combinado em um momento calmo, se precisar mudar.'],
        },
        {
          id: 'refeicao', nome: 'Quer tela na hora de comer ou no restaurante',
          leitura: 'A tela distrai e ajuda a criança a ficar quieta, mas atrapalha a fome, a mastigação e a conversa.',
          fazer: ['Combine "à mesa não tem tela" para todos, adultos também.', 'Leve algo para ele fazer: giz, livrinho, adesivos, jogo de papel.', 'Envolva a criança na conversa ou em pequenas tarefas da refeição.', 'Se for demorar fora de casa, planeje pausas para ele se levantar.'],
          evitar: ['Dar tela para "ele comer"', 'Brigar com ele na frente dos outros', 'Usar tela como prêmio por comer'],
          frases: {
            '2-3': { a: 'Você quer o vídeo.', l: 'Na mesa a gente come junto. Olha, tem o seu livrinho.' },
            '4-5': { a: 'Você gosta de ver desenho enquanto come.', l: 'Aqui na mesa a gente guarda as telas. Depois você assiste um pouquinho.' },
            '6-7': { a: 'Eu sei que é chato ficar sem tela.', l: 'Combinado de todo mundo: celular guardado à mesa.' },
            '8-10': { a: 'Eu entendo que você queria usar.', l: 'Na mesa ninguém usa tela, nem eu. Depois a gente combina quando você usa.' },
          },
          depois: ['Elogie o tempo em que a refeição foi sem tela.'],
        },
        {
          id: 'manha', nome: 'Acorda e já pede a tela',
          leitura: 'A tela virou a primeira atividade do dia. Uma rotina da manhã previsível ajuda.',
          fazer: ['Combine: "De manhã primeiro nos arrumamos, depois vemos".', 'Deixe uma atividade esperando (brinquedo, livro, massinha).', 'Se houver tela de manhã, deixe um limite claro de tempo e horário.', 'Guarde o aparelho fora do alcance dele ao acordar.'],
          evitar: ['Usar a tela para ganhar tempo de se arrumar todo dia', 'Deixar o aparelho acessível a noite toda'],
          frases: {
            '2-3': { a: 'Você acordou animado!', l: 'Primeiro a gente se arruma. Depois brincamos.' },
            '4-5': { a: 'Você quer ver desenho.', l: 'Primeiro vestir e tomar café. Depois a gente vê o combinado.' },
            '6-7': { a: 'Eu entendo que você queria usar logo.', l: 'De manhã primeiro as tarefas; a tela fica para depois.' },
            '8-10': { a: 'Sei que você quer jogar logo cedo.', l: 'Combinado: nos dias de escola, tela só depois do dever.' },
          },
          depois: ['Mostre que você também guarda o celular nesse horário.'],
        },
        {
          id: 'conteudo', nome: 'Viu algo inadequado ou conversa com desconhecidos',
          leitura: 'A curiosidade leva a criança a ver o que não deveria. O mais importante é ela se sentir segura para contar a você.',
          fazer: ['Mantenha a calma e agradeça por ela ter contado.', 'Pergunte o que viu e como se sentiu, sem punir.', 'Bloqueie o conteúdo ou o contato e ajuste os controles parentais.', 'Combine: "Se algo estranho aparecer, você me conta, e você não terá problemas por isso".', 'Se um adulto desconhecido pediu fotos, segredos ou encontro, guarde as provas, bloqueie e denuncie.'],
          evitar: ['Dar bronca ou tirar o aparelho por ter contado', 'Dizer "eu avisei"', 'Ignorar o assunto'],
          frases: {
            '2-3': { a: 'Você viu algo que te assustou?', l: 'Vamos desligar. Eu estou aqui com você.' },
            '4-5': { a: 'Obrigado por me contar. Você fez muito bem.', l: 'Vamos escolher juntos outro vídeo, e eu fico por perto.' },
            '6-7': { a: 'Fico feliz que você me contou. Você não fez nada errado.', l: 'Vamos bloquear isso e combinar que você sempre me conta.' },
            '8-10': { a: 'Obrigado por confiar em mim. Isso pode acontecer com qualquer um.', l: 'Vamos ver juntos como bloquear e denunciar. E você sempre pode me contar, sem medo de bronca.' },
          },
          depois: ['Revise com ele quem pode falar com ele nos jogos e aplicativos.', 'Em caso de pedido de fotos ou encontro, procure ajuda (veja Quando procurar ajuda).'],
          alerta: 'Se um adulto desconhecido está pedindo fotos, segredos ou encontros com a criança, bloqueie, guarde as conversas e denuncie (Disque 100 ou Helpline da SaferNet Brasil).',
        },
      ],
    },
    {
      id: 'combinado', tipo: 'combinado', icone: '🤝', nome: 'Combinado de Telas',
      descricao: 'Monte o combinado da família sobre tempo, horários e conteúdo.',
      titulo: 'Nosso combinado de telas',
      intro: 'Combinamos em família como usar as telas para que sobrem tempo para brincar, estudar, dormir e conversar.',
      fecho: 'Revisamos este combinado juntos de vez em quando. Todos da casa seguem as mesmas regras nos momentos sem tela.',
      secoes: [
        {
          id: 'tempo', titulo: 'Quanto tempo por dia', modo: 'escolha',
          dica: { '2-3': 'Referência geral: até cerca de 1 hora por dia, sempre com um adulto junto.', '4-5': 'Referência geral: até cerca de 1 hora por dia, com supervisão.', '6-7': 'Referência geral: de 1 a 2 horas por dia, sem tirar o tempo de sono, estudo e brincar.', '8-10': 'Referência geral: de 1 a 2 horas por dia, sem tirar o tempo de sono, estudo e brincar.' },
          itens: [{ id: 't30', texto: 'Até 30 minutos por dia.' }, { id: 't60', texto: 'Até 1 hora por dia.', padrao: true }, { id: 't120', texto: 'Até 2 horas por dia.', faixas: ['6-7', '8-10'] }],
        },
        {
          id: 'quando', titulo: 'Quando pode usar', modo: 'multi',
          itens: [{ id: 'q1', texto: 'Depois do dever de casa e das tarefas.', padrao: true, faixas: ['6-7', '8-10'] }, { id: 'q2', texto: 'Depois do lanche e de brincar um pouco.', padrao: true, faixas: ['2-3', '4-5'] }, { id: 'q3', texto: 'Com um adulto por perto.', padrao: true, faixas: ['2-3', '4-5', '6-7'] }, { id: 'q4', texto: 'Nos fins de semana, um pouco mais, se o resto da rotina estiver em dia.', faixas: ['6-7', '8-10'] }],
        },
        {
          id: 'nao', titulo: 'Quando não pode usar', modo: 'multi',
          itens: [{ id: 'n1', texto: 'Durante as refeições.', padrao: true }, { id: 'n2', texto: 'Na hora do dever de casa.', padrao: true, faixas: ['6-7', '8-10'] }, { id: 'n3', texto: 'Na hora de dormir: sem tela uma hora antes e aparelhos fora do quarto durante a noite.', padrao: true }, { id: 'n4', texto: 'No banho e no banheiro.', padrao: true }, { id: 'n5', texto: 'Durante conversas e visitas.', padrao: true }],
        },
        {
          id: 'conteudo', titulo: 'Segurança e conteúdo', modo: 'multi',
          itens: [{ id: 'c1', texto: 'Só vemos e jogamos o que os pais conhecem e autorizaram.', padrao: true }, { id: 'c2', texto: 'Os pais sabem as senhas e os aplicativos usados.', padrao: true, faixas: ['6-7', '8-10'] }, { id: 'c3', texto: 'Não falamos com desconhecidos nem damos dados pessoais, fotos ou endereço.', padrao: true, faixas: ['6-7', '8-10'] }, { id: 'c4', texto: 'Se aparecer algo estranho ou que assuste, contamos aos pais sem medo de bronca.', padrao: true }],
        },
        {
          id: 'fim', titulo: 'Quando o tempo acaba', modo: 'escolha',
          itens: [{ id: 'f1', texto: 'Avisamos 5 minutos antes e usamos um timer. Quando acaba, desligamos e fazemos outra atividade.', padrao: true }, { id: 'f2', texto: 'Terminamos a partida ou o episódio em andamento e desligamos.', faixas: ['6-7', '8-10'] }],
        },
        {
          id: 'conseq', titulo: 'Se o combinado não for cumprido', modo: 'escolha',
          itens: [{ id: 's1', texto: 'No dia seguinte a tela começa mais tarde ou com menos tempo. Conversamos com calma sobre o que aconteceu.', padrao: true }, { id: 's2', texto: 'A tela fica guardada até o fim do dia e voltamos a combinar.' }],
        },
      ],
    },
    {
      id: 'alternativas', tipo: 'ideias', icone: '🎨', nome: 'Alternativas à tela',
      descricao: 'Atividades para quando a tela acaba ou fica de fora.',
      categorias: [{ id: 'casa', nome: 'Em casa' }, { id: 'fora', nome: 'Ao ar livre' }, { id: 'criar', nome: 'Criar e montar' }, { id: 'juntos', nome: 'Em família' }],
      itens: [
        { texto: 'Massinha, argila ou areia cinética.', categoria: 'criar', faixas: ['2-3', '4-5'] },
        { texto: 'Cabana com lençóis e cadeiras.', categoria: 'casa', faixas: ['2-3', '4-5', '6-7'] },
        { texto: 'Desenhar a mesma cena de três jeitos diferentes.', categoria: 'criar', faixas: ['4-5', '6-7'] },
        { texto: 'Circuito de obstáculos com almofadas.', categoria: 'casa', faixas: ['2-3', '4-5', '6-7'] },
        { texto: 'Montar um jogo com papelão e tampinhas.', categoria: 'criar', faixas: ['6-7', '8-10'] },
        { texto: 'Cozinhar uma receita simples juntos.', categoria: 'juntos', faixas: ['4-5', '6-7', '8-10'] },
        { texto: 'Jogos de tabuleiro e de cartas.', categoria: 'juntos', faixas: ['4-5', '6-7', '8-10'] },
        { texto: 'Ir ao parque, andar de bicicleta ou jogar bola.', categoria: 'fora', faixas: ['4-5', '6-7', '8-10'] },
        { texto: 'Caça ao tesouro pela casa ou no quintal.', categoria: 'fora', faixas: ['4-5', '6-7'] },
        { texto: 'Brincar na água ou com lama (no quintal ou parque).', categoria: 'fora', faixas: ['2-3', '4-5'] },
        { texto: 'Cuidar de uma planta ou horta pequena.', categoria: 'fora', faixas: ['4-5', '6-7', '8-10'] },
        { texto: 'Montar peças de encaixe ou blocos de construção.', categoria: 'criar', faixas: ['2-3', '4-5', '6-7', '8-10'] },
        { texto: 'Fazer um "show" de teatro com fantoches ou bonecos.', categoria: 'casa', faixas: ['4-5', '6-7'] },
        { texto: 'Escrever e desenhar uma história em quadrinhos.', categoria: 'criar', faixas: ['6-7', '8-10'] },
      ],
    },
    {
      id: 'diario', tipo: 'registro', icone: '📓', nome: 'Diário de Telas', resumo: 'minutos',
      descricao: 'Anote o tempo de tela do dia e como foi a hora de desligar.',
      campos: [
        { id: 'data', rotulo: 'Dia', tipo: 'data' },
        { id: 'minutos', rotulo: 'Minutos de tela (aproximado)', tipo: 'numero', padrao: '60' },
        { id: 'conflito', rotulo: 'Como foi a hora de desligar?', tipo: 'escolha', insight: true, obrigatorio: true, opcoes: [{ id: 'tranquila', nome: 'Tranquila' }, { id: 'um-pouco', nome: 'Um pouco difícil' }, { id: 'dificil', nome: 'Muito difícil' }] },
        { id: 'obs', rotulo: 'Anotações (opcional)', tipo: 'texto' },
      ],
    },
    {
      id: 'ajuda', tipo: 'ajuda', icone: '🛟', nome: 'Quando procurar ajuda',
      descricao: 'Sinais de alerta e onde denunciar.',
      blocos: [
        { titulo: 'Converse com o pediatra ou um psicólogo se:', itens: ['Fica muito irritado ou agressivo sempre que a tela é retirada.', 'Perde o interesse em brincar, estudar ou ver amigos por causa da tela.', 'Dorme mal ou muito pouco por causa do uso.', 'Mente ou esconde o uso com frequência.', 'Há queda importante nas notas ou no humor.'] },
        { titulo: 'Se houver contato com adulto desconhecido ou ameaça:', itens: ['Guarde as provas (prints), bloqueie e denuncie na plataforma.', 'Peça ajuda na escola ou na polícia, se houver ameaça ou aliciamento.'] },
      ],
      recursos: [{ nome: 'Disque 100', texto: 'Denúncia de violações contra crianças e adolescentes. Ligação gratuita, 24 horas.' }, { nome: 'Helpline da SaferNet Brasil', texto: 'Orientação sobre segurança online. Acesse helpline.org.br.' }],
    },
  ],
}
