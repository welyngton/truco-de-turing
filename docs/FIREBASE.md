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

Também dá para publicar as regras pela linha de comando, porque o repositório já tem
`firebase.json` e `.firebaserc` apontando para o projeto:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

O que as regras deixam fazer:

- `contas/{uid}`: cada conta lê e grava só o próprio progresso.
- `salas/{codigo}/mensagens/{id}`: quem está conectado lê as mensagens e cria mensagens novas dos
  tipos que a sala usa (`sala`, `ola`, `pedido`, `acao`, `vivo`, `tchau`). Ninguém edita nem apaga.
  Um teste (`testes/unidade/firebase-config.test.js`) confere que essa lista acompanha o que
  `src/online/sala.js` envia.

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

**Partida entre dois aparelhos pelo código da sala**

1. Entre numa conta nos dois aparelhos (pode ser a mesma ou outra).
2. No computador, em **Jogar online**, crie a sala para 2 pessoas e leia o código de 5 letras.
3. No celular, entre com o código. Quando a cadeira aparecer ocupada, comece a partida no computador.
4. Jogue a mão até o fim, com um truco no meio. As duas telas devem terminar com o mesmo placar.

## Se algo der errado

Na tela **Jogar online**, o jogo mostra o erro do Firebase como ele vem, com o código entre
parênteses. O código indica onde mexer:

| Código no aviso | O que falta |
|---|---|
| `auth/operation-not-allowed`, `auth/configuration-not-found` | Passo 1 |
| `auth/unauthorized-domain` | Passo 2 |
| `permission-denied`, `failed-precondition`, "database (default) does not exist" | Passo 3 |
| `auth/invalid-api-key`, `auth/api-key-not-valid`, `auth/admin-restricted-operation` | Passo 4: a configuração em `configuracao.js` não é deste projeto |

## Limites conhecidos

- As mensagens das salas ficam guardadas no Firestore, e nada as apaga. Para a disciplina, cabem
  com folga na cota gratuita. Se precisar limpar, apague a coleção `salas` no console.
- Cada aparelho tem o estado completo da mão, porque é assim que a sincronia funciona sem servidor
  próprio. Quem abrir o console do navegador consegue ver as cartas dos outros.
