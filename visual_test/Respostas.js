class Respostas {
    constructor() {
        this.checkboxSelector = 'input[type="checkbox"][name="resposta"]';
        this.checkboxSelectortext = 'input[type="text"][name="respostaTexto"]';
        this.data = [];
        this.carObjects = [];

    }

    createCarObject(id, idade, grauEscolaridade, curso, visualizacao, conhece, valorlikert, valorlikert2, valorlikert3, combination1, combination2, tarefa, resposta_marcada_posicao, resposta_marcada_valor, resposta_correta_posicao, resposta_correta_valor, Tempo_incical_janela, Tempo_final_janela) {
        return {
            "Id-user": id,
            "Idade": idade,
            "grauEscolaridade": grauEscolaridade,
            "Curso": curso,
            "Disciplina de visualização de dados": visualizacao,
            "Conhece o gráfico de barras": conhece,
            "Como está seu dia": valorlikert,
            "estresse mental": valorlikert2,
            "cansaço físico": valorlikert3,
            "estrategia": combination1,
            "base": combination2,
            "Pergunta": tarefa,
            "resposta_marcada_posicao": resposta_marcada_posicao,
            "resposta_marcada_valor": resposta_marcada_valor,
            "resposta_correta_posicao": resposta_correta_posicao,
            "resposta_correta_valor": resposta_correta_valor,
            "Tempo_incical_janela": Tempo_incical_janela,
            "Tempo_final_janela": Tempo_final_janela,
        };
    }

    saveCheckedCheckboxesToJson(id, idade, grauEscolaridade, curso, visualizacao, conhece, valorlikert, valorlikert2, valorlikert3, combination1, combination2, tarefa, resposta_correta_posicao, resposta_correta_valor, Tempo_incical_janela, Tempo_final_janela, base, estrategias) {
        var checkboxes = document.querySelectorAll(this.checkboxSelector);

        var resposta_marcada_posicao = [];
        checkboxes.forEach(function (checkbox) {
            if (checkbox.checked) {
                resposta_marcada_posicao.push(checkbox.value);
            }
        });
        let posicao = parseInt(resposta_marcada_posicao)

        let resposta_marcada_valor;

        if (Number.isNaN(posicao)) {
            resposta_marcada_valor = 0;
        } else if (tarefa !== 8) {
            resposta_marcada_valor = base[posicao].valor;
        } else {
            resposta_marcada_valor = estrategias[posicao];
        }
        // Corrigido para usar this.createCarObject
        this.carObjects.push(this.createCarObject(id, idade, grauEscolaridade, curso, visualizacao, conhece, valorlikert, valorlikert2, valorlikert3, combination1, combination2, tarefa, posicao, resposta_marcada_valor, resposta_correta_posicao, resposta_correta_valor, Tempo_incical_janela, Tempo_final_janela));

    }

     saveInputValueToJson(id, idade, grauEscolaridade, curso, visualizacao, conhece, valorlikert, valorlikert2, valorlikert3, combination1, combination2, tarefa, resposta_correta_posicao, resposta_correta_valor, Tempo_incical_janela, Tempo_final_janela,base) {
        let inputValor = document.querySelector("#respostaTexto").value;
              
        this.carObjects.push(this.createCarObject(id, idade, grauEscolaridade,curso, visualizacao, conhece, valorlikert, valorlikert2, valorlikert3, combination1, combination2, tarefa, "", inputValor, resposta_correta_posicao, resposta_correta_valor, Tempo_incical_janela, Tempo_final_janela));
    }


    exportToCSV() {
        var csvData = json2csv.parse(this.carObjects);

        var blob = new Blob([csvData], { type: 'text/csv' });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'data.csv');
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
    }
}

