import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório onde os resultados estão salvos
const resultsDir = path.join(__dirname, 'results');
// Arquivo de saída com todos os dados combinados
const outputFile = path.join(__dirname, 'results.json');

function compileResults() {
    try {
        if (!fs.existsSync(resultsDir)) {
            console.error(`A pasta ${resultsDir} não existe.`);
            return;
        }

        const files = fs.readdirSync(resultsDir);
        const compiledData = [];

        for (const file of files) {
            // Ignorar o próprio arquivo results.json (caso ele tenha sido gerado dentro da pasta results) e arquivos não-JSON
            if (file.endsWith('.json') && file !== 'results.json') {
                const filePath = path.join(resultsDir, file);
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const jsonData = JSON.parse(fileContent);
                    compiledData.push(jsonData);
                    console.log(`- Lendo arquivo: ${file}`);
                } catch (err) {
                    console.error(`  [!] Erro ao fazer parse do arquivo ${file}:`, err.message);
                }
            }
        }

        // Sobrescreve o arquivo results.json (ou cria um novo)
        fs.writeFileSync(outputFile, JSON.stringify(compiledData, null, 2), 'utf-8');
        console.log(`\n✅ Sucesso! ${compiledData.length} resultados foram combinados e salvos em: ${outputFile}`);
        
    } catch (err) {
        console.error('Ocorreu um erro ao processar os resultados:', err);
    }
}

compileResults();
