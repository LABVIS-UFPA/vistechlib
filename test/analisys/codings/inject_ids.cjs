const fs = require('fs');
const path = require('path');

console.log("Lendo arquivos...");
const compiledData = require('./compiled_curation_data.json');
const codebookData = require('./codebook_harmonizado_hierarquico.json');

// Mapeia o block inteiro por userIndex e type do compiled_curation_data.json
const blocksMap = {};
compiledData.blocks.forEach(block => {
    const key = `${block.userIndex}_${block.type}`;
    blocksMap[key] = block;
});

let injeccoes = 0;

// Injeta no codebook_harmonizado_hierarquico.json
codebookData.blocks.forEach(block => {
    const key = `${block.userIndex}_${block.type}`;
    if (blocksMap[key]) {
        const sourceBlock = blocksMap[key];
        block.userId = sourceBlock.userId;
        
        if (block.excerptClusters) {
            block.excerptClusters.forEach(cluster => {
                cluster.userId = sourceBlock.userId;
                cluster.userIndex = sourceBlock.userIndex;
                cluster.type = sourceBlock.type;
                cluster.ranking = sourceBlock.ranking;
            });
        }
        injeccoes++;
    } else {
        console.warn(`⚠️ Bloco não encontrado no compiled data: ${key}`);
    }
});

const outputPath = path.join(__dirname, 'codebook_harmonizado_hierarquico_2.json');
fs.writeFileSync(outputPath, JSON.stringify(codebookData, null, 2), 'utf8');

console.log(`✅ Sucesso! Injetados ${injeccoes} userIds.`);
console.log(`✅ Arquivo gerado: codebook_harmonizado_hierarquico_2.json`);
