# Configurar o Firebase (contas e salas pela internet)

Guia da issue #40, parte do pedido do professor em #11: criar conta (com progresso e conquistas de
cada pessoa) e partidas com várias pessoas, cada uma na sua tela.

O projeto é o **`truco-e26e8`** do [console do Firebase](https://console.firebase.google.com/project/truco-e26e8-703bc/overview),
cujo **ID é `truco-e26e8-703bc`**: o nome aparece no console, mas o código usa o ID (em
`src/online/configuracao.js`, `.firebaserc` e nos endereços do console). Configurado em 14/11/2026:
login com Google e e-mail/senha, domínio `welyngton.github.io` autorizado, Firestore `(default)` e
regras publicadas, e app da Web `truco-de-turing` registrado. Sem essa configuração, o progresso
fica só no navegador e as salas funcionam apenas entre abas do mesmo navegador.

O plano gratuito (Spark) basta para o uso da disciplina. Os dados do app da Web em
`src/online/configuracao.js` não são segredo, porque quem protege os dados são as regras do
Firestore (`firestore.rules`).

## 1. Login com Google e com e-mail e senha

1. No menu da esquerda, abra **Criação > Authentication** e clique em **Vamos começar**, se o
   botão aparecer.
2. Na aba **Método de login** (*Sign-in method*), adicione **Google**, ative, escolha o e-mail de
   suporte do projeto e salve.
3. Adicione também **E-mail/senha** e ative só a primeira chave (*E-mail/senha*). O "link do
   e-mail" fica desligado, porque o jogo não usa.

## 2. Autorizar o endereço do jogo

Ainda em Authentication, abra **Configurações > Domínios autorizados** e adicione
`welyngton.github.io`. `localhost` e `truco-e26e8-703bc.firebaseapp.com` já vêm na lista. Sem isso, o
login com Google no site publicado mostra o aviso de "endereço não autorizado".

## 3. Criar o Firestore e publicar as regras

1. Abra **Criação > Firestore Database** e clique em **Criar banco de dados**. O ID do banco fica
   **`(default)`**, porque o jogo usa o banco padrão.
2. Local: **`southamerica-east1` (São Paulo)**, o mais perto dos jogadores. **Essa escolha não
   pode ser mudada depois.**
3. Comece no **modo de produção**, que recusa tudo até as regras serem publicadas.
4. Na aba **Regras**, apague o que houver, cole o conteúdo de [`firestore.rules`](../firestore.rules)
   e clique em **Publicar**.
5. Na aba **Índices**, em **Isenções de campo único** (*Single field*), clique em **Adicionar
   isenção**: coleção `mensagens`, campo `expira`, marque **Grupo de coleções** e deixe os índices
   **Crescente** ligados para *Coleção* e para *Grupo de coleções*. É o índice da limpeza das salas
   antigas (veja abaixo). Sem ele, a limpeza falha em silêncio e as mensagens vencidas ficam.

Também dá para publicar as regras e o índice pela linha de comando, porque o repositório já tem
`firebase.json`, `firestore.indexes.json` e `.firebaserc` apontando para o projeto:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore
```

**Publique as regras depois que o site com a versão nova estiver no ar** (o merge na `main`
publica o GitHub Pages em alguns minutos). As regras novas recusam mensagens sem `uid` e
`expira`, e quem ainda estiver com a versão antiga aberta perde a sala até recarregar a página.

O que as regras deixam fazer:

- `contas/{uid}`: cada conta lê e grava só o próprio progresso.
- `salas/{codigo}/mensagens/{id}`: quem está conectado e sabe o código da sala lê as mensagens.
  Mensagem nova só dos tipos que a sala usa (`sala`, `ola`, `pedido`, `acao`, `vivo`, `tchau`), com
  o `uid` de quem envia (ninguém grava em nome de outra conta), a hora do servidor em `em` e a data
  em que vence em `expira` (o jogo usa 6 horas; as regras aceitam até 1 dia). Ninguém edita.
  Depois de vencida, qualquer conta pode apagar a mensagem.
- Busca nas mensagens de todas as salas (grupo de coleções `mensagens`): só acha as vencidas. Sem
  o código, ninguém lista as salas abertas.

Os testes das regras rodam no emulador do Firestore (`npm run testar:regras`, precisa de Java 21;
no GitHub Actions é o job **regras**). Outro teste (`testes/unidade/firebase-config.test.js`)
confere que a lista de tipos acompanha o que `src/online/sala.js` envia.

### Quem é quem na sala (#62)

Cada aparelho tem um código de cliente (`de`), e cada mensagem chega com o `uid` da conta. A sala
(`src/online/sala.js`) guarda a primeira conta que usou cada código e ignora mensagens com o mesmo
código vindas de outra conta. A cadeira guarda o `uid` de quem sentou, e o anfitrião só numera
pedidos desse `uid`, em nome da própria cadeira. Os convidados só aceitam ações numeradas do
anfitrião, e só aceitam um anfitrião novo que esteja sentado na sala.

### Limpeza das salas antigas (#62)

O TTL do Firestore (apagar documentos sozinho depois de uma data) não funciona no plano gratuito
(Spark): ele só apaga com faturamento ativado. Por isso o próprio jogo limpa as salas antigas. Na
primeira sala pela internet de cada visita, o jogo busca até 200 mensagens vencidas de todas as
salas e as apaga (`limparMensagensVencidas` em `src/online/firebase.js`). Assim as salas
terminadas somem do banco algumas horas depois, sempre que alguém volta a jogar online.

Se o projeto passar para o plano Blaze, dá para ligar também o TTL: em **Firestore Database >
TTL**, crie uma política para o grupo de coleções `mensagens` no campo `expira`.

As mensagens gravadas antes desta versão (por exemplo, das salas de teste `ZZTST`, `TPTYY` e
`TKGTE`) não têm `expira` e não são achadas pela limpeza. Apague a coleção `salas` uma vez no
console (**Firestore Database > Dados**, menu ⋮ de `salas` > **Excluir coleção**).

## 4. Conferir o app da Web

Em **Configurações do projeto > Geral > Seus apps**, abra o app da Web e compare o objeto
`firebaseConfig` com `src/online/configuracao.js`. Se algum valor for diferente, como `apiKey` ou
`appId`, copie do console para o arquivo. O `measurementId` fica de fora, porque o Google Analytics
é carregado à parte e só com consentimento. Se ainda não houver app da Web, registre um (sem
Firebase Hosting) e copie a configuração dele. O teste `testes/unidade/firebase-config.test.js`
confere que os campos são do mesmo projeto que `.firebaserc`.

## 5. Testar (critérios de aceite da #40)

Use o jogo publicado (`https://welyngton.github.io/truco-de-turing/`) depois do merge, ou o
`index.html` servido em `localhost`.

**Conta com o mesmo progresso em dois navegadores**

1. No computador, abra **Jogar online > Criar conta** com e-mail e senha, ou **Entrar com Google**.
2. Abra um verbete do **Glossário** que ainda não foi lido. Ele passa a aparecer como "lido".
3. Em outro navegador ou no celular, entre com a mesma conta. O verbete deve aparecer como "lido"
   lá também, assim como as conquistas ganhas no primeiro aparelho.
4. No console, em **Firestore Database > Dados**, deve existir `contas/<uid>`.

**A conta continua conectada ao recarregar (#60)**

1. Entre numa conta e volte ao menu. Abaixo de **Jogar** aparece "Conectado como …".
2. Recarregue a página (F5). Em um ou dois segundos a mesma linha volta, sem clicar em nada, e
   **Jogar online** abre já conectado.
3. Leia outro verbete do Glossário e confira, em outro aparelho com a mesma conta, que ele aparece
   como "lido".
4. Clique em **Sair da conta** e recarregue: o menu não mostra conta nenhuma.

Para isso, o login grava a marca `truco-de-turing:conta` no `localStorage` e sair da conta a apaga.
Só com a marca o jogo baixa o SDK do Firebase ao abrir (`src/interface/conta.js`). Se a sessão do
Firebase tiver acabado, a marca é apagada em silêncio. Se o Firestore falhar na retomada, aparece o
aviso "Não deu para retomar a conta…" e o jogo tenta de novo na próxima visita.

**Partida entre dois aparelhos pelo código da sala**

1. Entre numa conta nos dois aparelhos (pode ser a mesma ou outra).
2. No computador, em **Jogar online**, crie a sala para 2 pessoas e leia o código de 5 letras.
3. No celular, entre com o código. Quando a cadeira aparecer ocupada, comece a partida no computador.
4. Jogue a mão até o fim, com um truco no meio. As duas telas devem terminar com o mesmo placar.

## Se algo der errado

O jogo explica os erros do Firebase em português (`src/online/errosFirebase.js`). O aviso já indica
onde mexer:

| Aviso no jogo | O que falta |
|---|---|
| "Esse jeito de entrar ainda não está ativado…" | Passo 1 |
| "Este endereço ainda não está autorizado…" | Passo 2 |
| "O banco Firestore do projeto ainda não foi criado…" | Passo 3, criar o banco |
| "O Firestore recusou o pedido…" | Passo 3, publicar as regras |
| "A chave do app da Web… não confere" | Passo 4 |
| "O progresso ficou só neste aparelho…" | Gravar na conta falhou. O motivo vem no próprio aviso. |
| "A sala perdeu a conexão…" | O Firestore recusou ler ou gravar as mensagens da sala. O motivo vem no próprio aviso. |

Se o Firestore falhar no login, a conta não chega a valer. O jogo continua com o progresso do
aparelho e não finge que salvou na nuvem.

Na sala, o estado fica sempre escrito: "Aguardando o(s) outro(s) jogador(es). O código da sala é
…", quantas pessoas entraram, "Não achei a sala …" (depois de 8 segundos sem resposta de quem
criou) ou a falha de conexão. Sem conta, a sala só funciona entre abas do mesmo navegador, e a
tela avisa isso.

## Rastreio dos jogadores (issue #66)

Cada conta guarda em `contas/<uid>`, além do progresso:

| Campo | O que tem |
|---|---|
| `perfil` | nome, e-mail e método de login |
| `estatisticas` | acessos, primeiro e último acesso, versão e aparelho do último acesso; partidas (iniciadas, terminadas, vencidas, abandonadas); mãos (jogadas, vencidas); trucos pedidos; salas criadas, salas em que entrou e partidas online; jogadas e vitórias por oponente, baralho e terreno |
| `resumo` | conquistas, verbetes lidos, acessos, último acesso, partidas, vitórias e mãos, para listar sem abrir o resto |

Os contadores vêm dos mesmos eventos enviados ao Google Analytics (`src/online/estatisticas.js`),
mas valem para toda conta, com ou sem consentimento de medição. Sem conta, ficam no aparelho e
sobem quando a pessoa entra. Na junção entre aparelho e conta vale o maior de cada contador, como
no resto do progresso: partidas jogadas em dois aparelhos sem conexão entre uma e outra podem
contar a menos.

### Dar acesso de administrador

A tela **Jogadores** (botão em "Jogar online") lista todas as contas e baixa o CSV. Ela só aparece
para quem tem um documento em `admins/<uid>`:

1. Entre no jogo com a conta que vai administrar.
2. No console, abra **Authentication > Usuários** e copie o **UID do usuário** dessa conta.
3. Em **Firestore Database > Dados**, crie a coleção `admins` com um documento cujo **ID é esse
   UID**. O conteúdo não importa (por exemplo, o campo `desde` com a data).
4. Publique as regras de `firestore.rules` de novo (passo 3 deste guia): elas deixam o
   administrador ler todas as contas, sem gravar em nenhuma, e cada conta ler só o próprio
   documento de `admins`.

Para tirar o acesso, apague o documento. O jogo não consegue criar nem apagar administradores.

## Limites conhecidos

- A limpeza das salas antigas depende de alguém abrir uma sala pela internet (veja acima). Sem
  ninguém jogando, as mensagens vencidas esperam a próxima visita.
- Cada aparelho tem o estado completo da mão, porque é assim que a sincronia funciona sem servidor
  próprio. Quem abrir o console do navegador consegue ver as cartas dos outros.
- **Leitura das salas (avaliado na #62, não restringido):** qualquer conta que saiba o código lê as
  mensagens da sala. Restringir a leitura a quem está sentado exigiria guardar as cadeiras num
  documento da sala e consultá-lo nas regras a cada mensagem, o que conta uma leitura a mais por
  mensagem (o sinal de vida vai a cada 3 segundos por jogador) e gasta a cota gratuita mais rápido.
  O ganho é pequeno: quem está sentado já tem as cartas de todos no aparelho, e quem não está
  precisa adivinhar um código entre cerca de 33 milhões, porque as regras não deixam listar as
  salas. E o anfitrião, que numera as ações, continua sendo de confiança.
