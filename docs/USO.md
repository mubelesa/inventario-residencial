# Guia de uso

## Primeiro acesso

A aplicação começa vazia. Clique em **Adicionar objeto** ou use **Explorar demonstração** para carregar uma mudança fictícia. A demonstração substitui o inventário após confirmação; não é uma conta ou um modo separado.

## Organizar

1. Em **Dados e ajuda**, ajuste o nome da mudança e adicione cômodos se precisar.
2. Em **Caixas**, crie etiquetas como `CX-01 · Cozinha`. Escreva essa identificação na caixa física.
3. Em **Inventário**, adicione os objetos. Use quantidade 1 para itens individuais e uma quantidade maior para unidades iguais.
4. Selecione cômodo, categoria e caixa. Objetos grandes podem ficar sem caixa. Marque frágeis e registre cuidados nas observações.

Se oito pratos estiverem distribuídos em duas caixas, cadastre dois grupos de quatro, um para cada caixa.

## Embalar, transportar e conferir

Os botões dos cards avançam uma unidade na etapa disponível. **Editar** permite preencher ou corrigir todas as quantidades de uma vez.

Exemplo: 8 previstos, 8 embalados, 8 transportados e 6 conferidos resultam em 2 pendentes. Para conferir, a quantidade já precisa ter sido transportada; para transportar, precisa estar embalada. Ao reduzir uma quantidade anterior, ajuste as posteriores para manter a ordem.

Em **Caixas**, a situação é uma anotação sobre o recipiente. Marcar **No destino** não altera nenhuma contagem dos objetos.

Em **Conferência**, filtre por caixa ou cômodo e pressione **Conferir +1** somente após verificar fisicamente a unidade. O botão fica desabilitado quando não há unidades transportadas disponíveis para conferir. Use **Incluir conferidos** para revisar itens concluídos.

## Corrigir e excluir

Edite o cadastro para corrigir nome, quantidades ou localização. Excluir um objeto exige confirmação e remove suas unidades das estatísticas. Uma caixa ou um cômodo com objetos associados não pode ser excluído: realoque os objetos primeiro. Mantenha ao menos um cômodo.

## Backup

- **Exportar backup** baixa um JSON com todo o inventário.
- Se o navegador bloquear o download, use **Visualizar JSON** em Dados e ajuda, selecione o conteúdo e salve-o em um arquivo `.json`.
- **Importar backup** valida o arquivo, mostra uma prévia e pede confirmação para substituir todos os dados.
- Se houver dados atuais, será necessário digitar `APAGAR` para confirmar a substituição.
- Arquivos inválidos não alteram o inventário. O limite por arquivo é 3 MB.
- **Apagar dados locais** reinicia a mudança e também exige `APAGAR`.

Mantenha o backup fora do navegador. Para usar em outro dispositivo, exporte no primeiro e importe no segundo. Não existe sincronização.

## Exportar PDF para imprimir

Clique em **Exportar PDF** na barra superior (ícone PDF no celular) ou em **Exportar PDF para imprimir** em Dados e ajuda. Abra o arquivo baixado e use a opção de impressão do leitor de PDF.

O relatório A4 inclui **todo o inventário**, mesmo quando há filtros na tela, agrupado por cômodo e ordenado por nome. Exibe objeto, categoria, fragilidade, observações, caixa, destino, quantidades previstas, conferidas no sistema e pendentes. As quantidades embaladas e transportadas aparecem nos detalhes do objeto.

Use a caixa vazia para marcar o objeto e a coluna **No papel** para anotar quantas unidades conferiu. Há campos para nome do responsável e data em cada página. As marcações manuais não atualizam o aplicativo: registre os resultados depois na tela de conferência.

O PDF é um retrato dos dados no momento da exportação, não um backup restaurável. Continue usando JSON para backup. Acentos em português são preservados; caracteres não disponíveis nas fontes padrão, como alguns emojis, são identificados por códigos Unicode no relatório. A exportação também funciona offline após atualização completa do cache da aplicação.

## Uso no celular e offline

A barra inferior alterna entre inventário, caixas, conferência e ajuda. Abra pelo endereço hospedado com HTTPS para poder usar o cache offline. Depois de carregar a aplicação online, aguarde a ativação do service worker; abra novamente para verificar que ela está disponível sem conexão.

Enquanto a página já estiver carregada, os registros são locais e não dependem de internet. Abrir a página pela primeira vez exige conexão. Alguns navegadores permitem **Instalar aplicativo** ou **Adicionar à tela inicial**. Isso instala um atalho/PWA, não a futura versão nativa Android.

## Problemas comuns

- **Outra aba alterou os dados:** recarregue antes de continuar. Alterações ainda não salvas no formulário serão descartadas.
- **Armazenamento cheio ou bloqueado:** os dados anteriores são mantidos; exporte um backup e verifique as configurações do navegador.
- **Dados corrompidos:** exporte os dados originais em **Dados e ajuda** e depois recupere um backup válido ou reinicie. O sistema não apaga automaticamente os dados ilegíveis.
- **Inventário vazio em outro endereço:** verifique navegador, perfil e URL. Cada origem tem seus próprios dados.
