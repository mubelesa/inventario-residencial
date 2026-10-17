# Arquitetura e regras

## Decisão técnica

Aplicação estática, em JavaScript com módulos ES e sem framework. A biblioteca pdf-lib 1.17.1 é distribuída localmente em `vendor/`, com licença MIT, para gerar PDFs no navegador, sem CDN ou envio a servidor. A versão inicial valida os fluxos de inventário e conferência com baixo custo de instalação. Não existe backend. O servidor Node.js incluído serve somente arquivos para desenvolvimento.

## Estrutura

```text
index.html               Estrutura acessível e formulários
styles.css               Layout, responsividade e temas
src/domain.js            Validação, operações e cálculos puros
src/storage.js           Persistência e proteção contra sobrescrita entre abas
src/app.js               Interface, navegação por hash e eventos
src/pdf.js               Relatório PDF A4 e paginação de tabelas
vendor/                  pdf-lib e licença MIT
sw.js                    Cache dos arquivos para uso offline
manifest.webmanifest     Metadados da aplicação web instalável
scripts/serve.mjs        Servidor estático de desenvolvimento
scripts/browser-qa.cjs   Suíte de interface com Playwright
tests/                   Testes de negócio e persistência
docs/                    Guias e evolução
```

## Modelo de dados

O estado versionado contém `schemaVersion`, `revision`, `moveName`, `rooms`, `boxes` e `items`.

Um **objeto** contém `id`, `name`, `room`, `category`, `quantity`, `packed`, `transported`, `checked`, `boxId`, `fragile` e `notes`. `boxId` pode ser nulo. Cada cadastro representa uma unidade ou um grupo de unidades iguais.

Uma **caixa** contém `id`, `name`, `destination` e `status` (`preparando`, `transporte` ou `destino`). As associações apontam para caixas e cômodos existentes. Etiquetas de caixa e nomes de cômodo não podem ser duplicados, ignorando acentos e maiúsculas.

## Regras

1. Todas as contagens são inteiras, de 0 a 99.999; a quantidade total começa em 1.
2. `checked ≤ transported ≤ packed ≤ quantity`.
3. O total de pendências é a soma de `quantity - checked`.
4. Progresso usa **unidades**, não o número de cadastros.
5. Situação da caixa não altera o estado dos objetos. Pode indicar divergência que o usuário precisa conferir.
6. Caixa e cômodo ocupados não podem ser excluídos.
7. A importação substitui o inventário somente após validação completa e confirmação.
8. O estado em memória só é atualizado depois da gravação bem-sucedida.

Os indicadores dos cards resumem o andamento: a embalar; embalagem iniciada; a conferir (há unidades transportadas); conferido (todas verificadas). As contagens detalhadas continuam sendo a referência em situações parciais.

## Persistência e segurança

O `InventoryRepository` valida os dados, guarda o snapshot original e compara esse snapshot antes de salvar. Se outra aba tiver gravado mudanças, a operação é recusada até recarregar. Essa proteção é otimista e não oferece transações entre processos: duas gravações exatamente simultâneas ainda podem competir. O uso recomendado é em uma aba por vez.

Falhas de quota e conteúdo corrompido produzem mensagens sem apagar silenciosamente os dados existentes. Backups são limitados a 3 MB e normalizados para um esquema conhecido. Conteúdo do usuário é apresentado com `textContent`, sem interpretação como HTML. Não são aceitos arquivos executáveis nem credenciais.

Não há autenticação, criptografia de dados ou controle multiusuário. Quem usa o mesmo perfil do navegador pode acessar o inventário. O service worker armazena os arquivos estáticos; os objetos ficam exclusivamente no LocalStorage. A preferência de tema é uma chave separada.

## Offline e atualização

O cache é ativado após a primeira carga em HTTPS ou localhost. As requisições tentam a rede e recorrem ao cache se ela falhar. Só arquivos conhecidos da aplicação são interceptados. Versões futuras devem atualizar o identificador do cache em `sw.js`; o worker novo assume o controle após o ciclo normal de fechamento das abas antigas. Não há mecanismo de sincronização.

## Evolução

Fotos e volumes maiores de dados justificariam migração para IndexedDB. Compartilhamento exigiria backend, autenticação e resolução de conflitos. A futura versão nativa Android deve reutilizar os conceitos e testes das regras, mas terá implementação e persistência próprias.
