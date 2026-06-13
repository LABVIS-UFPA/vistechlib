import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(testDir, "experimento.html"), "utf8");
const nasaAssetDir = path.join(testDir, "assets", "nasa");

test("NASA apresenta as cinco dimensoes em uma unica pagina", () => {
  const labels = [
    "Demanda mental",
    "Demanda temporal",
    "Desempenho",
    "Esforço",
    "Frustração",
  ];

  assert.match(html, /id="tlx-form"/);
  assert.match(html, /const TLX_DIMENSIONS =/);
  assert.match(html, /TLX_DIMENSIONS\.forEach\(\(dimension, dimensionIndex\)/);

  for (const label of labels) {
    assert.match(html, new RegExp(label));
  }

  assert.doesNotMatch(html, /Demanda f[ií]sica/i);
  assert.doesNotMatch(html, /currentTlxDimensionIndex/);
  assert.doesNotMatch(html, /currentTlxVisualizationIndex/);
});

test("cada dimensao renderiza as quatro visualizacoes lado a lado com o slider", () => {
  assert.match(html, /currentBlockPlan\.forEach\(\(task, visualizationIndex\)/);
  assert.match(html, /className = 'tlx-item'/);
  assert.match(html, /className = 'tlx-item-visualization'/);
  assert.match(html, /className = 'tlx-visualization-image'/);
  assert.match(html, /className = 'tlx-dimension'/);
  assert.match(html, /grid-template-columns: 300px 1fr/);
  assert.match(html, /@media \(max-width: 720px\)[\s\S]*grid-template-columns: 1fr/);
});

test("as vinte escalas usam 0 a 100 em passos de um", () => {
  assert.match(html, /input\.type = 'range'/);
  assert.match(html, /input\.min = '0'/);
  assert.match(html, /input\.max = '100'/);
  assert.match(html, /input\.step = '1'/);
  assert.match(html, /input\.dataset\.answered = hasValue \? 'true' : 'false'/);
  assert.match(html, /Baixo/);
  assert.match(html, /Alto/);
});

test("o bloco so pode ser concluido depois das vinte respostas", () => {
  assert.match(html, /id="complete-tlx-button"[^>]*disabled/);
  assert.match(html, /function updateTlxCompletionState\(\)/);
  assert.match(html, /tlxRanges\.length === TLX_DIMENSIONS\.length \* TASKS_PER_BLOCK/);
  assert.match(html, /tlxRanges\.every\(\(input\) => input\.dataset\.answered === 'true'\)/);
  assert.match(html, /completeTlxButton\.disabled = !allAnswered/);
  assert.doesNotMatch(html, /id="next-tlx-visualization-button"/);
  assert.doesNotMatch(html, /id="next-tlx-dimension-button"/);
});

test("cada linha usa o print correspondente a visualizacao", () => {
  const previews = [
    ["bar", "quebra-escala-classica.jpeg"],
    ["psb", "quebra-escala-perspectiva.jpeg"],
    ["scroll", "grafico-barras-pergaminho.jpeg"],
    ["worm", "grafico-barras-minhoca.jpeg"],
  ];

  assert.match(html, /image\.src = task\.visualization\.previewImage/);
  assert.match(
    html,
    /image\.alt = `Exemplo da visualiza[^`]+task\.visualization\.name[^`]+`/,
  );

  for (const [id, filename] of previews) {
    assert.match(
      html,
      new RegExp(`id: '${id}'[\\s\\S]*?previewImage: 'assets/nasa/${filename}'`),
    );
    assert.equal(
      fs.existsSync(path.join(nasaAssetDir, filename)),
      true,
      `asset ausente: ${filename}`,
    );
  }
});

test("NASA mantem respostas somente em memoria", () => {
  assert.match(html, /const tlxDrafts = new Map\(\)/);
  assert.match(html, /getTlxResponseKey\(currentBlock, dimensionIndex, visualizationIndex\)/);
  assert.doesNotMatch(html, /nasaTlxResponses/);
  assert.doesNotMatch(html, /localStorage\.setItem\("nasaTlxResponses"/);
  assert.doesNotMatch(html, /performanceInverted/);
  assert.doesNotMatch(html, /adaptedScore/);
});

test("a conclusao coleta as cinco dimensoes para cada visualizacao do bloco", () => {
  assert.match(html, /function collectBlockNasaTlx\(\)/);
  assert.match(
    html,
    /currentBlockPlan\.map\(\(task, visualizationIndex\) => \(\{/,
  );
  assert.match(html, /visualizationId: task\.visualization\.id/);
  assert.match(html, /visualizationName: task\.visualization\.name/);
  assert.match(
    html,
    /TLX_DIMENSIONS\.map\(\(dimension, dimensionIndex\) => \[/,
  );
  assert.match(
    html,
    /tlxDrafts\.get\(\s*getTlxResponseKey\(\s*currentBlock,\s*dimensionIndex,\s*visualizationIndex\s*\)\s*\)/,
  );
  assert.match(
    html,
    /completeTlxButton\.addEventListener\('click', \(\) => \{[\s\S]*collectBlockNasaTlx\(\)/,
  );
  assert.doesNotMatch(
    html,
    /document\.getElementById\('mental-demand'\)\.value/,
  );
  assert.doesNotMatch(html, /<<<<<<<|=======|>>>>>>>/);
});

test("descricoes adaptadas permanecem disponiveis em tooltips", () => {
  assert.match(html, /className = 'tlx-tooltip'/);
  assert.match(html, /tooltip\.setAttribute\('role', 'tooltip'\)/);
  assert.match(
    html,
    /Quanto esforço mental e perceptivo foi necessário para interpretar a visualização/,
  );
  assert.match(html, /Quanta pressão de tempo você sentiu/);
  assert.match(html, /Quão bem-sucedido\(a\) você considera que foi/);
  assert.match(
    html,
    /Quanto esforço foi necessário para alcançar seu nível de desempenho/,
  );
  assert.match(html, /Quanto você se sentiu frustrado\(a\), estressado\(a\)/);
});
