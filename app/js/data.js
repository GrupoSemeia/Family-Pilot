/* Conteúdo do SOS Birra. Orientações educativas gerais, sem diagnóstico.
   Para mudar um texto, edite aqui — o app lê tudo deste arquivo. */
(function () {
  const IDADES = [
    { id: '2-3', rotulo: '2 a 3 anos' },
    { id: '4-5', rotulo: '4 a 5 anos' },
    { id: '6-7', rotulo: '6 a 7 anos' },
    { id: '8-10', rotulo: '8 a 10 anos' },
  ];

  /* O que esperar e uma dica de linguagem por faixa etária */
  const POR_IDADE = {
    '2-3': {
      expectativa: 'Nessa idade o cérebro ainda não consegue se acalmar sozinho. A birra costuma durar poucos minutos e passa mais rápido com poucas palavras e a sua presença.',
      dica: 'Use frases curtas, de no máximo 5 ou 6 palavras. Abaixe-se na altura dele. Explicações longas agora não entram.',
    },
    '4-5': {
      expectativa: 'Ele já entende regras simples, mas ainda perde o controle com facilidade. Nomear o sentimento ajuda mais do que discutir o motivo.',
      dica: 'Dê o nome da emoção ("você está bravo") e ofereça uma escolha pequena entre duas opções aceitáveis.',
    },
    '6-7': {
      expectativa: 'Ele consegue conversar sobre o que sentiu, mas só depois de se acalmar. No auge da raiva, não adianta argumentar.',
      dica: 'Dê um tempo de espaço, fique por perto e deixe a conversa para quando a respiração dele voltar ao normal.',
    },
    '8-10': {
      expectativa: 'Nessa idade a explosão costuma vir de frustração, injustiça ou vergonha. Ele quer ser ouvido e respeitado, mesmo quando o limite fica.',
      dica: 'Fale baixo, evite plateia, reconheça o ponto de vista dele e combine a consequência com calma, sem ironia.',
    },
  };

  /* Por que a birra pode estar acontecendo + o que fazer + o que evitar + frases por idade.
     a = frase para acolher a emoção; l = frase para manter o limite */
  const MOTIVOS = [
    {
      id: 'nao', nome: 'Quis algo e ouviu "não"', gatilho: 'nao',
      leitura: 'Ele queria muito e não pode ter. O choro é a frustração saindo, não falta de respeito com você.',
      fazer: [
        'Mantenha o "não". Mudar de ideia por causa do grito ensina que gritar funciona.',
        'Fale baixo e devagar, mais baixo do que ele está falando.',
        'Reconheça o desejo ("você queria muito") sem negociar o limite.',
        'Fique por perto até a intensidade baixar.',
      ],
      evitar: ['Ceder para a birra acabar', 'Dar sermão enquanto ele grita', 'Comparar com outra criança'],
      frases: {
        '2-3': { a: 'Você queria muito. Eu estou aqui.', l: 'Hoje não vai dar. Eu te ajudo.' },
        '4-5': { a: 'Você está bravo porque queria isso. Pode ficar bravo.', l: 'A resposta continua não. Quer abraço ou ficar um pouquinho sozinho?' },
        '6-7': { a: 'Eu entendo que você queria e ficou chateado.', l: 'A decisão continua sendo não. Quando você se acalmar, a gente conversa.' },
        '8-10': { a: 'Eu sei que é chato ouvir não, principalmente quando você queria muito.', l: 'Eu ouvi o que você disse e a minha resposta continua sendo não. Posso conversar quando estivermos calmos.' },
      },
    },
    {
      id: 'transicao', nome: 'Tinha que parar o que estava fazendo (tela, brincadeira, sair)', gatilho: 'transicao',
      leitura: 'Parar algo bom é difícil. A mudança de atividade pegou ele de surpresa.',
      fazer: [
        'Aproxime-se, fale o nome dele e diga o que vai acontecer agora, em uma frase.',
        'Se a tela ou brinquedo precisa acabar, desligue ou guarde você mesmo, com calma, sem negociar de novo.',
        'Ofereça o próximo passo concreto ("vamos lavar as mãos juntos").',
        'Nos próximos dias, avise 5 minutos antes e use um timer que ele possa ver.',
      ],
      evitar: ['Arrancar o objeto sem avisar', 'Ameaçar tirar a tela por dias', 'Repetir a mesma ordem cada vez mais alto'],
      frases: {
        '2-3': { a: 'É difícil parar. Eu sei.', l: 'Acabou. Vamos juntos.' },
        '4-5': { a: 'Você estava gostando e não queria parar.', l: 'Hora de guardar. Você guarda sozinho ou eu ajudo?' },
        '6-7': { a: 'Dá raiva ter que parar no meio de uma coisa legal.', l: 'O tempo acabou. Amanhã você joga de novo no mesmo horário.' },
        '8-10': { a: 'Eu entendo que parar agora é um saco.', l: 'O combinado foi até agora. Se precisar de um minuto, tudo bem, e depois a gente segue.' },
      },
    },
    {
      id: 'frustracao', nome: 'Frustrou-se com algo difícil (tarefa, brinquedo, desenho)', gatilho: 'frustracao',
      leitura: 'Ele queria conseguir e não conseguiu. A raiva é com a situação, não com você.',
      fazer: [
        'Diminua a pressão: afaste-se do problema por um instante, sem desistir de vez.',
        'Reconheça o esforço antes de qualquer solução.',
        'Ofereça ajuda em um passo pequeno, não a tarefa inteira.',
        'Só volte à tarefa quando ele estiver calmo.',
      ],
      evitar: ['Dizer "é fácil" ou "não é nada"', 'Fazer a tarefa no lugar dele', 'Criticar o jeito que ele fez'],
      frases: {
        '2-3': { a: 'Está difícil! Eu vejo.', l: 'Vamos tentar juntos. Eu seguro, você coloca.' },
        '4-5': { a: 'Você tentou tanto e não saiu como queria.', l: 'Não vale jogar. Vamos respirar e tentar de novo juntos.' },
        '6-7': { a: 'Dá raiva quando a gente se esforça e não sai.', l: 'Pode ficar bravo, mas não pode jogar as coisas. Vamos dar uma pausa e voltar.' },
        '8-10': { a: 'Eu vejo o quanto você está se esforçando e que isso está te irritando.', l: 'Vamos parar cinco minutos. Quando voltar, eu te ajudo a achar o primeiro passo.' },
      },
    },
    {
      id: 'corpo', nome: 'Fome, sono ou cansaço', gatilho: 'corpo',
      leitura: 'Quando o corpo está esgotado, o autocontrole some. Aqui o limite é necessário, mas a necessidade vem primeiro.',
      fazer: [
        'Antes de qualquer conversa, veja o que o corpo precisa: água, lanche, colo, lugar quieto.',
        'Reduza estímulos: menos luz, menos barulho, menos gente falando.',
        'Mantenha as regras de comportamento (não pode bater), mas deixe as outras negociações para depois.',
        'Registre o horário: se se repete, a rotina pode ser ajustada (veja o Radar de Gatilhos).',
      ],
      evitar: ['Cobrar bom comportamento de quem está exausto', 'Discutir regra no meio do choro', 'Adiar a comida ou o descanso para "ensinar uma lição"'],
      frases: {
        '2-3': { a: 'Você está cansado. Vem pro colo.', l: 'Bater não pode. Eu te ajudo.' },
        '4-5': { a: 'Seu corpo está com sono (ou fome). Fica difícil, né?', l: 'Vamos comer (ou descansar) primeiro e depois conversamos.' },
        '6-7': { a: 'Acho que você está muito cansado hoje.', l: 'Vamos fazer uma pausa e comer algo. Depois a gente resolve isso com a cabeça mais calma.' },
        '8-10': { a: 'Hoje foi puxado, e com cansaço tudo irrita mais.', l: 'Eu entendo. Vamos descansar um pouco e depois conversamos sobre isso.' },
      },
    },
    {
      id: 'ciume', nome: 'Ciúme ou disputa com irmão ou colega', gatilho: 'irmao',
      leitura: 'Ele sentiu que perdeu atenção ou que algo foi injusto. A birra pede conexão.',
      fazer: [
        'Se alguém pode se machucar, separe as crianças primeiro, com calma e firmeza.',
        'Acolha o sentimento sem decidir "quem tem razão" agora.',
        'Diga o limite com clareza (não pode bater, empurrar ou tomar à força).',
        'Depois, reserve alguns minutos só dele, mesmo que curtos.',
      ],
      evitar: ['Julgar na hora ("você sempre começa")', 'Comparar os irmãos', 'Obrigar a pedir desculpa à força no meio da raiva'],
      frases: {
        '2-3': { a: 'Você queria o brinquedo. Está bravo.', l: 'Não pode bater. Eu seguro a mão.' },
        '4-5': { a: 'Você ficou triste porque queria brincar com ele.', l: 'Não pode empurrar. Vamos achar outro jeito de pedir.' },
        '6-7': { a: 'Parece que você achou injusto. Eu quero te ouvir.', l: 'Eu não deixo bater. Conta pra mim o que aconteceu, um de cada vez.' },
        '8-10': { a: 'Dá para ver que isso te incomodou de verdade.', l: 'Brigar com palavras que machucam ou com as mãos não pode. Eu te ouço quando você estiver mais calmo.' },
      },
    },
    {
      id: 'nao-sei', nome: 'Não sei o motivo', gatilho: null,
      leitura: 'Nem sempre dá para saber. Tudo bem: ajudar a se acalmar vale mais do que descobrir o motivo agora.',
      fazer: [
        'Garanta que ele está seguro e que você também respira.',
        'Fique perto, em silêncio ou com poucas palavras, sem cobrar explicação.',
        'Ofereça água ou colo, se ele aceitar.',
        'Depois que passar, anote no Diário SOS: com o tempo, o motivo costuma aparecer.',
      ],
      evitar: ['Perguntar "por quê?" várias vezes', 'Dizer "isso é bobagem"', 'Forçar conversa no auge'],
      frases: {
        '2-3': { a: 'Eu estou aqui com você.', l: 'Quando você acalmar, a gente conversa.' },
        '4-5': { a: 'Você está sentindo algo muito forte. Eu fico com você.', l: 'Pode chorar. Não pode machucar ninguém.' },
        '6-7': { a: 'Eu não sei o que aconteceu, mas vejo que está difícil. Eu estou aqui.', l: 'Quando você estiver pronto, me conta. Enquanto isso, ninguém se machuca.' },
        '8-10': { a: 'Parece que algo está pesado. Não precisa explicar agora.', l: 'Quando quiser conversar, eu escuto. Agora vou ficar por aqui.' },
      },
    },
  ];

  /* Ajustes conforme onde a birra está acontecendo */
  const LOCAIS = [
    { id: 'casa', nome: 'Em casa', passos: ['Se puder, reduza barulho e tela em volta. Em casa, você pode dar espaço sem sair de perto.'] },
    {
      id: 'mercado', nome: 'No mercado ou loja', publico: true,
      passos: [
        'Pare o carrinho e fique ao lado dele. Você não precisa terminar as compras agora.',
        'Se ele precisar de espaço, leve-o a um corredor vazio ou ao carro. Os olhares dos outros não são a sua prioridade agora.',
      ],
    },
    {
      id: 'restaurante', nome: 'Restaurante ou lugar fechado', publico: true,
      passos: ['Saia da mesa com ele para um canto tranquilo ou para a calçada, e volte quando estiver calmo. Peça a um adulto para olhar a mesa, se houver.'],
    },
    {
      id: 'rua', nome: 'Na rua ou estacionamento', publico: true,
      passos: ['Segurança primeiro: segure a mão dele e saia de perto de carros. Só depois acolha.'],
    },
    {
      id: 'carro', nome: 'No carro', publico: false,
      passos: ['Se o carro está andando, o motorista não pode se distrair. Pare em um lugar seguro antes de agir. Acalme-se com voz baixa até lá.'],
    },
    {
      id: 'outro', nome: 'Na escola ou na casa de outras pessoas', publico: true,
      passos: ['Leve-o para um lugar reservado, longe de plateia. Agradeça a quem ajudar e deixe explicações para depois.'],
    },
  ];

  const SEGURANCA = [
    'Segurança primeiro: afaste objetos que possam machucar e proteja a cabeça dele se ele se jogar.',
    'Se ele bater, segure a mão com firmeza e sem raiva, e diga: "Não deixo você machucar. Eu te seguro."',
    'Se ele tenta fugir para a rua ou para perto de carros, segure-o com cuidado e leve para um lugar seguro antes de qualquer conversa.',
  ];

  const EVITAR_SEMPRE = [
    'Bater, sacudir ou gritar',
    'Ameaças que você não vai cumprir ou castigos exagerados',
    'Humilhar ("que vergonha", "parece bebê")',
  ];

  const DEPOIS = [
    'Quando ele estiver calmo, reconecte: um abraço, se ele aceitar, ou ficar perto um pouco.',
    'Conte o que aconteceu em uma frase simples, sem culpa: "Você ficou muito bravo e eu fiquei com você."',
    'Combine uma alternativa para a próxima vez ("se estiver bravo, aperta a almofada").',
    'Se você perdeu a paciência, tudo bem. Peça desculpa em uma frase. Isso ensina mais do que fingir que nada aconteceu.',
  ];

  /* Frase Certa: comportamento + idade → como acolher e como manter o limite */
  const COMPORTAMENTOS = [
    {
      id: 'grita', nome: 'Grita ou chora muito alto',
      frases: {
        '2-3': { a: 'Você está bravo. Eu escuto.', l: 'Aqui a voz é baixinha. Vamos respirar.' },
        '4-5': { a: 'Você está com muita raiva. Eu estou aqui.', l: 'Eu te escuto quando a voz estiver mais baixa.' },
        '6-7': { a: 'Dá para ver que você está muito chateado.', l: 'Eu quero te ouvir. Quando a voz baixar, eu escuto tudo.' },
        '8-10': { a: 'Eu percebo que isso é importante para você.', l: 'Vou ouvir assim que a gente conversar sem gritar. Preciso de um minuto também.' },
      },
    },
    {
      id: 'chao', nome: 'Joga-se no chão',
      frases: {
        '2-3': { a: 'Você está com muita raiva. Pode ficar aqui.', l: 'Eu fico pertinho. Quando acabar, a gente levanta.' },
        '4-5': { a: 'Seu corpo está com muita raiva. Eu espero com você.', l: 'Eu não vou mudar o que combinamos. Eu fico aqui até você estar pronto.' },
        '6-7': { a: 'Parece que a raiva foi grande demais agora.', l: 'Vou ficar aqui. Quando você levantar, a gente segue.' },
        '8-10': { a: 'Eu entendo. Está difícil agora.', l: 'Vou me afastar um pouco e te dar espaço. Quando quiser levantar, eu estou aqui.' },
      },
    },
    {
      id: 'bate', nome: 'Bate, empurra ou atira coisas',
      frases: {
        '2-3': { a: 'Você está muito bravo.', l: 'Bater não pode. Eu seguro a mão.' },
        '4-5': { a: 'Eu sei que você está com raiva.', l: 'Não deixo você bater. Pode apertar a almofada.' },
        '6-7': { a: 'Você está com muita raiva e eu entendo.', l: 'Bater não pode, nem em mim nem em ninguém. Se quiser, vá bater os pés ou apertar a almofada.' },
        '8-10': { a: 'Eu sei que a raiva foi forte.', l: 'Machucar as pessoas ou quebrar as coisas não pode. Vamos conversar quando passar, e eu espero.' },
      },
    },
    {
      id: 'recusa', nome: 'Recusa fazer o que foi pedido',
      frases: {
        '2-3': { a: 'Você não quer. Eu sei.', l: 'Vamos juntos. Eu ajudo.' },
        '4-5': { a: 'Você não está com vontade agora.', l: 'Preciso que você faça. Você faz primeiro ou eu ajudo?' },
        '6-7': { a: 'Eu entendo que você preferia não fazer.', l: 'Mesmo assim, precisa ser feito. Você escolhe: agora ou depois do lanche, mas hoje.' },
        '8-10': { a: 'Eu sei que isso não é divertido.', l: 'Precisa ser feito hoje. Você decide o horário. Eu estou por perto se precisar.' },
      },
    },
    {
      id: 'xinga', nome: 'Xinga ou responde mal',
      frases: {
        '2-3': { a: 'Você está muito bravo.', l: 'Essa palavra machuca. Pode dizer: estou bravo.' },
        '4-5': { a: 'Você está com raiva de mim agora.', l: 'Pode dizer que está bravo, mas não pode xingar. Tente de novo.' },
        '6-7': { a: 'Percebi que você ficou com muita raiva.', l: 'Não aceito ser xingada(o). Quando você se acalmar, conversamos.' },
        '8-10': { a: 'Parece que você está muito frustrado.', l: 'Eu te ouço, mas não vou conversar com gritos ou ofensas. Vamos tentar de novo em alguns minutos.' },
      },
    },
    {
      id: 'chora', nome: 'Chora sem parar',
      frases: {
        '2-3': { a: 'Eu estou aqui. Pode chorar.', l: 'Eu fico com você até passar.' },
        '4-5': { a: 'Você está muito triste. Eu fico aqui.', l: 'Quando você estiver pronto, a gente respira junto.' },
        '6-7': { a: 'Eu vejo que está difícil. Quer um abraço ou prefere ficar sozinho?', l: 'Eu fico por perto. Sem pressa.' },
        '8-10': { a: 'Pode chorar. Eu não vou a lugar nenhum.', l: 'Quando quiser conversar, eu escuto.' },
      },
    },
  ];

  const GATILHOS = [
    { id: 'corpo', nome: 'Fome, sono ou cansaço', dica: 'Leve um lanche e evite passeios no horário em que ele costuma estar cansado.' },
    { id: 'transicao', nome: 'Parar uma atividade', dica: 'Avise 5 minutos antes e use um timer visível. Diga o que vem depois.' },
    { id: 'telas', nome: 'Telas', dica: 'Combine antes o tempo e quando acaba, e ofereça uma atividade para o depois.' },
    { id: 'nao', nome: 'Ouviu "não"', dica: 'Antes de entrar na loja ou sair, combine o que pode e o que não pode.' },
    { id: 'irmao', nome: 'Irmão ou colega', dica: 'Separe alguns minutos só dele, todos os dias, e antecipe a divisão de brinquedos.' },
    { id: 'lugar', nome: 'Lugar cheio ou barulhento', dica: 'Chegue com antecedência, escolha horários mais vazios e tenha um plano de saída.' },
    { id: 'rotina', nome: 'Mudança de rotina', dica: 'Conte com antecedência o que vai ser diferente e mantenha o essencial (sono, refeição).' },
    { id: 'saida', nome: 'Chegada ou saída', dica: 'Crie um ritual curto de despedida e fale o que vai acontecer em seguida.' },
    { id: 'frustracao', nome: 'Algo difícil de fazer', dica: 'Divida a tarefa em passos pequenos e comemore cada um.' },
  ];

  const ESTRATEGIAS = [
    { id: 'acolhi', nome: 'Acolhi a emoção' },
    { id: 'limite', nome: 'Mantive o limite' },
    { id: 'pausa', nome: 'Respirei antes de responder' },
    { id: 'distrai', nome: 'Distraí ou ofereci opção' },
    { id: 'sai', nome: 'Saí do lugar com ele' },
    { id: 'ignorei', nome: 'Esperei sem falar' },
    { id: 'voz', nome: 'Levantei a voz' },
    { id: 'cedi', nome: 'Cedi no que pediu' },
  ];

  const RESULTADOS = [
    { id: 'ajudou', nome: 'Ajudou' },
    { id: 'mais-ou-menos', nome: 'Mais ou menos' },
    { id: 'nao-ajudou', nome: 'Não ajudou' },
  ];

  /* Demais módulos do FamilyPilot (ainda em desenvolvimento) */
  const MODULOS = [
    { id: 'birra', icone: '🧩', nome: 'SOS Birra', frase: 'Quando seu filho perde o controle e você não sabe como reagir.', pronto: true, rota: '#/birra' },
    { id: 'sono', icone: '🌙', nome: 'SOS Sono', frase: 'Quando chega a hora de dormir e começa outra batalha.', detalhe: 'Rotinas noturnas adaptadas à idade e horários de descanso.' },
    { id: 'telas', icone: '📱', nome: 'SOS Telas', frase: 'Quando tirar o celular vira motivo de discussão.', detalhe: 'Combinados de uso de telas e atividades alternativas.' },
    { id: 'alimentacao', icone: '🍽️', nome: 'SOS Alimentação', frase: 'Quando a hora de comer vira um momento de tensão.', detalhe: 'Refeições organizadas e orientações para a resistência alimentar.' },
    { id: 'limites', icone: '❤️', nome: 'SOS Limites', frase: 'Quando você precisa dizer não, mas não sabe como.', detalhe: 'Frases e estratégias para limites adequados à idade.' },
    { id: 'escola', icone: '🎒', nome: 'SOS Escola', frase: 'Quando surgem dificuldades com tarefas, amizades ou adaptação escolar.', detalhe: 'Organize situações escolares e prepare conversas com professores.' },
    { id: 'adolescencia', icone: '🌱', nome: 'SOS Adolescência', frase: 'Quando conversar com seu filho parece cada vez mais difícil.', detalhe: 'Conversas sobre autonomia, conflitos familiares e vida digital.' },
  ];

  window.FP_DATA = { IDADES, POR_IDADE, MOTIVOS, LOCAIS, SEGURANCA, EVITAR_SEMPRE, DEPOIS, COMPORTAMENTOS, GATILHOS, ESTRATEGIAS, RESULTADOS, MODULOS };
})();
