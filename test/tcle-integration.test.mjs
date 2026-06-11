import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(testDir, "experimento.html");
const assetDir = path.join(testDir, "assets", "tcle");
const sourcePdfPath = path.join(assetDir, "MODELO_DE_TCLE_AJUSTADO.pdf");
const obsoleteDigitalPdfPath = path.join(
  assetDir,
  "TCLE_VISUALIZACAO_DADOS_DIGITAL.pdf",
);
const obsoleteDigitalDocxPath = path.join(
  assetDir,
  "TCLE_VISUALIZACAO_DADOS_DIGITAL.docx",
);

test("TCLE digital reflete o modelo ajustado e identifica o pesquisador", () => {
  const html = fs.readFileSync(htmlPath, "utf8");

  assert.match(html, /Carlos Gustavo Resque dos Santos/);
  assert.match(html, /\(91\) 98205-8491/);
  assert.match(html, /carlosresque@ufpa\.br/);
  assert.match(html, /ressarcimento\s+de quaisquer despesas diretas/);
  assert.match(html, /direito a buscar indeniza[cç][aã]o/);
  assert.match(html, /segunda, ter[cç]a e quinta-feira/);
  assert.doesNotMatch(html, /\(91\) 3201-7390/);
  const adjustedPdfReferences =
    html.match(/assets\/tcle\/MODELO_DE_TCLE_AJUSTADO\.pdf/g) ?? [];
  assert.equal(adjustedPdfReferences.length, 1);
  assert.doesNotMatch(html, /TCLE_VISUALIZACAO_DADOS_DIGITAL/);
  assert.doesNotMatch(html, /Consultar modelo ajustado original/);
  assert.doesNotMatch(html, /Baixar uma c[oó]pia/);
  assert.doesNotMatch(
    html,
    /href="assets\/tcle\/MODELO_DE_TCLE_AJUSTADO\.pdf"\s+download/,
  );
  assert.match(
    html,
    /id="tcle-scroll"\s+tabindex="0"\s+aria-label="Texto completo do TCLE"/,
  );
  assert.ok(fs.existsSync(sourcePdfPath), "o modelo ajustado original deve existir");
  assert.ok(
    !fs.existsSync(obsoleteDigitalPdfPath),
    "a versão PDF alternativa não deve permanecer no projeto",
  );
  assert.ok(
    !fs.existsSync(obsoleteDigitalDocxPath),
    "a versão DOCX alternativa não deve permanecer no projeto",
  );
});

test("aceite exige leitura e confirmacao e registra versao e horario", () => {
  const html = fs.readFileSync(htmlPath, "utf8");

  assert.match(html, /id="tcle-confirmation"/);
  assert.match(html, /const TCLE_VERSION\s*=\s*"2026-06-11-digital-2"/);
  assert.match(html, /tcleReachedEnd\s*&&\s*tcleConfirmation\.checked/);
  assert.match(html, /acceptedAt:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(html, /localStorage\.setItem\("tcleConsent"/);
  assert.match(html, /exclusivamente em meio digital/);
});
