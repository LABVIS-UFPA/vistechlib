class BaseDeDados {
    constructor() {
        //exponecical
        this.base1 = [
            { valor: 173 },
            { valor: 302 },
            { valor: 529 },
            { valor: 923 },
            { valor: 1614 },
            { valor: 2823 },
            { valor: 4929 },
            { valor: 8606 },
            { valor: 15015 },
            { valor: 26195 },
            { valor: 45744 },
            { valor: 79887 },
            { valor: 139434 },
            { valor: 243288 },
            { valor: 424498 }
        ];

        //linear
        this.base2 = [
            { valor: 20 },
            { valor: 50 },
            { valor: 80 },
            { valor: 110 },
            { valor: 140 },
            { valor: 170 },
            { valor: 200 },
            { valor: 230 },
            { valor: 260 },
            { valor: 290 },
            { valor: 320 },
            { valor: 350 },
            { valor: 380 },
            { valor: 410 },
            { valor: 440 }
        ];

        // 2 outliers
        this.base3 = [
            { valor: 105 },
            { valor: 5556 },
            { valor: 24 },
            { valor: 467 },
            { valor: 135 },
            { valor: 53272 },
            { valor: 72 },
            { valor: 178 },
            { valor: 204 },
            { valor: 40 },
            { valor: 209 },
            { valor: 160 },
            { valor: 379 },
            { valor: 362 },
            { valor: 169 }
        ];

        // group outliers
        this.base4 = [
            { valor: 2086 },
            { valor: 77412 },
            { valor: 798 },
            { valor: 85685 },
            { valor: 875 },
            { valor: 680 },
            { valor: 555 },
            { valor: 9878 },
            { valor: 440 },
            { valor: 10858 },
            { valor: 634 },
            { valor: 302 },
            { valor: 396 },
            { valor: 7398 },
            { valor: 5661 }
        ];

        this.valor_barra;
        this.razaomaior_menor;
        this.barraDestacada = null; // Para armazenar a barra destacada para a tarefa 5
        this.razaomenor_menor

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
            console.log('erro ao carregar o corte')
        }
    }

    acharmenor(base) {
        let menores = [];
        for (let j = 0; j < 4; j++) {
            let menorValor = Number.POSITIVE_INFINITY;
            let posicaoMenorValor = -1;

            // Encontrando o menor valor e sua posição
            for (let i = 0; i < base.length; i++) {
                if (base[i].valor < menorValor && !menores.some(menor => menor.posicao === i)) {
                    menorValor = base[i].valor;
                    posicaoMenorValor = i;
                }
            }
            // Adicionando o menor valor e sua posição ao array 'menores'
            menores.push({ valor: menorValor, posicao: posicaoMenorValor });
        }
        return menores;
    }

    acharmaior(base) {
        let maiores = [];

        for (let j = 0; j < 2; j++) {
            let maiorValor = Number.NEGATIVE_INFINITY;
            let posicaoMaiorValor = -1;

            // Encontrando o maior valor e sua posição
            for (let i = 0; i < base.length; i++) {
                if (base[i].valor > maiorValor && !maiores.some(maior => maior.posicao === i)) {
                    maiorValor = base[i].valor;
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
        const valoresComIndices = lista.map((item, index) => ({ valor: item.valor, indice: index }));

        // Ordenar os valores sem modificar os índices originais
        const valoresOrdenados = valoresComIndices.slice().sort((a, b) => a.valor - b.valor);

        const tamanho = valoresOrdenados.length;
        const indiceMediana = Math.floor(tamanho / 2);

        if (tamanho % 2 === 0) {
            // Se o tamanho da lista for par, a mediana é a média dos dois valores do meio
            const mediana = (valoresOrdenados[indiceMediana - 1].valor + valoresOrdenados[indiceMediana].valor) / 2;
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
        let resp_corr_menores = this.acharmenor(this['base' + base]);
        let resp_corr_maiores = this.acharmaior(this['base' + base]);
        let valor = 0;
        let indiceAleatorio = Math.floor(Math.random() * this['base' + base].length);
        let resp_corr_valor = this['base' + base][indiceAleatorio].valor;
        if (resp_corr_valor == resp_corr_menores[0].valor) {
            return this.gerarvalor(base); // Retorna o valor da chamada recursiva
        } else if (resp_corr_valor == resp_corr_menores[1].valor) {
            return this.gerarvalor(base); // Retorna o valor da chamada recursiva
        } else if (resp_corr_valor == resp_corr_maiores[0].valor) {
            return this.gerarvalor(base); // Retorna o valor da chamada recursiva
        } else if (resp_corr_valor == resp_corr_maiores[1].valor) {
            return this.gerarvalor(base); // Retorna o valor da chamada recursiva
        } else {
            valor = ({ valor: resp_corr_valor.toLocaleString('pt-BR'), posicao: indiceAleatorio });
            this.valor_barra = valor;
            return valor; // Retorna o valor quando nenhuma das condições é satisfeita
        }
    }

    // Método para destacar uma barra aleatória e guardar seu valor para a tarefa 5
    destacarBarraAleatoria(base) {
        let indiceAleatorio = Math.floor(Math.random() * this['base' + base].length);
        let valorBarra = this['base' + base][indiceAleatorio].valor;
        this.barraDestacada = { valor: valorBarra, posicao: indiceAleatorio };
        return this.barraDestacada;
    }

    ratio(base) {
        let resp_corr_menores = this.acharmenor(this['base' + base]);
        let resp_corr_maiores = this.acharmaior(this['base' + base]);
        let x1 = resp_corr_menores[0];
        let x2 = resp_corr_menores[1];
        let x3 = resp_corr_maiores[1];
        this.razaomaior_menor = x3.valor/x2.valor;
        this.razaomenor_menor = x2.valor/x1.valor;
        return [x1, x2, x3];
    }

    respostacorreta(base) {
        let resp_corr_menores = this.acharmenor(this['base' + base]);
        let resp_corr_maiores = this.acharmaior(this['base' + base]);
        // let resp_corr_mediana = this.encontrarMedianaEPosicao(this['base' + base]);
        let x1 = resp_corr_menores[1];
        let x2 = resp_corr_maiores[1];
        // let x3 = resp_corr_mediana;
        let x3 = this.valor_barra;
        let x4 = this.barraDestacada; 
        let x5 = { valor: this.razaomaior_menor, posicao: 0 };
        let x6 = { valor: this.razaomenor_menor, posicao: 0 };
        // console.log("valor x3:",x3);
        return [x1, x2, x3, x4, x5, x6];
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