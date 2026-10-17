# Relatório de validação

Data: 17 de outubro de 2026. Versão verificada: 1.1.1.

## Resultado

**36 testes automatizados aprovados, sem falhas, e 80 verificações aprovadas no Chrome 155.0.8059.84.** O protótipo passou pelos cenários descritos abaixo. Isso aumenta a confiança nos fluxos cobertos, mas não garante ausência de defeitos em qualquer aparelho, navegador ou volume de dados.

Todos os cenários usaram dados fictícios, armazenamentos simulados ou perfis temporários de navegador. Nenhum inventário real do usuário foi aberto ou apagado.

## Cobertura executada

| Área | O que foi verificado | Resultado |
| --- | --- | --- |
| Regras de negócio | Quantidades inteiras, limites, ordem das etapas, pendências, edição e associações | Aprovado |
| Combinações de contagem | 300 combinações determinísticas dentro de um teste, com conferência de totais e backup | Aprovado |
| Cadastro e edição | Objetos, caixas, cômodos, atualização dos cards e conservação das contagens | Aprovado |
| Exclusão | Cancelamento, confirmação e impedimento de remover caixas ou cômodos ocupados | Aprovado |
| Busca e filtros | Acentos, cômodo, fragilidade, andamento e caixa | Aprovado |
| Conferência | Avanço por unidade, ocultação de concluídos e independência entre caixa e objetos | Aprovado |
| Armazenamento | Recarregamento, revisão, quota excedida, leitura bloqueada, corrupção e aviso entre abas | Aprovado |
| Backup | Conteúdo JSON, visualização, seleção do texto, importação, substituição confirmada, arquivo inválido e preservação do estado | Aprovado |
| PDF | Arquivo válido, inventário vazio, preservação de dados, múltiplas páginas, observações longas e muitas quebras de linha | Aprovado |
| Offline | Recarga da aplicação, gravação de alterações e geração de PDF sem rede | Aprovado |
| Layout | Inventário, caixas, conferência e ajuda em 320, 390, 768, 1024 e 1440 pixels | Aprovado |
| Teclado | Modal, Escape e retorno de foco | Aprovado |
| Conteúdo inserido | Texto com marcação HTML permanece texto; campos desconhecidos do backup são descartados | Aprovado |
| Servidor local | Respostas HTTP, MIME de módulos, bloqueio de POST, arquivos inexistentes e caminhos internos codificados | Aprovado |

O navegador não registrou erros JavaScript durante a suíte. Os PDFs do teste de regressão foram renderizados e revisados visualmente; os objetos e os caracteres das observações permaneceram no documento.

## Correções realizadas

1. **Observações com muitas linhas no PDF:** uma observação válida de 600 caracteres, com 300 quebras de linha, podia ocupar mais que uma página e impedir a exportação. O relatório agora compacta espaços e quebras do texto para impressão, sem mudar a observação salva. Um teste cobre esse caso.
2. **Caminhos privados do servidor em Windows:** o bloqueio de `scripts/` e `tests/` foi reforçado para aceitar variações de maiúsculas e barras codificadas. A suíte de navegador verifica que esses caminhos continuam bloqueados.
3. **Repetição da verificação:** a suíte de navegador passou a fazer parte do projeto, com diretório separado para resultados e opção de informar o executável do navegador.

## Como repetir

Testes de regras, armazenamento e PDF, sem instalar pacotes:

```powershell
npm test
```

Testes no navegador, com Chrome instalado:

```powershell
npm install
npm run test:browser
```

O Playwright é dependência de desenvolvimento; não participa da aplicação publicada. A suíte inicia seu próprio servidor na porta 4185 e usa perfis temporários. Os resultados são gravados em `test-results/inventory-browser-results.json`; o diretório está no `.gitignore`.

Variáveis opcionais: `TEST_PORT`, `TEST_ARTIFACTS`, `BROWSER_EXECUTABLE` e `PLAYWRIGHT_MODULE`. Não execute duas suítes simultâneas na mesma porta ou no mesmo diretório de resultados.

## Limitações e verificações pendentes

- **Edge:** a tentativa de abrir o navegador automatizado foi bloqueada por restrições do ambiente antes dos testes. Isso não foi classificado como falha da aplicação, mas a compatibilidade com Edge não está confirmada.
- **Android físico, Safari e Firefox:** não foram testados. As telas pequenas foram emuladas no Chrome desktop. Instalação e comportamento real da PWA em aparelhos continuam pendentes.
- **Download nativo:** o conteúdo e o disparo dos arquivos JSON e PDF foram verificados. O ambiente bloqueou a gravação automática do download pelo navegador; o recebimento no dispositivo deve ser conferido manualmente. Há alternativa de visualização do JSON.
- **Impressora física:** o PDF e sua paginação foram revisados, sem teste em uma impressora real.
- **Acessibilidade:** houve verificação básica de teclado e foco; não houve auditoria completa com leitor de tela.
- **Carga extrema:** não foi medida a fluidez da interface com 5.000 cadastros. Limites de quantidade e tamanho de backup foram testados, mas isso não é um teste de desempenho nesse volume.
- **Concorrência:** o controle entre abas é otimista; não oferece transações para gravações exatamente simultâneas. Recomenda-se usar uma aba por vez.

## Conclusão

O sistema está validado para testes individuais nos fluxos cobertos, mantendo seu caráter experimental. Antes de depender dele em uma mudança real, confirme o download e a abertura dos backups, faça um teste no celular que será utilizado e mantenha uma cópia dos dados fora do navegador.
