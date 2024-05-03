class Respostas {
    constructor() {
        this.checkboxSelector = 'input[type="checkbox"][name="resposta"]';
        this.data = [];
        this.carObjects = [];
    }

    createCarObject(nome, idade, grauEscolaridade, valorlikert, combination1, combination2, tarefa,checkbox, tempo, resposta_correta) {
        return {
            "Id-user": nome,
            "Idade": idade,
            "grauEscolaridade": grauEscolaridade,
            "valorlikert": valorlikert,
            "estrategia": combination1,
            "base":combination2,
            "Pergunta": tarefa,
            "resposta_marcada": checkbox,
            "Tempo": tempo,
            "resposta_correta": resposta_correta,
        };
    }

    saveCheckedCheckboxesToJson(nome, idade, grauEscolaridade, valorlikert, combination1, combination2, tarefa,checkbox, tempo, resposta_correta) {
        var checkboxes = document.querySelectorAll(this.checkboxSelector);
        var checkedCheckboxes = [];
        checkboxes.forEach(function (checkbox) {
            if (checkbox.checked) {
                checkedCheckboxes.push(checkbox.value);
            }
        });
        // Corrigido para usar this.createCarObject
        this.carObjects.push(this.createCarObject(nome, idade, grauEscolaridade, valorlikert, combination1, combination2, tarefa,checkbox, tempo, resposta_correta));
        
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

