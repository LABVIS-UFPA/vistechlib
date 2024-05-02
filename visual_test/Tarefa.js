class Tarefa {
    constructor() {
        this.perguntas = [
            "Selecione a menor barra?",
            "Selecione a segunda menor barra?",
            "Selecione a segunda maior barra? ",
            "Liste as barras com valores menores que X?"
        ];
        this.perguntasSelecionadas = [];
        this.perguntaContainer = document.getElementById("perguntaContainer");
        this.proximoBotao = document.getElementById("proximoBotao");
        this.fimPerguntas = document.getElementById("fimPerguntas");
        this.continuarBotao = document.getElementById("continuarBotao");
        this.campoResposta = document.querySelector('fieldset');

        this.perg='';
        this.pergId='';
        this.tempoLimite = 15000; // Tempo limite padrão em milissegundos
        this.timerId = null; // Variável para armazenar o ID do temporizador


    }

    selecionarPerguntaAleatoria() {
        const perguntasDisponiveis = this.perguntas.filter(pergunta => !this.perguntasSelecionadas.includes(pergunta));
        if (perguntasDisponiveis.length === 0) return null; // Retorna null se todas as perguntas já foram selecionadas
        const indice = Math.floor(Math.random() * perguntasDisponiveis.length);
        const perguntaSelecionada = perguntasDisponiveis[indice];
        this.perguntasSelecionadas.push(perguntaSelecionada);
        return perguntaSelecionada;
    }

    exibirProximaPergunta() {
        const perguntaSelecionada = this.selecionarPerguntaAleatoria();

        //TEMPORIZADO DE 15S
        this.pararTemporizador(); // Stop the timer
        this.tempoLimite = 15000; // Reset the time limit
        this.iniciarTemporizador(); // Start a new timer for the next round of questions

                
        this.perg = perguntaSelecionada
        this.pergId=this.id_pergunta(perguntaSelecionada);; 

        
        if (perguntaSelecionada === "Quão maior é a X barra em comparação com a primeira(Por exemplo, 2x maior, 3x maior)? ") {
            this.perguntaContainer.textContent = perguntaSelecionada;
            this.vezes.style.display = "block";
            this.campoResposta.style.display = "none";
        } else if (perguntaSelecionada !== null) {
            this.perguntaContainer.textContent = perguntaSelecionada;
            this.campoResposta.style.display = "flex"; // Supondo que você deseja exibir um campo de resposta para perguntas normais
        } else {
            this.perguntaContainer.style.display = "none";
            this.proximoBotao.style.display = "none";
            this.fimPerguntas.style.display = "block";
            this.campoResposta.style.display = "none";
        }

    }

    reset() {
        this.perguntasSelecionadas = [];
        this.perguntaContainer.style.display = "block";
        this.proximoBotao.style.display = "block";
        this.fimPerguntas.style.display = "none";
        this.campoResposta.style.display = "flex";
        this.exibirProximaPergunta();

    }


    id_pergunta(pergunta) {

        if(pergunta === "Selecione a menor barra?"){
            return 1;
        }else if(pergunta === "Selecione a segunda menor barra?"){
            return 2;
        }else if(pergunta === "Selecione a segunda maior barra? "){
            return 3;
        }else if(pergunta === "Liste as barras com valores menores que X?"){
            return 4;
        }        
    }

    //Tempo maximo de 15s para responde cada tarefa

    // Método para iniciar o temporizador
    iniciarTemporizador() {
        this.timerId = setTimeout(() => {
            this.exibirProximaPergunta(); // Aciona o clique no botão próximo quando o temporizador expira
        }, this.tempoLimite);
    }

    // Método para parar o temporizador
    pararTemporizador() {
        clearTimeout(this.timerId);
    }

}

