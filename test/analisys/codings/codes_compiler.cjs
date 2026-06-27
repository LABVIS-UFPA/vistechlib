const fs = require('fs');
const path = require('path');

const inputFiles = [
    'analise_tematica_breno.json',
    'analise_tematica_gustavo.json',
    'analise_tematica_marcus.json'
];
const outputFile = 'compiled_curation_data.json';

const normalizeStr = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

// ==========================================
// LÓGICA DE DETECÇÃO DE SOBREPOSIÇÃO (CLUSTERING)
// ==========================================
function isSameExcerpt(textA, textB) {
    const a = textA.toLowerCase().trim();
    const b = textB.toLowerCase().trim();

    if (a === b) return true;

    const shortest = a.length <= b.length ? a : b;
    const longest = a.length > b.length ? a : b;

    // 1. Heurística de Inclusão do "Core" (Sua sugestão)
    // Corta até 5 caracteres (ou 15% do tamanho, se for muito pequeno) das bordas
    const trimCount = Math.min(5, Math.floor(shortest.length * 0.15));

    if (shortest.length > trimCount * 2) {
        const core = shortest.substring(trimCount, shortest.length - trimCount);
        if (longest.includes(core)) return true;
    } else {
        if (longest.includes(shortest)) return true;
    }

    // 2. Fallback: Coeficiente de Sobreposição de Palavras (Overlap Coefficient)
    // Útil para quando a seleção é "deslocada" (ex: "o gráfico é ruim" vs "gráfico é ruim porque")
    const wordsA = a.match(/\w+/g) || [];
    const wordsB = b.match(/\w+/g) || [];

    if (wordsA.length === 0 || wordsB.length === 0) return false;

    let matchCount = 0;
    // Usa Set para busca rápida
    const setB = new Set(wordsB);
    wordsA.forEach(w => { if (setB.has(w)) matchCount++; });

    // Se compartilharem pelo menos 85% das palavras do menor trecho, consideramos o mesmo contexto
    const overlapRatio = matchCount / Math.min(wordsA.length, wordsB.length);

    return overlapRatio >= 0.85;
}

function clusterCodings(codings) {
    let clusters = [];

    for (let coding of codings) {
        let matchedCluster = null;

        // Tenta encaixar a codificação atual em algum cluster existente
        for (let cluster of clusters) {
            for (let existing of cluster.codings) {
                if (isSameExcerpt(coding.text, existing.text)) {
                    matchedCluster = cluster;
                    break;
                }
            }
            if (matchedCluster) break;
        }

        if (matchedCluster) {
            matchedCluster.codings.push(coding);
            // Mantém o texto mais longo como a "referência principal" do cluster
            if (coding.text.length > matchedCluster.longestText.length) {
                matchedCluster.longestText = coding.text;
            }
            // Agrega os IDs das tags
            coding.tagIds.forEach(id => matchedCluster.allTagIds.add(id));
        } else {
            // Cria um novo cluster se não houver correspondência
            clusters.push({
                clusterId: 'cluster_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                longestText: coding.text,
                codings: [coding],
                allTagIds: new Set(coding.tagIds)
            });
        }
    }

    // Converte os Sets de volta para Array para o JSON final
    clusters.forEach(c => {
        c.allTagIds = Array.from(c.allTagIds);
    });

    return clusters;
}

// ==========================================
// COMPILAÇÃO PRINCIPAL
// ==========================================
function compileQDA() {
    let compiledTags = [];
    let alignedBlocksMap = {};

    inputFiles.forEach(fileName => {
        const filePath = path.join(__dirname, fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Arquivo não encontrado: ${fileName}`);
            return;
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);
        const coderName = data.coder || fileName.split('_')[2].split('.')[0];

        let coderTagIdMap = {};

        // Processa Tags
        data.tags.forEach(tag => {
            const normalizedName = normalizeStr(tag.name);
            let existingTag = compiledTags.find(t => t.normalized === normalizedName);

            if (existingTag) {
                coderTagIdMap[tag.id] = existingTag.id;
                if (!existingTag.coders.includes(coderName)) {
                    existingTag.coders.push(coderName);
                }
            } else {
                const newTagId = `${coderName.toLowerCase()}_${tag.id}`;
                coderTagIdMap[tag.id] = newTagId;
                compiledTags.push({
                    id: newTagId,
                    name: tag.name,
                    normalized: normalizedName,
                    color: tag.color,
                    coders: [coderName]
                });
            }
        });

        // Extrai Excerpts para o Mapa Transitório
        data.excerpts.forEach(exc => {
            if (!exc.matches || exc.matches.length === 0) return;

            const matchInfo = exc.matches[0];
            const blockKey = `${matchInfo.index}_${matchInfo.type}`;

            if (!alignedBlocksMap[blockKey]) {
                alignedBlocksMap[blockKey] = {
                    userIndex: matchInfo.index,
                    userId: matchInfo.id,
                    type: matchInfo.type,
                    ranking: matchInfo.ranking || [],
                    rawCodings: []
                };
            }

            const updatedTagIds = exc.tagIds.map(oldId => coderTagIdMap[oldId]).filter(Boolean);

            alignedBlocksMap[blockKey].rawCodings.push({
                coder: coderName,
                text: exc.text,
                tagIds: updatedTagIds
            });
        });
    });

    // Processa os clusters dentro de cada bloco
    const alignedBlocksArray = Object.values(alignedBlocksMap).map(block => {
        return {
            userIndex: block.userIndex,
            userId: block.userId,
            type: block.type,
            ranking: block.ranking,
            excerptClusters: clusterCodings(block.rawCodings) // <-- Aqui aplicamos o algoritmo
        };
    }).sort((a, b) => {
        if (a.userIndex === b.userIndex) return a.type.localeCompare(b.type);
        return a.userIndex - b.userIndex;
    });

    const finalOutput = {
        meta: {
            generatedAt: new Date().toISOString(),
            totalTags: compiledTags.length,
            totalBlocks: alignedBlocksArray.length
        },
        tags: compiledTags,
        blocks: alignedBlocksArray
    };

    fs.writeFileSync(path.join(__dirname, outputFile), JSON.stringify(finalOutput, null, 2), 'utf8');
    console.log(`✅ Compilação concluída! Arquivo gerado: ${outputFile}`);

    // Contagem de Clusters para Log
    const totalClusters = alignedBlocksArray.reduce((acc, b) => acc + b.excerptClusters.length, 0);
    console.log(`📊 Resumo: ${compiledTags.length} tags únicas.`);
    console.log(`📊 Resumo: ${alignedBlocksArray.length} blocos de resposta contendo ${totalClusters} trechos clusterizados.`);
}

compileQDA();