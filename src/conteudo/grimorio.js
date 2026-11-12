/**
 * @file Biblioteca de conceitos (antes "Grimório"): cada mecânica do jogo explicada como conceito
 * de aprendizado de máquina. O arquivo e os ids continuam com o nome antigo para não perder os
 * verbetes já lidos (conquista "Bibliotecário") salvos no navegador.
 *
 * Cada verbete tem `id`, `titulo`, `categoria`, `conceito` (o que é em ML), `equacao` (MathML, em
 * bloco), `figura` (nome em figurasDaBiblioteca.js, opcional), `noJogo` (como aparece na mesa),
 * `limite` (até onde a comparação vale) e `fonte` (referência, opcional). A mesa mostra o verbete
 * como aviso na primeira vez que a mecânica acontece; a ajuda de cada ação leva ao verbete dela.
 *
 * Os verbetes de Ação têm ainda `ideia` (comparação do dia a dia) e `autoria`; alguns trazem
 * `aprofundar` (texto com `$...$` para LaTeX na linha) e `formula` (LaTeX em destaque, pelo KaTeX),
 * redigidos por Suzy Arcanjo (issue #23 do repositório original).
 */

/** Nome da tela, num lugar só. */
export const NOME_DA_BIBLIOTECA = 'Biblioteca de conceitos';

/* ---------- pedacinhos de MathML ---------- */
const bloco = (...partes) => '<math display="block">' + partes.join('') + '</math>';
const mi = (x) => '<mi>' + x + '</mi>';
const mo = (x) => '<mo>' + x + '</mo>';
const mn = (x) => '<mn>' + x + '</mn>';
const mt = (x) => '<mtext>' + x + '</mtext>';
const linha = (...p) => '<mrow>' + p.join('') + '</mrow>';
const sub = (a, b) => '<msub>' + a + b + '</msub>';
const sup = (a, b) => '<msup>' + a + b + '</msup>';
const frac = (a, b) => '<mfrac>' + a + b + '</mfrac>';
const raiz = (a) => '<msqrt>' + a + '</msqrt>';
const soma = (de, ate) => '<munderover>' + mo('∑') + de + ate + '</munderover>';
const prod = (de, ate) => '<munderover>' + mo('∏') + de + ate + '</munderover>';
const parc = (a, b) => frac(linha(mo('∂'), a), linha(mo('∂'), b));
const par = (...p) => linha('<mo lspace="0" rspace="0">(</mo>', ...p, '<mo lspace="0" rspace="0">)</mo>');
const abs = (x) => linha('<mo>|</mo>', x, '<mo>|</mo>');
const chapeu = (x) => '<mover>' + mi(x) + mo('^') + '</mover>';
const negrito = (x) => '<mi mathvariant="bold">' + x + '</mi>';
const camada = (x, l = 'l') => sup(x, linha(mo('('), mi(l), mo(')')));

