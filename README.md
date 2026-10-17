# Casa em Ordem

Inventário residencial para organizar objetos e conferir uma mudança, feito em JavaScript, HTML e CSS. A interface se adapta a computadores e celulares e tem temas claro e escuro.

**Projeto experimental para testes e aprendizado.** A intenção do autor, Valter Murilo Belluzzo, é refazer o sistema como aplicativo nativo para Android após validar o fluxo. Esta entrega é uma aplicação web, não um aplicativo Android nativo.

## Executar

Instale Node.js 20 ou superior. No terminal, dentro desta pasta:

```powershell
npm start
```

Abra `http://127.0.0.1:4173/`. Não há dependências para instalar e não é necessário executar `npm install`. Não abra `index.html` diretamente: os módulos JavaScript e o modo offline precisam de um servidor HTTP.

Outra opção, com Python instalado:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

## Funcionalidades

- Cadastro, edição e exclusão de objetos com quantidade, cômodo, categoria, caixa, fragilidade e observações.
- Caixas identificadas por etiqueta, destino e situação de transporte.
- Controle separado das quantidades embaladas, transportadas e conferidas.
- Busca sem distinção de acentos e filtros por cômodo, andamento, fragilidade ou caixa.
- Resumo de unidades pendentes e progresso de conferência.
- Cadastro de cômodos e nome da mudança.
- Exportação e restauração de backup JSON com validação e confirmação.
- Exportação do inventário completo em PDF A4, agrupado por cômodo, com campos para conferência no papel.
- Demonstração com dados fictícios, iniciada por escolha do usuário.
- Interface responsiva, temas e suporte offline após a primeira carga bem-sucedida e ativação do service worker.

## Como os dados funcionam

O inventário fica no **LocalStorage do navegador**, sem servidor de dados, conta, sincronização ou telemetria. O endereço do site, navegador e perfil determinam qual armazenamento será usado. Trocar `localhost` por `127.0.0.1`, por exemplo, abre outro armazenamento.

Exporte backups regularmente. Limpar dados do site ou usar navegação privada pode eliminar o inventário. Os backups contêm os textos cadastrados; não são criptografados.

A regra principal é `0 ≤ conferidos ≤ transportados ≤ embalados ≤ quantidade total`. Uma caixa no destino **não** confere seu conteúdo automaticamente. As pendências indicam unidades não conferidas; não comprovam perda.

## Testes

```powershell
npm test
```

Os testes usam o executor nativo do Node.js. A biblioteca pdf-lib 1.17.1 está incluída em `vendor/`, sob licença MIT, para gerar PDFs localmente e offline. Não é necessário instalar pacotes. Consulte [Plano de testes](docs/TESTES.md).

## Documentação

- [Guia de uso](docs/USO.md)
- [Arquitetura e regras](docs/ARQUITETURA.md)
- [Plano de testes](docs/TESTES.md)
- [Relatório de validação e limitações](docs/RELATORIO_VALIDACAO.md)
- [Evolução e apresentação no portfólio](docs/EVOLUCAO.md)

## Limites desta versão

Um inventário por origem do navegador; uso individual; até 5.000 cadastros, 500 caixas e 100 cômodos, sujeitos à quota do navegador. Um cadastro pertence a uma caixa: distribua um grupo entre caixas criando cadastros separados. Não inclui fotos, leitura de QR Code, autenticação, histórico de auditoria ou classificação própria para avarias e extravios. Anote divergências nas observações.
