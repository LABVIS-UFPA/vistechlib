const DataGen = require("./datagen.js");

/**
 * Gerador de dados com outliers otimizado
 * @param {number} totalValues - Número total de valores (normais + outliers)
 * @param {Object} options - Opções de configuração
 * @param {number} [options.basePower=3] - Expoente base de 10 para valores normais
 * @param {number} [options.outlierCount=1] - Quantidade de outliers
 * @param {number} [options.outlierPower=2] - Expoente adicional para outliers
 * @param {number} [options.precision=0] - Casas decimais (0 para inteiros)
 * @returns {Array<{value: number, type: string}>} - Array de objetos com valores e tipos
 */
function generateBase(totalValues, options = {}) {
    if (typeof totalValues !== 'number' || totalValues <= 0) {
        throw new Error('totalValues deve ser um número positivo');
    }

    const config = {
        basePower: 3,
        outlierCount: 2,
        outlierPower: 2,
        precision: 0,
        ...options
    };

    if (config.outlierCount >= totalValues) {
        throw new Error("O número de outliers deve ser menor que totalValues");
    }

    const getScaleFactor = (power) => 10 ** power;
    
    const dataGenerator = new DataGen("Data with Outliers");
    const normalValuesCount = totalValues - config.outlierCount;

    const normalScale = getScaleFactor(config.basePower);
    dataGenerator.addColumn(
        "NormalData",
        new DataGen.listOfGens["Uniform Generator"](
            1 * normalScale,
            9 * normalScale,
            config.precision === 0
        )
    );

    const normalData = dataGenerator.generate(normalValuesCount)
        .map(item => ({
            valor: parseFloat(item.NormalData.toFixed(config.precision)),
        }));

    const outlierScale = getScaleFactor(config.basePower + config.outlierPower);
    const outlierGenerator = new DataGen.listOfGens["Uniform Generator"](
        1 * outlierScale,
        9 * outlierScale,
        config.precision === 0
    );

    const outlierData = Array.from({ length: config.outlierCount }, () => ({
        valor: parseFloat(outlierGenerator.generate().toFixed(config.precision)),
    }));

    return shuffleArray([...normalData, ...outlierData]);
}

/**
 * Embaralha array usando o algoritmo Fisher-Yates moderno
 * @param {Array} array - Array a ser embaralhado
 * @returns {Array} - Novo array embaralhado
 */
function shuffleArray(array) {
    return array
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}

const baseGerada = generateBase(15, { outlierCount: 5, outlierPower: 3, precision: 2 });
console.log(baseGerada);
module.exports = { generateBase };