export const VERBETES = [
  { id: 'neuronio', titulo: 'Neurônio', categoria: 'Fundamento',
    conceito: 'Um neurônio artificial recebe entradas, multiplica cada uma por um peso, soma tudo com um viés e passa o resultado por uma função de ativação. É a unidade mínima de uma rede neural.',
    equacao: bloco(mi('y'), mo('='), mi('φ'), par(soma(linha(mi('i'), mo('='), mn('1')), mi('n')), sub(mi('w'), mi('i')), sub(mi('x'), mi('i')), mo('+'), mi('b'))),
    figura: 'neuronio',
    noJogo: 'Cada carta na mesa é um neurônio. O valor da carta faz o papel da saída já ativada: é quanto aquele neurônio contribui para a soma da rede.',
    limite: 'O jogo pula a conta: a carta já traz o número pronto. Não há entradas, pesos nem viés a ajustar.' },
  { id: 'ativacao', titulo: 'Função de ativação', categoria: 'Fundamento',
    conceito: 'A ativação é a não linearidade aplicada depois da soma ponderada. Sem ela, empilhar camadas daria o mesmo que uma única camada linear. ReLU é a mais usada hoje; sigmoide e tangente hiperbólica saturam nos extremos, e isso alimenta o vanishing gradient.',
    equacao: bloco(mt('ReLU'), par(mi('z')), mo('='), mi('max'), par(mn('0'), mo(','), mi('z'))) +
      bloco(mi('σ'), par(mi('z')), mo('='), frac(mn('1'), linha(mn('1'), mo('+'), sup(mi('e'), linha(mo('−'), mi('z')))))) +
      bloco(mi('tanh'), par(mi('z')), mo('='), frac(linha(sup(mi('e'), mi('z')), mo('−'), sup(mi('e'), linha(mo('−'), mi('z')))), linha(sup(mi('e'), mi('z')), mo('+'), sup(mi('e'), linha(mo('−'), mi('z')))))),
    figura: 'ativacoes',
    noJogo: 'As cartas de figura (J, Q, K) valem 0 sozinhas, como um neurônio que a ReLU desligou. Só "acendem" em sequência de figuras iguais.',
    limite: 'É só uma lembrança visual: nenhuma carta aplica uma função de ativação de verdade.' },
  { id: 'camadas', titulo: 'Camadas e arquiteturas', categoria: 'Arquitetura',
    conceito: 'Redes densas organizam neurônios em camadas: a de entrada recebe os dados, as ocultas aprendem representações intermediárias e a de saída entrega a predição. A arquitetura é a escolha de quantas camadas e quantos neurônios em cada uma.',
    equacao: bloco(camada(negrito('h')), mo('='), mi('φ'), par(camada(negrito('W')), sup(negrito('h'), linha(mo('('), mi('l'), mo('−'), mn('1'), mo(')'))), mo('+'), camada(negrito('b')))),
    figura: 'rede',
    noJogo: 'Cada coluna da mesa é uma camada. Na arquitetura padrão são 3 neurônios na entrada, 5 camadas ocultas de 5 e 4 na saída; o menu também tem a curta, a profunda e a larga. Cada jogador além do segundo acrescenta um neurônio por camada. Entrada e saída são imunes a ações, como dados e rótulos que não mudam durante o treino.',
    limite: 'Numa rede de verdade todos os neurônios de uma camada se ligam a todos da seguinte. No jogo cada rede é um caminho com um neurônio por camada (em azul na figura).' },
  { id: 'forward', titulo: 'Propagação direta', categoria: 'Treino',
    conceito: 'No forward pass o sinal atravessa a rede da entrada até a saída, camada por camada. Cada camada só recebe o que a anterior produziu, então a rede inteira é uma composição de funções.',
    equacao: bloco(chapeu('y'), mo('='), sup(mi('f'), linha(mo('('), mi('L'), mo(')'))), par(mo('⋯'), sup(mi('f'), linha(mo('('), mn('2'), mo(')'))), par(sup(mi('f'), linha(mo('('), mn('1'), mo(')'))), par(negrito('x'))))),
    noJogo: 'Você constrói a rede um neurônio por camada, sempre avançando para a camada seguinte. A soma das cartas desse caminho é a saída da sua rede.',
    limite: 'No jogo os valores se somam; numa rede de verdade cada camada transforma o que recebe.' },
  { id: 'pesos', titulo: 'Pesos e conexões', categoria: 'Fundamento',
    conceito: 'Os pesos dizem quanto cada conexão importa. Eles são os parâmetros que o treino ajusta: a cada passo, a descida do gradiente move cada peso um pouco na direção que mais reduz a perda. No TensorFlow Playground, a espessura de uma linha mostra o tamanho do peso e a cor mostra o sinal.',
    equacao: bloco(mi('w'), mo('←'), mi('w'), mo('−'), mi('η'), parc(mi('L'), mi('w'))),
    noJogo: 'As linhas entre os neurônios de uma rede engrossam quando a carta vale mais, e cada rede tem a sua cor. É um empréstimo visual do Playground.',
    limite: 'As linhas da mesa não são pesos: ninguém os aprende. A espessura mostra o valor da carta, que faz o papel do sinal que passa, não da importância da ligação.' },
  { id: 'perda', titulo: 'Curva de treino', categoria: 'Treino',
    conceito: 'Durante o treino acompanhamos a função de perda época a época, nos dados de treino e num conjunto de validação separado. A de treino quase sempre cai; a de validação cai, estabiliza e, quando o modelo começa a decorar, volta a subir.',
    equacao: bloco(mi('L'), par(mi('θ')), mo('='), frac(mn('1'), mi('n')), soma(linha(mi('i'), mo('='), mn('1')), mi('n')), mi('ℓ'), par(mi('f'), par(sub(negrito('x'), mi('i')), mo(';'), mi('θ')), mo(','), sub(mi('y'), mi('i')))),
    figura: 'curvas',
    noJogo: 'O gráfico do painel mostra a soma de cada rede turno a turno. Ela sobe quando a rede melhora, como uma curva de acurácia, ao contrário da perda, que cai. Quedas bruscas são overfits e early stops sofridos.',
    limite: 'A soma do jogo não é medida em dados novos: não há validação, então a curva da mesa não mostra sobreajuste.' },
  { id: 'backprop', titulo: 'Retropropagação', categoria: 'Treino',
    conceito: 'Para treinar, a rede calcula o quanto cada peso contribuiu para o erro, da saída para a entrada, aplicando a regra da cadeia camada por camada. O gradiente que chega a uma camada é o produto das derivadas de todas as camadas depois dela.',
    equacao: bloco(parc(mi('L'), camada(negrito('h'))), mo('='), parc(mi('L'), sup(negrito('h'), linha(mo('('), mi('L'), mo(')')))), prod(linha(mi('k'), mo('='), mi('l'), mo('+'), mn('1')), mi('L')), parc(camada(negrito('h'), 'k'), sup(negrito('h'), linha(mo('('), mi('k'), mo('−'), mn('1'), mo(')'))))),
    noJogo: 'O jogo não tem treino de verdade, mas a quadra de figuras (vanishing gradient) e as ações que desfazem camadas lembram o sinal que volta da saída para trás.',
    limite: 'Nenhuma jogada calcula gradiente: é a ideia, não a conta.' },
  { id: 'tunagem', titulo: 'Tunagem (ajuste fino)', categoria: 'Ação', autoria: 'Suzy Arcanjo',
    ideia: 'Um músico que já toca bem e passa a ensaiar só uma música específica para um show. Ele não reaprende a tocar: só ajusta o que já sabe.',
    conceito: 'Fine-tuning é continuar treinando um modelo já treinado, com poucos dados novos e uma taxa de aprendizado pequena, para reforçar o que ele faz numa tarefa específica. Ajustar demais, porém, deixa o modelo frágil e especializado.',
    equacao: bloco(mi('θ'), mo('←'), sub(mi('θ'), mt('pré')), mo('−'), sub(mi('η'), mt('pequena')), sub(mo('∇'), mi('θ')), sub(mi('L'), mt('nova tarefa'))),
    noJogo: 'Empilhe 1 carta do mesmo valor sobre o seu último neurônio oculto: ela soma à rede (em figura, entra na sequência de figuras iguais). O risco: com 2 cartas na pilha, mais uma do rival já vira early stop na sua rede.',
    limite: 'No jogo o ajuste só soma pontos; no fine-tuning de verdade o modelo pode piorar em outras tarefas (esquecimento catastrófico).' },
  { id: 'overfit', titulo: 'Overfitting', categoria: 'Ação', autoria: 'Suzy Arcanjo',
    ideia: 'Um aluno que decora o gabarito das provas antigas em vez de entender a matéria. Nas questões repetidas tira 10; quando a prova muda, erra tudo.',
    conceito: 'Sobreajuste é quando o modelo decora o conjunto de treino, inclusive o ruído, e generaliza mal para dados novos. Aparece como uma distância grande entre o erro de treino e o de validação, e é combatido com regularização, mais dados, dropout e parada antecipada.',
    equacao: bloco(mt('lacuna de generalização'), mo('='), sub(mi('L'), mt('validação')), mo('−'), sub(mi('L'), mt('treino'))),
    figura: 'sobreajuste',
    noJogo: 'Jogue 1 carta do mesmo valor sobre o último neurônio oculto do rival, deixando a pilha com 2 cartas: o neurônio vai para o cemitério e a rede dele recua uma camada.',
    aprofundar: String.raw`O sinal típico é o erro de treino continuar caindo enquanto o erro em dados novos (validação) começa a subir. Um remédio clássico é a regularização, que soma ao erro uma "multa" quando os pesos crescem demais ($\lambda$ controla a força dessa multa):`,
    formula: String.raw`L(w) = \frac{1}{n}\sum_{i=1}^{n} (y_i - \hat{y}_i)^2 + \lambda \sum_j w_j^2`,
    limite: 'Na vida real ninguém ataca a rede dos outros com overfitting: é um defeito do próprio treino. O jogo transforma o defeito em ataque.' },
  { id: 'dropout', titulo: 'Dropout', categoria: 'Ação', autoria: 'Suzy Arcanjo',
    ideia: 'Num trabalho em grupo, um aluno faz tudo e os outros se encostam. Se o professor sortear, a cada aula, alguns alunos para ficarem de fora, todo mundo precisa aprender tudo, e o grupo fica forte mesmo quando alguém falta.',
    conceito: 'Dropout desliga neurônios sorteados a cada passo do treino. A rede deixa de depender de poucos caminhos e generaliza melhor. No uso (inferência), todos os neurônios voltam a funcionar.',
    equacao: bloco(sub(mi('m'), mi('i')), mo('∼'), mt('Bernoulli'), par(mn('1'), mo('−'), mi('p')), mo(','), mspace(), linha(mover('h'), mo('='), frac(linha(negrito('m'), mo('⊙'), negrito('h')), linha(mn('1'), mo('−'), mi('p'))))),
    figura: 'dropout',
    noJogo: 'GatoNet: descarte 1 carta da mão para cada camada oculta que quiser desfazer, da última para trás. Os neurônios desfeitos vão para o cemitério e você continua da camada anterior. Não gasta o turno, mas no empate ganha quem fez menos dropouts.',
    limite: 'No treino o sorteio é aleatório e temporário; no jogo você escolhe o que desligar, e o neurônio sai da mesa de vez.',
    fonte: 'Srivastava, Hinton, Krizhevsky, Sutskever e Salakhutdinov (2014), "Dropout: a simple way to prevent neural networks from overfitting", JMLR 15.' },
  { id: 'earlystop', titulo: 'Early stopping', categoria: 'Ação', autoria: 'Suzy Arcanjo',
    ideia: 'Quem estuda para uma prova até tarde da noite chega a um ponto em que continuar só cansa e piora. O melhor é parar na hora certa.',
    conceito: 'Parada antecipada interrompe o treino quando o erro de validação para de cair por algumas épocas seguidas (a paciência) e guarda o modelo do melhor momento. Evita o sobreajuste sem mexer na arquitetura.',
    equacao: bloco(sup(mi('t'), mo('*')), mo('='), sub(mi('arg min'), mi('t')), sub(mi('L'), mt('validação')), par(mi('t'))),
    figura: 'curvas',
    noJogo: 'Deixe o último neurônio oculto do rival com 3 cartas no total: o neurônio vai para o cemitério e a rede dele é finalizada ali, com a soma que tiver. Quem sofre early stop pode passar a vez.',
    limite: 'Na vida real a parada antecipada é uma proteção que o próprio treinador escolhe. No jogo virou punição, mas a ideia de "a rede para onde está" se mantém.' },
  { id: 'stackoverflow', titulo: 'Stack overflow', categoria: 'Ação', autoria: 'Suzy Arcanjo',
    ideia: 'Empilhar pratos sem parar. Uma hora a pilha passa do limite e desaba.',
    conceito: 'Stack overflow não é um conceito de redes neurais: é um erro de programação. Cada chamada de função ocupa um quadro na pilha de chamadas; uma recursão sem fim empilha quadros até estourar a memória reservada, e o programa para. O parente mais próximo em redes neurais é a explosão de gradientes, quando o produto de muitos fatores maiores que 1 cresce até virar infinito ou NaN, mas é outro fenômeno e tem outra cura (gradient clipping, normalização).',
    equacao: bloco(mt('chamadas'), mo('×'), mt('quadro'), mo('&gt;'), mt('pilha'), mspace(), mo('⇒'), mspace(), mt('estouro')) +
      bloco(mt('explosão de gradientes (outro fenômeno):'), mspace(), linha('<mo>‖</mo>', prod(linha(mi('k'), mo('='), mn('1')), mi('L')), sub(negrito('J'), mi('k')), '<mo>‖</mo>'), mo('→'), mi('∞')),
    noJogo: 'Deixe o último neurônio oculto do rival com 4 cartas no total: a pilha "estoura", a rede dele é finalizada e ele perde todas as cartas da mão.',
    aprofundar: String.raw`A recursão precisa de um caso de parada. O fatorial, por exemplo, para em $0! = 1$. Sem essa linha, as chamadas nunca terminariam e a pilha estouraria:`,
    formula: String.raw`n! = n \cdot (n-1)!, \qquad 0! = 1`,
    limite: 'É uma piada de programador: a pilha de 4 cartas lembra a pilha de chamadas. Não descreve nada que aconteça no treino de uma rede.' },
  { id: 'vanishing', titulo: 'Vanishing gradient', categoria: 'Combo',
    conceito: 'Na retropropagação, o gradiente que chega às primeiras camadas é um produto de muitas derivadas. Com ativações saturantes como a sigmoide, cuja derivada nunca passa de 1/4, esse produto encolhe a cada camada e as primeiras param de aprender. ReLU, inicialização cuidadosa, normalização e conexões residuais ajudam.',
    equacao: bloco(abs(parc(mi('L'), sup(negrito('h'), linha(mo('('), mn('1'), mo(')'))))), mo('≲'), sup(par(frac(mn('1'), mn('4'))), linha(mi('L'), mo('−'), mn('1'))), abs(parc(mi('L'), sup(negrito('h'), linha(mo('('), mi('L'), mo(')')))))),
    figura: 'vanishing',
    noJogo: 'Quatro figuras iguais em camadas vizinhas (contando as empilhadas) zeram a rede inteira. Cada figura da sequência vale 10: par 20, trio 30. A cobiça tem limite: tunar os dois Reis de um par já forma a quadra.',
    limite: 'No jogo a repetição de figuras é o gatilho; numa rede de verdade a causa é a profundidade com derivadas pequenas.',
    fonte: 'Hochreiter (1991) e Bengio, Simard e Frasconi (1994), "Learning long-term dependencies with gradient descent is difficult", IEEE TNN 5(2).' },
  { id: 'transfer', titulo: 'Transfer learning', categoria: 'Ação', autoria: 'Suzy Arcanjo',
    ideia: 'Quem já sabe andar de bicicleta aprende a andar de moto mais rápido, porque aproveita o equilíbrio que já tem.',
    conceito: 'Aprendizado por transferência reaproveita um modelo pré-treinado em outra tarefa: as camadas iniciais, que aprenderam padrões gerais, ficam congeladas, e só as últimas são treinadas de novo. Economiza dados e tempo de treino.',
    equacao: bloco(mi('θ'), mo('='), par(sub(mi('θ'), mt('base')), mt(' (congelado)'), mo(','), sub(mi('θ'), mt('cabeça')), mt(' (treinado)'))),
    noJogo: 'Com 4 cartas do mesmo valor na mão, revele-as e troque-as por 4 cartas do limbo. Uma vez por partida e não gasta o turno.',
    aprofundar: String.raw`A rede da tarefa B começa com os pesos $\theta_A$ aprendidos na tarefa A, que ficam "congelados" na parte $g$; só a parte final $h$ é treinada com os dados da tarefa B:`,
    formula: String.raw`\min_{\theta_h} \; L_B\big(h_{\theta_h}(g_{\theta_A}(x))\big)`,
    limite: 'A comparação é fraca: o ponto em comum é trazer algo de fora em vez de começar do zero.' },
  { id: 'ruido', titulo: 'Ruído e limbo', categoria: 'Dados',
    conceito: 'Dados reais têm ruído. Injetar ruído de propósito (aumento de dados, inicialização aleatória) torna o modelo mais robusto a variações que ele vai encontrar no uso.',
    equacao: bloco(mover('x'), mo('='), negrito('x'), mo('+'), mi('ε'), mo(','), mspace(), mi('ε'), mo('∼'), mi('𝒩'), par(mn('0'), mo(','), sup(mi('σ'), mn('2')))),
    noJogo: 'As cartas que sobram vão para o limbo sem serem vistas (10 por baralho). Elas tiram a certeza de qualquer contagem de cartas e só voltam via transfer learning.',
    limite: 'O limbo esconde cartas; não perturba nenhum dado.' },
  { id: 'montecarlo', titulo: 'Simulação de Monte Carlo', categoria: 'Métodos',
    conceito: 'Monte Carlo estima uma quantidade gerando muitas realizações aleatórias de um processo e tirando a média. O erro cai com a raiz do número de simulações. A busca em árvore de Monte Carlo (MCTS) usa isso para escolher jogadas.',
    equacao: bloco(mover('μ'), mo('='), frac(mn('1'), mi('N')), soma(linha(mi('i'), mo('='), mn('1')), mi('N')), sub(mi('X'), mi('i')), mo(','), mspace(), mt('erro'), mo('∝'), frac(mi('σ'), raiz(mi('N')))),
    noJogo: 'O Mestre Monte Carlo, oponente de nível difícil, sorteia o que não vê (sua mão, as cartas viradas, o limbo), joga muitas partidas até o fim para cada jogada e escolhe a que mais venceu.',
    limite: 'Aqui a comparação é direta: o oponente faz exatamente isso.' },
  { id: 'terrenos', titulo: 'Mudança de distribuição', categoria: 'Dados',
    conceito: 'Modelos sofrem quando os dados de uso diferem dos de treino (dataset shift) ou mudam com o tempo (concept drift). Regularizações como o weight decay encolhem os pesos a cada passo para o modelo não depender de valores extremos.',
    equacao: bloco(mt('weight decay:'), mspace(), mi('w'), mo('←'), par(mn('1'), mo('−'), mi('η'), mi('λ')), mi('w'), mo('−'), mi('η'), parc(mi('L'), mi('w'))) +
      bloco(mt('concept drift:'), mspace(), sub(mi('P'), mi('t')), par(negrito('x'), mo(','), mi('y')), mo('≠'), sub(mi('P'), linha(mi('t'), mo('′'))), par(negrito('x'), mo(','), mi('y'))),
    noJogo: 'Montanha premia a profundidade: cada neurônio vale 1 ponto a mais por camada. Pântano é o weight decay: neurônios sem tunagem perdem 1 ponto por rodada. Oceano é o concept drift: a cada rodada o vento muda o naipe que vale o dobro ao ser revelado.',
    limite: 'Os terrenos mudam a pontuação, não os dados; a comparação é com o efeito, não com o mecanismo.' },
  { id: 'truco', titulo: 'Decisão sob incerteza', categoria: 'Métodos',
    conceito: 'Escolher com informação incompleta é estimar probabilidades e comparar valores esperados. Blefar funciona porque o outro lado também só estima.',
    equacao: bloco(mt('aceitar se'), mspace(), mi('p'), mi('v'), mo('′'), mo('−'), par(mn('1'), mo('−'), mi('p')), mi('v'), mo('′'), mo('&gt;'), mo('−'), mi('v'), mspace(), mo('⇔'), mspace(), mi('p'), mo('&gt;'), frac(linha(mi('v'), mo('′'), mo('−'), mi('v')), linha(mn('2'), mi('v'), mo('′')))),
    noJogo: 'Peça TRUCO quando achar que vence: a mão passa a valer 3, depois 6, 9 e 12. Quem corre entrega o valor atual v; quem aceita joga pelo novo valor v′. Contra um TRUCO numa mão que vale 1, aceitar compensa com chance de vitória acima de 1/3. Os oponentes estimam essa chance simulando a mão.',
    limite: 'Só vale entre 2 jogadores: com 3 ou mais na mesa o truco fica desligado.' },
];

/** Espaço entre duas equações na mesma linha. */
function mspace() { return '<mspace width="1.2em"/>'; }
/** Variável com til (versão perturbada ou mascarada). */
function mover(x) { return '<mover>' + mi(x) + mo('~') + '</mover>'; }
