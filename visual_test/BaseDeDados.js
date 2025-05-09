class BaseDeDados {
  constructor() {
    // Gerar base1 (exponencial)
    this.base1 = this.generateBaseWithoutDataGen(15, {
      basePower: 3,
      outlierCount: 2,
      outlierPower: 1,
      precision: 2,
    });

    // Gerar base2 (linear)
    this.base2 = this.generateBaseWithoutDataGen(15, {
      basePower: 3,
      outlierCount: 2,
      outlierPower: 1,
      precision: 2,
    });

    // Gerar base3 (com 2 outliers)
    this.base3 = this.generateBaseWithoutDataGen(15, {
      basePower: 3,
      outlierCount: 2,
      outlierPower: 1,
      precision: 2,
    });

    // Gerar base4 (com grupo de outliers)
    this.base4 = this.generateBaseWithoutDataGen(15, {
      basePower: 3,
      outlierCount: 2,
      outlierPower: 1,
      precision: 2,
    });

    this.valor_barra;
    this.razaomaior_menor;
    this.barraDestacada = null; // Para armazenar a barra destacada para a tarefa 5
    this.razaomenor_menor;
    this.baseTemporaria = [];
  }

  // Função auxiliar para gerar número aleatório dentro de um intervalo
  getRandomInRange(min, max, isInteger = false) {
    const value = Math.random() * (max - min) + min;
    return isInteger ? Math.round(value) : value;
  }

  // Método que gera a base de dados sem depender de DataGen
  generateBaseWithoutDataGen(totalValues, options = {}) {
    if (typeof totalValues !== "number" || totalValues <= 0) {
      throw new Error("totalValues deve ser um número positivo");
    }

    // Gerar aleatoriamente os valores de basePower e outlierPower
    const basePower = this.getRandomInRange(1, 4, true);
    const outlierPower = this.getRandomInRange(1, 2, true);
    let crescimento = 1

    const config = {
      // basePower:3,
      // outlierPower:2, 
      basePower,
      outlierPower,
      outlierCount: 2,
      precision: 0,
      fatorCrescimento: 0,
      ...options,
    };

    if (config.outlierCount >= totalValues) {
      throw new Error("O número de outliers deve ser menor que totalValues");
    }

    // Gerar valores normais
    const normalScale = Math.pow(10, config.basePower);
    const normalData = [];

    for (let i = 0; i < totalValues - config.outlierCount; i++) {
      let randomValue = this.getRandomInRange(
        1 * normalScale,
        9 * normalScale
      );

      randomValue = randomValue * crescimento

      crescimento += config.fatorCrescimento;
      
      normalData.push({
        valor: parseFloat(randomValue.toFixed(config.precision)),
      });
    }

    // Gerar outliers
    const outlierScale = Math.pow(10, config.basePower + config.outlierPower);
    const outlierData = [];

    for (let i = 0; i < config.outlierCount; i++) {
      const randomValue = this.getRandomInRange(
        2 * outlierScale,
        9 * outlierScale
      );
      outlierData.push({
        valor: parseFloat(randomValue.toFixed(config.precision)),
      });
    }

    // Combinar e retornar todos os dados
    return [...normalData, ...outlierData];
  }

  breakdados(base) {
    if (base == 1) {
      let x = 150000;
      let y = 220000;
      return [x, y];
    } else if (base == 2) {
      let x = 418;
      let y = 438;
      return [x, y];
    } else if (base == 3) {
      let x = 480;
      let y = 2000;
      return [x, y];
    } else if (base == 4) {
      let x = 11000;
      let y = 76000;
      return [x, y];
    } else {
      console.log("erro ao carregar o corte");
    }
  }

  acharmenor(base) {
    const baseArray = Array.isArray(base) ? base : this["base" + base];
    let menores = [];
    for (let j = 0; j < 4; j++) {
      let menorValor = Number.POSITIVE_INFINITY;
      let posicaoMenorValor = -1;

      // Encontrando o menor valor e sua posição
      for (let i = 0; i < baseArray.length; i++) {
        if (
          baseArray[i].valor < menorValor &&
          !menores.some((menor) => menor.posicao === i)
        ) {
          menorValor = baseArray[i].valor;
          posicaoMenorValor = i;
        }
      }
      // Adicionando o menor valor e sua posição ao array 'menores'
      menores.push({ valor: menorValor, posicao: posicaoMenorValor });
    }
    return menores;
  }

  acharmaior(base) {
    const baseArray = Array.isArray(base) ? base : this["base" + base];
    let maiores = [];

    for (let j = 0; j < 2; j++) {
      let maiorValor = Number.NEGATIVE_INFINITY;
      let posicaoMaiorValor = -1;

      // Encontrando o maior valor e sua posição
      for (let i = 0; i < baseArray.length; i++) {
        if (
          baseArray[i].valor > maiorValor &&
          !maiores.some((maior) => maior.posicao === i)
        ) {
          maiorValor = baseArray[i].valor;
          posicaoMaiorValor = i;
        }
      }

      // Adicionando o maior valor e sua posição ao array 'maiores'
      maiores.push({ valor: maiorValor, posicao: posicaoMaiorValor });
    }

    return maiores;
  }

  encontrarMedianaEPosicao(lista) {
    // Criar uma cópia da lista de valores e manter os índices originais
    const valoresComIndices = lista.map((item, index) => ({
      valor: item.valor,
      indice: index,
    }));

    // Ordenar os valores sem modificar os índices originais
    const valoresOrdenados = valoresComIndices
      .slice()
      .sort((a, b) => a.valor - b.valor);

    const tamanho = valoresOrdenados.length;
    const indiceMediana = Math.floor(tamanho / 2);

    if (tamanho % 2 === 0) {
      // Se o tamanho da lista for par, a mediana é a média dos dois valores do meio
      const mediana =
        (valoresOrdenados[indiceMediana - 1].valor +
          valoresOrdenados[indiceMediana].valor) /
        2;
      const posicao = valoresOrdenados[indiceMediana - 1].indice; // obter o índice original
      return { valor: mediana, posicao: posicao };
    } else {
      // Se o tamanho da lista for ímpar, a mediana é o valor do meio
      const mediana = valoresOrdenados[indiceMediana].valor;
      const posicao = valoresOrdenados[indiceMediana].indice; // obter o índice original
      return { valor: mediana, posicao: posicao };
    }
  }

  //gerar um valor aleatorio diferente do segundo menor e maior
  gerarvalor(base) {
    this.valor_barra = 0;
    let resp_corr_menores = this.acharmenor(base);
    let resp_corr_maiores = this.acharmaior(base);
    let valor = 0;
    let indiceAleatorio = Math.floor(
      Math.random() * base.length
    );
    let resp_corr_valor = base[indiceAleatorio].valor;
    if (resp_corr_valor == resp_corr_menores[0].valor) {
      return this.gerarvalor(base); // Retorna o valor da chamada recursiva
    } else if (resp_corr_valor == resp_corr_menores[1].valor) {
      return this.gerarvalor(base); // Retorna o valor da chamada recursiva
    } else if (resp_corr_valor == resp_corr_maiores[0].valor) {
      return this.gerarvalor(base); // Retorna o valor da chamada recursiva
    } else if (resp_corr_valor == resp_corr_maiores[1].valor) {
      return this.gerarvalor(base); // Retorna o valor da chamada recursiva
    } else {
      valor = {
        valor: resp_corr_valor.toLocaleString("pt-BR"),
        posicao: indiceAleatorio,
      };
      this.valor_barra = valor;
      return valor; // Retorna o valor quando nenhuma das condições é satisfeita
    }
  }

  // Método para destacar uma barra aleatória e guardar seu valor para a tarefa 5
  destacarBarraAleatoria(base) {
    let baseAtual = this.baseTemporaria || this["base" + base];
    let indiceAleatorio = Math.floor(Math.random() * baseAtual.length);
    let valorBarra = baseAtual[indiceAleatorio].valor;
    this.barraDestacada = { valor: valorBarra, posicao: indiceAleatorio };
    return this.barraDestacada;
  }

  ratio(base) {
    let baseAtual = this.baseTemporaria || this["base" + base];
    let resp_corr_menores = this.acharmenor(baseAtual);
    let resp_corr_maiores = this.acharmaior(baseAtual);
    let x1 = resp_corr_menores[0];
    let x2 = resp_corr_menores[1];
    let x3 = resp_corr_maiores[0];
    this.razaomaior_menor = parseFloat((x3.valor / x2.valor).toFixed(2));
    this.razaomenor_menor = parseFloat((x2.valor / x1.valor).toFixed(2));
    return [x1, x2, x3];
  }

  respostacorreta(base) {
    let baseAtual = this.baseTemporaria || this["base" + base];
    let resp_corr_menores = this.acharmenor(baseAtual);
    let resp_corr_maiores = this.acharmaior(baseAtual);
    // let resp_corr_mediana = this.encontrarMedianaEPosicao(this['base' + base]);
    let x1 = resp_corr_menores[1];
    let x2 = resp_corr_maiores[1];
    // let x3 = resp_corr_mediana;
    let x3 = this.valor_barra;
    let x4 = this.barraDestacada;
    let x5 = { valor: this.razaomaior_menor, posicao: 0 };
    let x6 = { valor: this.razaomenor_menor, posicao: 0 };
    let x7 = {
      valor: `${resp_corr_menores[0].valor} - ${resp_corr_maiores[0].valor}`,
      posicao: 0,
    };
    let x8 = {
      valor: `${resp_corr_menores[1].valor} - ${resp_corr_maiores[1].valor}`,
      posicao: 0,
    };
    return [x1, x2, x3, x4, x5, x6, x7, x8];
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  embaralhar(base) {
    // Embaralhando a matriz base
    this[base] = this.shuffle(base);
    return this[base];
  }

  // encontrarMenores(base,50)
  encontrarMenores(array, n) {
    // Ordenar o array em ordem crescente com base nos valores
    array.sort((a, b) => a.valor - b.valor);

    // Retornar os primeiros n elementos do array
    return array.slice(0, n);
  }
}
