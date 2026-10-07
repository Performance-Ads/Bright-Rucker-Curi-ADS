# Rücker Curi · Bright Performance

Dashboard público de Meta Ads para a Rucker Curi, com identidade Bright.

## Dados e atualização

Conta: **Rucker Curi e Brigth**, final **0337**. A atualização é feita **sob demanda pelo Meta Ads MCP**. Abrir ou recarregar a página não consulta o Meta e não atualiza os números.

O painel mostra o horário real da extração, o período coberto e os dias parciais. A campanha atual e o histórico arquivado são identificados separadamente. Leads significam eventos atribuídos pelo Meta no site; não representam contratos fechados ou contatos qualificados.

## Atualizar este dashboard

1. Abrir este projeto no Codex e solicitar: “Atualize o dashboard da Rucker Curi pelo Meta Ads MCP e publique no mesmo GitHub Pages”.
2. Consultar os parâmetros registrados em `src/data.json`, preservando a conta, a atribuição e os IDs dos componentes. Estender a data final até o momento da nova consulta.
3. Consultar conta, campanhas, conjuntos e anúncios nos seus níveis corretos, sem somar alcance entre datas ou públicos. Preservar ações ausentes como indisponíveis e diferenciar histórico de campanha atual.
4. Salvar a extração revisada e executar `node tools/import-meta-snapshot.mjs caminho/para/extracao.json`.
5. Executar `node --test tests/metrics.test.mjs`, compilar seguindo `AGENTS.md` e revisar o dashboard no navegador.
6. Copiar o build verificado para `docs/`, mantendo os arquivos de documentação existentes, e publicar no mesmo repositório. Confirmar o deploy do GitHub Pages.

O site usa um snapshot estático: nenhuma credencial do Meta é enviada ao navegador ou incluída neste repositório.

## Estrutura

- `src/content/dashboard/`: interface, filtros e cálculos.
- `src/theme.css`: identidade visual Bright.
- `src/data.json`: dados revisados e origem das consultas.
- `tools/`: importação de novos snapshots.
- `tests/metrics.test.mjs`: verificações de indicadores e filtros.
- `docs/index.html` e arquivos de dados associados: versão publicada pelo GitHub Pages.

## Identidade

Azul-escuro, dourado e off-white; fontes Instrument Serif e Inter, distribuídas pelo Google Fonts sob SIL Open Font License. A referência visual é o dashboard Bright da Reymaster, adaptado aos resultados da Rucker Curi.
