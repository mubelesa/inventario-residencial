# Casa em Ordem

Inventário residencial para organizar objetos e conferir uma mudança. A interface se adapta a computadores e celulares e tem temas claro e escuro.

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

## Como utilizar

1. Em **Dados e ajuda**, defina o nome da mudança e cadastre os cômodos.
2. Em **Caixas**, crie as etiquetas e identifique as caixas físicas com os mesmos nomes.
3. Em **Inventário**, clique em **Adicionar objeto** e informe quantidade, cômodo, categoria e caixa, quando houver.
4. Atualize as quantidades embaladas e transportadas conforme a mudança avança. Use **Editar** para corrigir os dados ou ajustar várias unidades de uma vez.
5. Em **Conferência**, filtre por caixa ou cômodo e clique em **Conferir +1** após verificar cada unidade fisicamente.
6. Exporte backups JSON regularmente e use **Exportar PDF** quando precisar de uma lista para conferir no papel.

Para experimentar, use **Explorar demonstração** no primeiro acesso. A demonstração substitui o inventário após confirmação.

Consulte o [Guia de uso](docs/USO.md) para instruções detalhadas sobre edição, exclusão, backups, impressão e problemas comuns.

## Uso no celular e offline

A barra inferior alterna entre inventário, caixas, conferência e ajuda. Para usar offline, carregue a aplicação com conexão em um endereço HTTPS ou localhost, aguarde a ativação do cache e abra novamente para verificar o acesso sem internet. Alguns navegadores permitem **Instalar aplicativo** ou **Adicionar à tela inicial**.

## Limites desta versão

Um inventário por origem do navegador; uso individual; até 5.000 cadastros, 500 caixas e 100 cômodos, sujeitos à quota do navegador. Um cadastro pertence a uma caixa: distribua um grupo entre caixas criando cadastros separados. Não inclui fotos, leitura de QR Code, autenticação, histórico de auditoria ou classificação própria para avarias e extravios. Anote divergências nas observações.
