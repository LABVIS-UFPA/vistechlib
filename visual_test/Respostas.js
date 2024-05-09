class Respostas {
    constructor() {
        this.checkboxSelector = 'input[type="checkbox"][name="resposta"]';
        this.data = [];
        this.carObjects = [];

    }

    createCarObject(id, idade, grauEscolaridade, valorlikert, combination1, combination2, tarefa, checkbox, resposta_correta, tempo_resposta, tempo_total, Tempo_incical_janela, Tempo_final_janela) {
        return {
            "Id-user": id,
            "Idade": idade,
            "grauEscolaridade": grauEscolaridade,
            "valorlikert": valorlikert,
            "estrategia": combination1,
            "base": combination2,
            "Pergunta": tarefa,
            "resposta_marcada": checkbox,
            "resposta_correta": resposta_correta,
            "Tempo_resposta": tempo_resposta,
            "Tempo_total": tempo_total,
            "Tempo_incical_janela": Tempo_incical_janela,
            "Tempo_final_janela": Tempo_final_janela,
        };
    }

    saveCheckedCheckboxesToJson(id, idade, grauEscolaridade, valorlikert, combination1, combination2, tarefa, resposta_correta, tempo_resposta, tempo_total, Tempo_incical_janela, Tempo_final_janela) {
        var checkboxes = document.querySelectorAll(this.checkboxSelector);
        var checkedCheckboxes = [];
        checkboxes.forEach(function (checkbox) {
            if (checkbox.checked) {
                checkedCheckboxes.push(checkbox.value);
            }
        });        
        // Corrigido para usar this.createCarObject
        this.carObjects.push(this.createCarObject(id, idade, grauEscolaridade, valorlikert, combination1, combination2, tarefa, checkedCheckboxes, resposta_correta, tempo_resposta, tempo_total, Tempo_incical_janela, Tempo_final_janela));

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

