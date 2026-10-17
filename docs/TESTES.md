# Plano de testes

## Automatizados

Execute `npm test` com Node.js 20 ou superior. A suíte utiliza o executor nativo do Node.js e a biblioteca PDF já incluída no projeto, sem instalação de pacotes.

As suítes verificam cálculo de pendências e progresso, validação de quantidades, ordem das etapas, avanço individual, edição, integridade das referências, exclusão de caixas, busca com acentos, validação de backup, limites e duplicações. A persistência é testada com simulações de quota excedida, dados corrompidos e conflito entre abas.

## Aceitação no navegador

1. Começar com inventário vazio; carregar a demonstração somente após confirmação.
2. Criar uma caixa e um objeto; editar quantidades e conferir estatísticas.
3. Tentar salvar conferidos maiores que transportados e verificar o erro.
4. Buscar sem acento, filtrar por cômodo e conferir objetos por caixa.
5. Marcar caixa no destino e verificar que os objetos não são conferidos automaticamente.
6. Excluir objeto após cancelar uma primeira tentativa; tentar excluir uma caixa ocupada.
7. Exportar, reiniciar com confirmação e restaurar backup. Testar também JSON inválido.
8. Recarregar e confirmar persistência de dados e tema.
9. Abrir outra aba e verificar aviso de conflito antes de salvar uma edição antiga.
10. Abrir em larguras de 320, 390, 768, 1024 e 1440 pixels; verificar navegação e ausência de rolagem horizontal.
11. Após ativar o service worker, simular ausência de rede e recarregar; conferir uma unidade e persistir a alteração.
12. Usar teclado para navegar, abrir um formulário, fechar com Escape e retomar o foco.
13. Exportar PDF com filtros ativos e verificar que o documento contém o inventário completo. Repetir offline e revisar um relatório com várias páginas e observações longas.

## Limites da verificação

Testes automatizados não substituem a conferência física dos objetos. A adaptação a telas pequenas pode ser verificada em navegador desktop; a instalação como PWA, comportamento de câmera futuro e diferenças entre aparelhos exigem testes em dispositivos reais.

## Resultado da revisão de 17 de outubro de 2026

Foram aprovados 36 testes automatizados e 80 verificações no Chrome. A revisão ampliou a cobertura para cancelamento de exclusões, falha de quota, dados corrompidos, cópia do backup, caminhos codificados e todas as telas em cinco larguras. Também corrigiu uma falha de exportação com observações que continham muitas quebras de linha.

Para repetir a suíte de navegador, instale as dependências de desenvolvimento com `npm install` e execute `npm run test:browser`. O navegador Chrome deve estar instalado.

Consulte o [relatório completo](RELATORIO_VALIDACAO.md) para detalhes, correções e limitações. Não foram concluídos testes em Edge, Android físico, Safari, Firefox, impressora física ou leitor de tela. O conteúdo e o disparo dos downloads foram verificados; a gravação nativa dos arquivos foi bloqueada pelo ambiente automatizado.
