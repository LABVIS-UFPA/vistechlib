class Tarefa {
    constructor() {
        this.perguntas = [
            // "Selecione a menor barra?",
            "Selecione a segunda menor barra?",
            "Selecione a segunda maior barra? ",
            "Selecione a barra que é a mediana?",
            "Selecione a barra com o valor"
        ];
        // this.perguntasSelecionadas = [];
        this.perguntaContainer = document.getElementById("perguntaContainer");
        this.proximoBotao = document.getElementById("proximoBotao");
        this.fimPerguntas = document.getElementById("fimPerguntas");
        this.continuarBotao = document.getElementById("continuarBotao");
        this.campoResposta = document.querySelector('fieldset');

        // this.checkboxSelector = 'input[type="checkbox"][name="resposta"]';
        this.temp_visualizacao = 0;

        this.perg = '';
        this.pergId = '';
        this.tempoLimite = 30000; // Tempo limite padrão em milissegundos
        // this.timerId = null; // Variável para armazenar o ID do temporizador



    }

    //versao antiga

    // selecionarPerguntaAleatoria() {
    //     const perguntasDisponiveis = this.perguntas.filter(pergunta => !this.perguntasSelecionadas.includes(pergunta));
    //     if (perguntasDisponiveis.length === 0) return null; // Retorna null se todas as perguntas já foram selecionadas
    //     const indice = Math.floor(Math.random() * perguntasDisponiveis.length);
    //     const perguntaSelecionada = perguntasDisponiveis[indice];
    //     this.perguntasSelecionadas.push(perguntaSelecionada);
    //     return perguntaSelecionada;
    // }


    // exibirProximaPergunta() {

    //     // Limpar todos os checkboxes marcados
    //     this.campoResposta.querySelectorAll(this.checkboxSelector).forEach((checkbox) => {
    //         checkbox.checked = false;
    //     });

    //     const perguntaSelecionada = this.selecionarPerguntaAleatoria();

    //     //TEMPORIZADO DE 15S
    //     this.pararTemporizador(); // Stop the timer
    //     this.tempoLimite = 15000; // Reset the time limit
    //     this.iniciarTemporizador(); // Start a new timer for the next round of questions


    //     this.perg = perguntaSelecionada
    //     this.pergId = this.id_pergunta(perguntaSelecionada);;


    //     if (perguntaSelecionada !== null) {
    //         this.perguntaContainer.textContent = perguntaSelecionada;
    //         this.campoResposta.style.display = "flex"; // Supondo que você deseja exibir um campo de resposta para perguntas normais
    //     } else {
    //         this.perguntaContainer.style.display = "none";
    //         this.proximoBotao.style.display = "none";
    //         this.fimPerguntas.style.display = "block";
    //         this.campoResposta.style.display = "none";
    //         this.temp_visualizacao = 1;
    //     }

    // }

    exibirProximaPergunta(p, valorbarra) {
        if (p == 1) {
            var perguntaSelecionada = this.perguntas[0];
            this.perg = perguntaSelecionada
            this.pergId = this.id_pergunta(perguntaSelecionada);
            this.perguntaContainer.textContent = perguntaSelecionada;
            this.campoResposta.style.display = "flex"; // Supondo que você deseja exibir um campo de resposta para perguntas normais
            this.pararTemporizador(); // Stop the timer          
            this.iniciarTemporizador(); // Start a new timer for the next round of questions
        } else if (p == 2) {
            var perguntaSelecionada = this.perguntas[1];
            this.perg = perguntaSelecionada
            this.pergId = this.id_pergunta(perguntaSelecionada);
            this.perguntaContainer.textContent = perguntaSelecionada;
            this.campoResposta.style.display = "flex"; // Supondo que você deseja exibir um campo de resposta para perguntas normais
            this.pararTemporizador(); // Stop the timer           
            this.iniciarTemporizador(); // Start a new timer for the next round of questions
        } else if (p == 3) {
            var perguntaSelecionada = this.perguntas[2];
            this.perg = perguntaSelecionada
            this.pergId = this.id_pergunta(perguntaSelecionada);
            this.perguntaContainer.textContent = perguntaSelecionada;
            this.campoResposta.style.display = "flex"; // Supondo que você deseja exibir um campo de resposta para perguntas normais
            this.pararTemporizador(); // Stop the timer            
            this.iniciarTemporizador(); // Start a new timer for the next round of questions
        } else if (p == 4) {
            var perguntaSelecionada = this.perguntas[3];
            this.perg = perguntaSelecionada
            this.pergId = this.id_pergunta(perguntaSelecionada);
            this.perguntaContainer.textContent = perguntaSelecionada + " " + valorbarra + " ?"; //valorbarra é valor associado a barra para a pergunta 4
            this.campoResposta.style.display = "flex"; // Supondo que você deseja exibir um campo de resposta para perguntas normais
            this.pararTemporizador(); // Stop the timer            
            this.iniciarTemporizador(); // Start a new timer for the next round of questions
        } else {
            console.log('não existe essa pergunta')
        }

    }

    reset(p, valorbarra) {
        // this.perguntasSelecionadas = [];
        this.perguntaContainer.style.display = "block";
        this.proximoBotao.style.display = "block";
        this.fimPerguntas.style.display = "none";
        this.campoResposta.style.display = "flex";
        // this.temp_visualizacao = 0;
        this.exibirProximaPergunta(p, valorbarra);

    }

    // e passado no  exibir pergunta o que retorna o id da pergunta
    id_pergunta(pergunta) {
        // if (pergunta === "Selecione a menor barra?") {
        //     return 1;
        if (pergunta === "Selecione a segunda menor barra?") {
            return 1;
        } else if (pergunta === "Selecione a segunda maior barra? ") {
            return 2;
        } else if (pergunta === "Selecione a barra que é a mediana?") {
            return 3
        } else if (pergunta === "Selecione a barra com o valor") {
            return 4;
        }
    }

    enviarpergunta() {
        this.perguntaContainer.style.display = "none";
        this.proximoBotao.style.display = "none";
        this.fimPerguntas.style.display = "block";
        this.campoResposta.style.display = "none";
    }



    //Tempo maximo de 15s para responde cada tarefa

    // Método para iniciar o temporizador
    iniciarTemporizador() {
        this.timerId = setTimeout(() => {
            this.proximoBotao.click(); // Aciona o clique no botão próximo quando o temporizador expira
        }, this.tempoLimite);
    }

    // Método para parar o temporizador
    pararTemporizador() {
        clearTimeout(this.timerId);
    }


    // Função para formatar o tempo em formato de relógio
    formatatempo_performace(milliseconds) {
        // Calcula horas, minutos e segundos
        let hours = Math.floor(milliseconds / 3600000);
        let minutes = Math.floor((milliseconds % 3600000) / 60000);
        let seconds = Math.floor((milliseconds % 60000) / 1000);

        // Formata os valores para terem sempre 2 dígitos
        hours = String(hours).padStart(2, '0');
        minutes = String(minutes).padStart(2, '0');
        seconds = String(seconds).padStart(2, '0');

        // Retorna o tempo formatado
        return hours + ':' + minutes + ':' + seconds;
    }

}

