// if(module) {
//     var d3 = require("d3");
//     var Visualization = require("./Visualization.js");
//     var utils = require("./Utils.js");
// }
// let d3 = require("d3");
// let Visualization = require("./Visualization.js");
// let utils = require("./Utils.js");

/**
 * @class
 * @description The bar chart is a chart with rectangular bars and length proportional to the values it represents. Bars can be drawn vertically or horizontally. The vertical bar chart is sometimes called the column chart.  
 * extends Visualization and its methods and internal variables.
 * @constructor
 * @param {string} parentElement - Parent element where view will be added
 * @param {object} [settings={
        color: "#069",
        highlightColor: "#FF1122",
        opacity: 1,
        notSelectedOpacity: 0.15,
        size_type: "fit",
        width: 700,
        height: 300,
        paddingTop: 25,
        paddingLeft: 50,
        paddingRight: 50,
        paddingBottom: 30,
        autoresize: true
    }] - basic configuration parameters in the view such as margins, opacity, color
 * */
class BarChart extends Visualization {


    constructor(parentElement, settings, corte, cortefinal) {
        super(parentElement, settings);

        this.drawStrategy = BarChart.strategies[this.settings.drawStrategy];

        this.name = "BarChart";
        this.x = d3.scaleBand().paddingInner(0.1).paddingOuter(0.1);

        this.settings.corte = corte;
        this.settings.cortefinal = cortefinal;

    }

    _putDefaultSettings() {
        this.settings.innerPadding = 20;
        this.settings.radius = 2;
        this.settings.paddingTop = 15;
        this.settings.paddingBottom = 10;
        this.settings.paddingLeft = 55;
        this.settings.paddingRight = 10;
        this.settings.negativeMode = "disabled";
        this.settings.startZero = true;
        this.settings.drawStrategy = 'default';// "default" "scale-break", "perspective", "perspective escalonada", "scale break perspective"
        this.settings.breakPoint = 0.2; //"parseFloat(document.getElementById('breakpointInput').value) ||"
        this.settings.breakPoint2 = 0.96, 5; //"parseFloat(document.getElementById('breakpointInput2').value) ||"
        this.settings.breakPoint3 = 0.88; //"parseFloat(document.getElementById('breakpointInput3').value) ||"
        this.settings.breakPoint4 = 0.95, 5;
        this.settings.corte; //"parseFloat(document.getElementById('breakpointInput4').value) ||"
        this.settings.cortefinal;
        this.settings.z = 0.28; //"parseFloat(document.getElementById('inputz').value) ||"
        this.settings.cols = {};
        this.settings.gap;
    }

    resize() {
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        let svgBounds = this.svg.node().getBoundingClientRect();

        if (this.settings.filter) {
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }
        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;
        this.boxHeight = (svgBounds.height - pt - pb - ip * (this.keys_filter.length - 1)) / this.keys_filter.length;
        this.innerWidth = svgBounds.width - pl - pr;

        this.x.range([0, this.innerWidth]);

        for (let k of this.keys_filter) {
            let type = this.domainType[k];
            this.y[k].range([
                this.boxHeight - (type === "Categorical" ? 10 : 0),
                0
            ]);
        }

        this.redraw();
        return this;
    }

    return() {
        return this.x.bandwidth();

    }
    data(d) {
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        super.data(d);

        if (this.settings.filter) {
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }

        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;
        let svgBounds = this.svg.node().getBoundingClientRect();
        this.boxHeight = (svgBounds.height - pt - pb - ip * (this.keys_filter.length - 1)) / this.keys_filter.length;
        this.innerWidth = svgBounds.width - pl - pr;

        let xdomain_array = [];
        for (let i = 0; i < this.d.length; i++)
            xdomain_array.push(i);
        this.x.domain(xdomain_array)
            .range([0, this.innerWidth]);
        this.y = {};


        for (let k of this.keys_filter) {
            let type = this.domainType[k];

            if (this.settings.startZero) {
                if (this.domain[k][0] > 0) this.domain[k][0] = 0;
            }

            if (type === "Categorical") {
                this.y[k] = d3.scalePoint();
            } else {
                this.y[k] = d3.scaleLinear();

            }

            this.y[k].domain(this.domain[k]).range([
                this.boxHeight - (type === "Categorical" ? 10 : 0),
                0
            ]);
        }

        this.drawStrategy.data(this);

        return this;
    }


    redraw() {
        // let t0 = performance.now();

        let ip = this.settings.innerPadding;
        let barchart = this;

        let group_join = this.foreground.selectAll("g.dataGroup")
            .data(this.keys_filter, d => d)
            .join(
                enter => {
                    let enter_result = enter.append("g")
                        .attr("class", "dataGroup");
                    enter_result.append("text")
                        .attr("class", "axisLabel")
                        .attr("x", 0)
                        .attr("y", -2)
                        .style("fill", "black")
                        .text(d => d);
                    enter_result
                        .append("line")
                        .attr("class", "rule top")
                        .style("stroke", "black")
                        .style("shape-rendering", "crispedges");
                    enter_result
                        .append("line")
                        .attr("class", "rule bottom")
                        .style("stroke", "black")
                        .style("shape-rendering", "crispedges");
                    enter_result
                        .append("line")
                        .attr("class", "rule rigth")
                        .style("stroke", "black")
                        .style("shape-rendering", "crispedges");
                    return enter_result;
                }
            )
            .attr("transform", (d, i) => `translate(0,${i * this.boxHeight + i * ip})`);

        group_join.selectAll(".rule.top")
            .attr("x1", "0").attr("y1", "0")
            .attr("x2", barchart.innerWidth).attr("y2", "0");
        group_join.selectAll(".rule.bottom")
            .attr("x1", "0").attr("y1", barchart.boxHeight)
            .attr("x2", barchart.innerWidth).attr("y2", barchart.boxHeight);
        // group_join.selectAll(".rule.rigth")
        //     .attr("x1", barchart.innerWidth).attr("y1", barchart.boxHeight)
        //     .attr("x2", barchart.innerWidth).attr("y2", 0);


        this.drawStrategy.draw(barchart); // chama a estrategia
        // let t1 = performance.now();
        // console.log("TIme: "+(t1-t0));

        return super.redraw();
    }

    detail(...args) {
        let details;
        let obj = Object.entries(args[0]);
        let text = "";

        for (let j = 0; j < args[2].length; j++) {
            for (let i = 0; i < obj.length; i++) {
                if (args[2][j] === obj[i][0]) {
                    text += obj[i][0] + " : " + obj[i][1] + "\n";
                }
            }
        }

        if (args[0] instanceof SVGElement) {

        } else if (typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length) {
            details = this.foreground.selectAll(`.data[data-index="${args[1]}"]`)
                .style("stroke", this.settings.highlightColor)
                .style("stroke-width", "2")
                .each(function () {
                    this.parentNode.appendChild(this);
                })
                .append(":title")
                .text(text);
        }
        n
    }

    highlight(...args) {
        let highlighted;
        if (args[0] instanceof SVGElement) {

        } else if (typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length) {
            highlighted = this.foreground.selectAll(`.data[data-index="${args[1]}"]`)
                .style("stroke", this.settings.highlightColor)
                .style("stroke-width", "2")
                .each(function () {
                    this.parentNode.appendChild(this);
                });
        }
        if (highlighted)
            super.highlight(highlighted.nodes(), args[0], args[1], args[2]);
    }
    removeHighlight(...args) {
        if (args[1] instanceof SVGElement) {

        } else if (typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length) {
            let dataSelect = this.foreground.selectAll(`.data[data-index="${args[1]}"]`)
                .style("stroke", "none");
            if (dataSelect.nodes().length > 0)
                super.removeHighlight(dataSelect.node(), dataSelect.datum(), args[1]);
        }
    }
    getHighlightElement(i) {
        let histogram = this;
        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");

        this.foreground.selectAll('rect[data-index="' + i + '"]').each(function () {
            let t = utils.parseTranslate(this.parentElement);
            //let tp = utils.parseTranslate(this.parentElement.parentElement);
            let rect_select = d3.select(this);

            let rect = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "rect"))
                .attr("class", "rectHighlight")
                .style("fill", "none")
                .style("stroke", histogram.settings.highlightColor)
                .attr("stroke-width", "2px")
                .attr("x", (+rect_select.attr("x")) + t.x)
                .attr("y", (+rect_select.attr("y")) + t.y)
                .attr("width", rect_select.attr("width"))
                .attr("height", rect_select.attr("height"));

            group.appendChild(rect.node());
        });

        return group;
    }

    getHighlightElementsPSB(indices, color) {
        // Muda a cor dos <rect> com data-index dentro do foreground
        d3.selectAll('rect')
            .filter(function () {
                return indices.includes(+d3.select(this).attr("data-index"));
            })
            .style("fill", color);

        // Muda a cor dos <path> com data-index dentro do foreground
        d3.selectAll('path')
            .filter(function () {
                return indices.includes(+d3.select(this).attr("data-index"));
            })
            .style("fill", color);
    }


    calcularCortesEMaximo(dados) {
        if (!dados || dados.length < 2) return null;

        const valoresOrdenados = [...dados]
            .sort((a, b) => a.valor - b.valor)
            .map((item) => item.valor);
    
        function identificarMaiorDiferenca(arr) {
            let maiorGap = 0;
            let posicaoGap = -1;
    
            for (let i = 0; i < arr.length - 1; i++) {
                const diff = arr[i + 1] - arr[i];
                if (diff > maiorGap) {
                    maiorGap = diff;
                    posicaoGap = i;
                }
            }
    
            if (posicaoGap === -1 || maiorGap === 0) {
                posicaoGap = Math.floor(arr.length / 2) - 1;
                if (posicaoGap < 0) posicaoGap = 0;
            }
    
            return {
                corte: arr[posicaoGap],
                corteFinal: arr[posicaoGap + 1],
                maximo: arr[arr.length - 1]
            };
        }
    
        const { corte, corteFinal, maximo } = identificarMaiorDiferenca(valoresOrdenados);
    
        // Ajusta os cortes (igual ao original)
        let corteAjust = corte;
        let corteFinalAjust = corteFinal;
        let maximoAjust = maximo;
    
        if (maximoAjust - corteFinalAjust > corteAjust) {
            corteFinalAjust = maximoAjust - corteAjust;
            corteAjust = maximoAjust - corteFinalAjust;
        } else {
            maximoAjust = corteFinalAjust + corteAjust;
        }
    
        // Calcula cortes intermediários (igual ao original)
        const tamanhoMeioRelativo = 0.5;
        const tamanhoMeio = corteAjust * (tamanhoMeioRelativo / 2);
        const diferenca = corteFinalAjust - corteAjust;
    
        let corte2 = corteAjust + diferenca / 2 - tamanhoMeio;
        let corte3 = corteAjust + diferenca / 2 + tamanhoMeio;
    
        corte2 = Math.max(corteAjust, Math.min(corte2, corteFinalAjust));
        corte3 = Math.max(corte2, Math.min(corte3, corteFinalAjust));
    
        return {
            corteInferior: corteAjust,
            corteSuperior: corteFinalAjust,
            corteIntermediario1: corte2,
            corteIntermediario2: corte3,
            valorMaximo: maximoAjust,
            valoresOrdenados: valoresOrdenados
        };
    }

    filterByDimension(args) {
        this.settings.filter = args;
    }


}
BarChart.strategies = {
    "default": {
        draw: (barchart) => {

            barchart.foreground.selectAll("g.dataGroup").each(function (key) {
                let g = d3.select(this);
                g.selectAll(".data")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("rect")
                                .attr("class", "data")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .style("fill", barchart.settings.color)
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("y", (d) => barchart.y[key](d[key]))  //fazer Math.min
                    .attr("width", barchart.x.bandwidth())
                    .attr("height", (d) => barchart.boxHeight - barchart.y[key](d[key]));
                barchart.settings.gap = barchart.x(1) - barchart.x.bandwidth() - barchart.x(0);

                g.selectAll("g.y.axis").remove();

                g.append("g")
                    .attr("class", "y axis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(8).tickFormat(d => d.toLocaleString('pt-BR'))) //colcoar em formato brasileiro
                    .selectAll("text") // Seleciona todos os elementos de texto do eixo y
                    .each(function (d) { // Para cada marca de tick
                        d3.select(this.parentNode) // Seleciona o pai (o elemento g)
                            .append("line") // Adiciona uma linha
                            .attr("class", "grid-line") // Define a classe para estilização
                            .attr("stroke", "black")
                            .attr("x1", 0) // Posição inicial x da linha
                            .attr("x2", barchart.innerWidth) // Posição final x da linha
                            .attr("y1", barchart.y[key](d[key])) // Posição inicial y da linha
                            .attr("y2", barchart.y[key](d[key])); // Posição final y da linha, é a mesma que a inicial para uma linha horizontal
                    });

                g.selectAll(".rule.rigth")
                    .attr("x1", barchart.innerWidth).attr("y1", barchart.boxHeight)
                    .attr("x2", barchart.innerWidth).attr("y2", 0);


            });

        },
        data: (barchart) => {

        }

    },
    "log": {
        draw: (barchart) => {
            barchart.foreground.selectAll("g.dataGroup").each(function (key) {
                let g = d3.select(this);
                g.selectAll(".data")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("rect")
                                .attr("class", "data")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .style("fill", barchart.settings.color)
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("y", (d) => barchart.y[key](d[key]))  // Aqui estamos usando a chave para selecionar a propriedade correta no seu dado
                    .attr("width", barchart.x.bandwidth())
                    .attr("height", (d) => barchart.boxHeight - barchart.y[key](d[key]));

                // Alterando a escala y para logarítmica
                barchart.y[key] = d3.scaleLog()
                    .domain([1, d3.max(barchart.d, d => d[key])]) // Assumindo que o valor mínimo é 1
                    .range([barchart.boxHeight, 0]);

                // Atualizando as barras com a escala logarítmica
                g.selectAll(".data")
                    .attr("y", (d) => barchart.y[key](d[key]))
                    .attr("height", (d) => barchart.boxHeight - barchart.y[key](d[key]));


                g.append("g")
                    .attr("class", "y axis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(8))
                    .selectAll("text") // Seleciona todos os elementos de texto do eixo y
                    .each(function (d) { // Para cada marca de tick
                        d3.select(this.parentNode) // Seleciona o pai (o elemento g)
                            .append("line") // Adiciona uma linha
                            .attr("class", "grid-line") // Define a classe para estilização
                            .attr("stroke", "black")
                            .attr("x1", 0) // Posição inicial x da linha
                            .attr("x2", barchart.innerWidth) // Posição final x da linha
                            .attr("y1", barchart.y[key](d[key])) // Posição inicial y da linha
                            .attr("y2", barchart.y[key](d[key])); // Posição final y da linha, é a mesma que a inicial para uma linha horizontal
                    });

                // Atualizando a regra
                g.selectAll(".rule.rigth")
                    .attr("x1", barchart.innerWidth).attr("y1", barchart.boxHeight)
                    .attr("x2", barchart.innerWidth).attr("y2", 0);
            });
        },
        data: (barchart) => {

        }
    },
    "scale-break": {
        data: (barchart) => {

            barchart.ybreak = {};
            for (let k of barchart.keys_filter) {
                let maximo = barchart.domain[k][1];
                // let segundo_maior = d3.max(dado, (d) => d[k] === maximo ? NaN : d[k])
                // let segundo_maior = 10000;
                // let terceiro = (segundo_maior*40)/100+segundo_maior;

                let corte = barchart.settings.corte;
                let cortefinal = barchart.settings.cortefinal;

                barchart.breakPoint = barchart.settings.breakPoint;
                barchart.gapSize = 25;


                barchart.y[k] = d3.scaleLinear().domain([0, corte]).range([barchart.boxHeight, barchart.boxHeight * barchart.breakPoint + barchart.gapSize / 2]);
                barchart.ybreak[k] = d3.scaleLinear().domain([cortefinal, maximo]).range([barchart.boxHeight * barchart.breakPoint - barchart.gapSize / 2, 10]);

                barchart.boxHeightBreak = barchart.boxHeight * barchart.breakPoint - barchart.gapSize / 2;
            }
        },
        draw: (barchart) => {

            barchart.foreground.selectAll("g.dataGroup").each(function (key) {
                let miny = barchart.boxHeight * barchart.breakPoint + barchart.gapSize / 2
                let maxh = barchart.boxHeight - miny;
                let g = d3.select(this);
                g.selectAll("rect.lower")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("rect")
                                .attr("class", "lower")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("y", (d) => Math.max(barchart.y[key](d[key]), miny))
                    .attr("width", barchart.x.bandwidth())
                    .attr("height", (d) => Math.min(barchart.boxHeight - barchart.y[key](d[key]), maxh))
                    .style("fill", barchart.settings.color);


                g.selectAll("rect.upper")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("rect")
                                .attr("class", "upper")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("width", barchart.x.bandwidth())
                    .attr("y", (d) => barchart.ybreak[key](d[key]))
                    .attr("height", (d) => Math.max(barchart.boxHeightBreak - barchart.ybreak[key](d[key]), 0))
                    .style("fill", barchart.settings.color);
                barchart.settings.gap = barchart.x(1) - barchart.x.bandwidth() - barchart.x(0);


                //remove
                g.selectAll("g.y.upperaxis").remove();
                g.selectAll("g.y.loweraxis").remove();
                g.selectAll("g.Line1").remove();

                //axis

                g.append("g")
                    .attr("class", "y upperaxis")
                    .call(d3.axisLeft(barchart.ybreak[key]).ticks(4).tickFormat(d => d.toLocaleString('pt-BR')))
                    .selectAll("text") // Seleciona todos os elementos de texto do eixo y
                    .each(function (d) { // Para cada marca de tick
                        d3.select(this.parentNode) // Seleciona o pai (o elemento g)
                            .append("line") // Adiciona uma linha
                            .attr("class", "grid-line") // Define a classe para estilização
                            .attr("stroke", "black")
                            .attr("x1", 0) // Posição inicial x da linha
                            .attr("x2", barchart.innerWidth) // Posição final x da linha
                            .attr("y1", barchart.ybreak[key](d[key])) // Posição inicial y da linha
                            .attr("y2", barchart.ybreak[key](d[key])); // Posição final y da linha, é a mesma que a inicial para uma linha horizontal
                    });

                g.append("g")
                    .attr("class", "y loweraxis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(7).tickFormat(d => d.toLocaleString('pt-BR')))
                    .selectAll("text") // Seleciona todos os elementos de texto do eixo y
                    .each(function (d) { // Para cada marca de tick
                        d3.select(this.parentNode) // Seleciona o pai (o elemento g)
                            .append("line") // Adiciona uma linha
                            .attr("class", "grid-line") // Define a classe para estilização
                            .attr("stroke", "black")
                            .attr("x1", 0) // Posição inicial x da linha
                            .attr("x2", barchart.innerWidth) // Posição final x da linha
                            .attr("y1", barchart.ybreak[key](d[key])) // Posição inicial y da linha
                            .attr("y2", barchart.ybreak[key](d[key])); // Posição final y da linha, é a mesma que a inicial para uma linha horizontal
                    });



                g.selectAll(".rule.rigth")
                    .attr("x1", barchart.innerWidth).attr("y1", barchart.boxHeight)
                    .attr("x2", barchart.innerWidth).attr("y2", 0);


            });

        }
    },
    "perspective": {

        data: (barchart) => {

        },

        draw: (barchart) => {

            barchart.foreground.selectAll("g.dataGroup").each(function (key) {
                let g = d3.select(this);
                g.selectAll("path")
                    .data(barchart.d)
                    .enter()
                    .append("path")
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let y = barchart.y[key](d[key]);
                        let width = barchart.x.bandwidth();
                        let height = barchart.boxHeight - barchart.y[key](d[key]);
                        return `M${x + (width / 3)},${y} L${x + (width - (width / 3))},${y} L${x + width},${y + (height)} L${x},${y + height} Z`;

                    });

                g.selectAll("g.y.axis").remove();
                g.append("g")
                    .attr("class", "y axis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(6));

            });

        }



    },
    "perspective escalonada": {
        data: (barchart) => {

            barchart.ybreak = {};
            barchart.ybreak2 = {};
            for (let k of barchart.keys_filter) {
                let maximo = barchart.domain[k][1];
                // let segundo_maior = d3.max(dado, (d) => d[k] === maximo ? NaN : d[k])
                let corte = 10;
                let meio = 190;

                barchart.breakPoint = 0.6;
                barchart.breakPoint2 = 0.96;


                barchart.boxHeightBreak = barchart.boxHeight * barchart.breakPoint;
                barchart.boxHeightBreak2 = barchart.boxHeightBreak * barchart.breakPoint2;

                barchart.y[k] = d3.scaleLinear().domain([0, corte]).range([barchart.boxHeight, barchart.boxHeightBreak]);
                barchart.ybreak[k] = d3.scaleLinear().domain([corte, meio]).range([barchart.boxHeightBreak, barchart.boxHeightBreak2]);
                barchart.ybreak2[k] = d3.scaleLinear().domain([meio, maximo]).range([barchart.boxHeightBreak2, 10]);


            }
        },
        draw: (barchart) => {

            barchart.foreground.selectAll("g.dataGroup").each(function (key) {
                // let miny = barchart.boxHeight * barchart.breakPoint
                let maxh = barchart.boxHeight - barchart.boxHeightBreak;
                let g = d3.select(this);
                g.selectAll("rect.lower")
                    .data(barchart.d)
                    .enter()
                    .append("rect")
                    .attr("class", "lower")
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("y", (d) => Math.max(barchart.y[key](d[key]), barchart.boxHeightBreak))
                    .attr("width", barchart.x.bandwidth())
                    .attr("height", (d) => Math.min(barchart.boxHeight - barchart.y[key](d[key]), maxh))
                    .style("fill", barchart.settings.color);


                let maxh2 = barchart.boxHeightBreak - barchart.boxHeightBreak2;

                g.selectAll("path.meio")
                    .data(barchart.d)
                    .enter()
                    .append("path")
                    .attr("class", "meio")
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let width = barchart.x.bandwidth();
                        let y = Math.max(barchart.ybreak[key](d[key]), barchart.boxHeightBreak2);
                        let height = Math.max(Math.min((barchart.boxHeightBreak) - barchart.ybreak[key](d[key]), maxh2), 0);
                        return `M${x + (width / 4)},${y} L${x + (width - (width / 3))},${y} L${x + (width)},${y + height} L${x},${y + height} Z`;
                    });

                g.selectAll("path.upper")
                    .data(barchart.d)
                    .enter()
                    .append("path")
                    .attr("class", "upper")
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let y = barchart.ybreak2[key](d[key]);
                        let width = barchart.x.bandwidth();
                        let height = Math.max(barchart.boxHeightBreak2 - barchart.ybreak2[key](d[key]), 0);
                        return `M${x + (width / 4)},${y} L${x + (width - (width / 3))},${y} L${x + (width - (width / 3))},${y + height} L${x + (width / 4)},${y + height} Z`;

                    });

                g.append("g")
                    .attr("class", "y loweraxis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(5));

                g.append("g")
                    .attr("class", "y meioaxis")
                    .call(d3.axisLeft(barchart.ybreak[key]).ticks(2));


                g.append("g")
                    .attr("class", "y upper")
                    .call(d3.axisLeft(barchart.ybreak2[key]).ticks(5));

            });

        }
    },
    "scale break perspective": {
        data: (barchart) => {

            barchart.ybreak = {};
            barchart.ybreak2 = {};
            barchart.ybreak3 = {};
            barchart.ybreak4 = {};
            barchart.z = barchart.settings.z;

            let corte = barchart.settings.corte;
            let cortefinal = barchart.settings.cortefinal;
            let diferença = cortefinal - corte;

            let corte2 = corte + (diferença * 40) / 100
            let corte3 = corte2 + (diferença * 20) / 100;

            for (let k of barchart.keys_filter) {
                let maximo = barchart.domain[k][1];


                barchart.breakPoint = barchart.settings.breakPoint;
                barchart.breakPoint2 = barchart.settings.breakPoint2;
                barchart.breakPoint3 = barchart.settings.breakPoint3;
                barchart.breakPoint4 = barchart.settings.breakPoint4;

                barchart.breakPoint = 0.3;
                // barchart.breakPoint2 = 0.92;
                // barchart.breakPoint3 = 0.91;
                // barchart.breakPoint4 = 0.91;

                // let corte1 = 10;
                // let corte2 = 100;
                // let corte3 = 130;
                // let corte4 = 230;


                barchart.boxHeightBreak = barchart.boxHeight * barchart.breakPoint;
                barchart.boxHeightBreak2 = barchart.boxHeightBreak * barchart.breakPoint2;
                barchart.boxHeightBreak3 = barchart.boxHeightBreak2 * barchart.breakPoint3;
                barchart.boxHeightBreak4 = barchart.boxHeightBreak3 * barchart.breakPoint4;



                barchart.y[k] = d3.scaleLinear().domain([0, corte]).range([barchart.boxHeight, barchart.boxHeightBreak]);
                barchart.ybreak[k] = d3.scaleLinear().domain([corte, corte2]).range([barchart.boxHeightBreak, barchart.boxHeightBreak2]);
                barchart.ybreak2[k] = d3.scaleLinear().domain([corte2, corte3]).range([barchart.boxHeightBreak2, barchart.boxHeightBreak3]);
                barchart.ybreak3[k] = d3.scaleLinear().domain([corte3, cortefinal]).range([barchart.boxHeightBreak3, barchart.boxHeightBreak4]);
                barchart.ybreak4[k] = d3.scaleLinear().domain([cortefinal, maximo]).range([barchart.boxHeightBreak4, 10]);

            }
        },
        draw: (barchart) => {

            barchart.foreground.selectAll("g.dataGroup").each(function (key) {

                let maxh = barchart.boxHeight - barchart.boxHeightBreak;
                let g = d3.select(this);
                g.selectAll("rect.lower")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("rect")
                                .attr("class", "lower")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("y", (d) => Math.max(barchart.y[key](d[key]), barchart.boxHeightBreak))
                    .attr("width", barchart.x.bandwidth())
                    .attr("height", (d) => Math.min(barchart.boxHeight - barchart.y[key](d[key]), maxh))
                    .style("fill", barchart.settings.color);

                barchart.settings.gap = barchart.x(1) - barchart.x.bandwidth() - barchart.x(0);

                let maxh2 = barchart.boxHeightBreak - barchart.boxHeightBreak2;
                let z = 2;
                let di = 5;
                let f = 30;
                g.selectAll("path.meio1")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("path")
                                .attr("class", "meio1")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let width = barchart.x.bandwidth();
                        let y = Math.max(barchart.ybreak[key](d[key]), barchart.boxHeightBreak2);
                        let height = Math.max(Math.min((barchart.boxHeightBreak) - barchart.ybreak[key](d[key]), maxh2), 0);
                        // let xp = x/(z/di);
                        // let xp = x*di/(z+di)*(f/(f+z));
                        // console.log('normal:',x)                        
                        // console.log('atual:',x+(barchart.z))                        
                        return `M${x + (width * barchart.z)},${y} L${x + (width * (1 - barchart.z))},${y} L${x + (width)},${y + height} L${x},${y + height} Z`;
                    });


                let maxh3 = barchart.boxHeightBreak2 - barchart.boxHeightBreak3;
                g.selectAll("path.meio2")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("path")
                                .attr("class", "meio2")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let width = barchart.x.bandwidth();
                        let y = Math.max(barchart.ybreak2[key](d[key]), barchart.boxHeightBreak3);
                        let height = Math.max(Math.min((barchart.boxHeightBreak2) - barchart.ybreak2[key](d[key]), maxh3), 0);
                        return `M${x + (width * barchart.z)},${y} L${x + (width * (1 - barchart.z))},${y} L${x + (width * (1 - barchart.z))},${y + height} L${x + (width * barchart.z)},${y + height} Z`;
                    });

                let maxh4 = barchart.boxHeightBreak3 - barchart.boxHeightBreak4;
                g.selectAll("path.meio3")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("path")
                                .attr("class", "meio3")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let width = barchart.x.bandwidth();
                        let y = Math.max(barchart.ybreak3[key](d[key]), barchart.boxHeightBreak4);
                        let height = Math.max(Math.min((barchart.boxHeightBreak3) - barchart.ybreak3[key](d[key]), maxh4), 0);
                        return `M${x},${y} L${x + width},${y} L${x + (width * (1 - barchart.z))},${y + height} L${x + (width * barchart.z)},${y + height} Z`;
                    });

                g.selectAll("path.upper")
                    .data(barchart.d)
                    .join(
                        enter => {
                            let enter_result = enter.append("path")
                                .attr("class", "upper")
                                .style("stroke", "none")
                                .attr("data-index", (d, i) => i + 1);  // Ajustando para começar do índice 1;
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let y = barchart.ybreak4[key](d[key]);
                        let width = barchart.x.bandwidth();
                        let height = Math.max(barchart.boxHeightBreak4 - barchart.ybreak4[key](d[key]), 0);
                        return `M${x},${y} L${x + (width)},${y} L${x + (width)},${y + height} L${x},${y + height} Z`;

                    });

                // Remove os elementos existentes
                g.selectAll("g.y.loweraxis, g.y.meio1, g.y.meio2, g.y.meio3, g.y.upper, g.Axisright.meio1, g.Axisright.meio2, g.Axisright.meio3, g.Axisright.meio4, g.Axisright.meio5, g.Line1, g.Line2, g.Line3, g.Line4, g.Line5").remove();


                // Axis          
                g.append("g")
                    .attr("class", "y loweraxis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(7).tickFormat(d => d.toLocaleString('pt-BR')))
                    .selectAll("text") // Seleciona todos os elementos de texto do eixo y
                    .each(function (d) { // Para cada marca de tick
                        d3.select(this.parentNode) // Seleciona o pai (o elemento g)
                            .append("line") // Adiciona uma linha
                            .attr("class", "grid-line") // Define a classe para estilização
                            .attr("stroke", "black")
                            .attr("x1", 0) // Posição inicial x da linha
                            .attr("x2", barchart.innerWidth) // Posição final x da linha
                            .attr("y1", barchart.ybreak[key](d[key])) // Posição inicial y da linha
                            .attr("y2", barchart.ybreak[key](d[key])); // Posição final y da linha, é a mesma que a inicial para uma linha horizontal
                    });


                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "y meio1")
                    .attr("d", (d, i) => {
                        let x = 0;
                        let y = barchart.boxHeightBreak;
                        let heigth = barchart.boxHeightBreak2;
                        let width = barchart.x.bandwidth();
                        return `M${x},${y} L${x + (width * barchart.z)},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "y meio2")
                    .attr("d", (d, i) => {
                        let x = 0;
                        let y = barchart.boxHeightBreak2;
                        let heigth = barchart.boxHeightBreak3;
                        let width = barchart.x.bandwidth();
                        return `M${x + (width * barchart.z)},${y} L${x + (width * barchart.z)},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "y meio3")
                    .attr("d", (d, i) => {
                        let x = 0;
                        let y = barchart.boxHeightBreak3;
                        let heigth = barchart.boxHeightBreak4;
                        let width = barchart.x.bandwidth();
                        return `M${x + (width * barchart.z)},${y} L${x},${heigth} Z`;
                    });

                g.append("g")
                    .attr("class", "y upper")
                    .call(d3.axisLeft(barchart.ybreak4[key]).ticks(4).tickFormat(d => d.toLocaleString('pt-BR')))
                    .selectAll("text") // Seleciona todos os elementos de texto do eixo y
                    .each(function (d) { // Para cada marca de tick
                        d3.select(this.parentNode) // Seleciona o pai (o elemento g)
                            .append("line") // Adiciona uma linha
                            .attr("class", "grid-line") // Define a classe para estilização
                            .attr("stroke", "black")
                            .attr("x1", 0) // Posição inicial x da linha
                            .attr("x2", barchart.innerWidth) // Posição final x da linha
                            .attr("y1", barchart.ybreak4[key](d[key])) // Posição inicial y da linha
                            .attr("y2", barchart.ybreak4[key](d[key])); // Posição final y da linha, é a mesma que a inicial para uma linha horizontal
                    });


                //Line rigth
                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axisrigth.meio1")
                    .attr("d", (d, i) => {
                        let x = barchart.innerWidth;
                        let y = barchart.boxHeight;
                        let heigth = barchart.boxHeightBreak;
                        return `M${x},${y} L${x},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axisrigth.meio2")
                    .attr("d", (d, i) => {
                        let x = barchart.innerWidth;
                        let width = barchart.x.bandwidth();
                        let x2 = barchart.innerWidth - ((width * barchart.z));
                        let y = barchart.boxHeightBreak;
                        let heigth = barchart.boxHeightBreak2;
                        return `M${x},${y} L${x2},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axis rigth.meio3")
                    .attr("d", (d, i) => {
                        let width = barchart.x.bandwidth();
                        let x = barchart.innerWidth - (width * barchart.z);
                        let y = barchart.boxHeightBreak2;
                        let heigth = barchart.boxHeightBreak3;
                        return `M${x},${y} L${x},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axis rigth.meio4")
                    .attr("d", (d, i) => {
                        let width = barchart.x.bandwidth();
                        let x = barchart.innerWidth - (width * barchart.z);
                        let x2 = barchart.innerWidth;
                        let y = barchart.boxHeightBreak3;
                        let heigth = barchart.boxHeightBreak4;
                        return `M${x},${y} L${x2},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axisrigth.meio5")
                    .attr("d", (d, i) => {
                        let x = barchart.innerWidth;
                        let y = barchart.boxHeightBreak4;
                        let heigth = 0;
                        return `M${x},${y} L${x},${heigth} Z`;
                    });


                //textura
                let xbreak = 0;
                for (let j = 0; j < 4; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("stroke-width", (1 - (j * 30.3) / 100))
                        .attr("class", "Line2")
                        .attr("d", (d, i) => {
                            x2 = barchart.innerWidth - (xbreak)
                            y = barchart.boxHeightBreak + j * ((barchart.boxHeightBreak2 - barchart.boxHeightBreak) / 3);
                            return `M${xbreak},${y} L${x2},${y}`;
                        });
                    xbreak += (barchart.x.bandwidth() * barchart.z) / 3;
                }


                for (j = 1; j < 6; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("stroke-width", (0.10))
                        .attr("class", "Line3")
                        .attr("d", (d, i) => {
                            let x = (barchart.x.bandwidth() * barchart.z);
                            let x2 = barchart.innerWidth - ((barchart.x.bandwidth() * barchart.z));
                            let y = barchart.boxHeightBreak2 + j * ((barchart.boxHeightBreak3 - barchart.boxHeightBreak2) / 5);
                            return `M${x},${y} L${x2},${y} Z`;
                        })

                }

                let xbreak3 = (barchart.x.bandwidth() * barchart.z);
                for (j = 0; j < 4; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("stroke-width", (0.10 + (j * 27) / 100))
                        .attr("class", "Line4")
                        .attr("d", (d, i) => {
                            let x2 = (barchart.innerWidth) - (xbreak3)
                            let y = barchart.boxHeightBreak3 + j * ((barchart.boxHeightBreak4 - barchart.boxHeightBreak3) / 3);
                            return `M${xbreak3},${y} L${x2},${y} Z`;
                        });
                    xbreak3 = xbreak3 - ((barchart.x.bandwidth() * barchart.z)) / 3
                }
            });
        }
    }, "3d break": {
        data: (barchart) => {
            const resultado = barchart.calcularCortesEMaximo(barchart.d);
            barchart.d = [...barchart.d].map((item) => item.valor);
            
            if (!resultado) {
                console.error("Dados insuficientes para análise de quebra");
                return;
            }
        
            barchart.corte = resultado.corteInferior;
            barchart.maximo = resultado.valorMaximo;
        
            barchart.sections = [
                { name: "lower", range: [0, resultado.corteInferior] },
                { name: "meio1", range: [resultado.corteInferior, resultado.corteIntermediario1] },
                { name: "meio2", range: [resultado.corteIntermediario1, resultado.corteIntermediario2] },
                { name: "meio3", range: [resultado.corteIntermediario2, resultado.corteSuperior] },
                { name: "upper", range: [resultado.corteSuperior, resultado.valorMaximo] },
            ];
        },

        draw: (barchart) => {
            barchart.parentElement.classList.add("dbreak");

            barchart.parentElement.innerHTML = `
            <div id="upper" class="child">
                <svg xmlns="https://www.w3.org/2000/svg" height="100%"></svg>
            </div>
            <div id="meio3" class="child">
                <svg xmlns="https://www.w3.org/2000/svg" height="100%"></svg>
            </div>
            <div id="meio2" class="child">
                <svg xmlns="https://www.w3.org/2000/svg" height="100%"></svg>
            </div>
            <div id="meio1" class="child">
                <svg xmlns="https://www.w3.org/2000/svg" height="100%"></svg>
            </div>
            <div id="lower" class="child">
                <svg xmlns="https://www.w3.org/2000/svg" height="100%"></svg>
            </div>
        `;

            const divideValueBySections = (value, sections) => {
                let remaining = value;
                return sections.map((section) => {
                    const rangeSize = section.range[1] - section.range[0];
                    const inSection = Math.max(0, Math.min(rangeSize, remaining));
                    remaining -= inSection;
                    return { name: section.name, value: inSection };
                });
            };

            const lowerMax = barchart.corte;
            const yIncrement = lowerMax / 10;
            const maxDataValue = barchart.maximo;

            const scaleFactor = 230;
            const dynamicHeight = scaleFactor * maxDataValue / lowerMax;

            const width = document.querySelector("#chart").clientWidth - 50;
            const height = dynamicHeight
            const margin = { top: 20, right: 30, bottom: 30, left: 40 };

            const xScale = d3
                .scaleBand()
                .domain(barchart.d.map((_, i) => i))
                .range([margin.left, width - margin.right])
                .padding(0.1);

            const sortedTicks = [];
            const ticks = d3
                .scaleLinear()
                .domain([0, maxDataValue])
                .range(height)
                .ticks(maxDataValue / yIncrement);

            ticks.forEach((d) => {
                sortedTicks.push(d);
            });

            barchart.sections.forEach((section, index) => {
                for (const d of sortedTicks) {
                    if (d >= section.range[1]) {
                        if (section.name == "meio3") {
                            section.range[1] = sortedTicks[sortedTicks.indexOf(d) - 1] - 1;
                            if (index + 1 < barchart.sections.length) {
                                barchart.sections[index + 1].range[0] =
                                    sortedTicks[sortedTicks.indexOf(d) - 1];
                            }
                            break;
                        }
                        if (section.name == "lower") {
                            section.range[1] = d;
                            if (index + 1 < barchart.sections.length) {
                                barchart.sections[index + 1].range[0] = d;
                            }
                            break;
                        }
                    }

                    if (
                        section.name == "upper" &&
                        d == sortedTicks[sortedTicks.length - 1]
                    ) {
                        section.range[1] =
                            d + (sortedTicks.length > 1 ? sortedTicks[1] : 0);
                    }
                }
            });

            const yScale = d3
                .scaleLinear()
                .domain([
                    0,
                    sortedTicks.length
                        ? sortedTicks[sortedTicks.length - 1] +
                        (sortedTicks.length > 1 ? sortedTicks[1] : 0)
                        : 10,
                ])
                .range([height - margin.bottom, margin.top]);

            const svg = d3
                .select("#chart")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

            barchart.d.forEach((value, i) => {
                const dividedValues = divideValueBySections(value, barchart.sections);
                let yOffset = yScale(0);

                dividedValues.forEach((section) => {
                    if (section.value > 0) {
                        const barHeight = yScale(0) - yScale(section.value);
                        svg
                            .append("rect")
                            .attr("x", xScale(i))
                            .attr("y", yOffset - barHeight)
                            .style(
                                "fill",
                                barchart.settings && barchart.settings.color
                                    ? barchart.settings.color
                                    : "#69b3a2"
                            )
                            .attr("width", xScale.bandwidth())
                            .attr("height", barHeight)
                            .attr("class", section.name)
                            .attr("data-index", i+1);

                        yOffset -= barHeight; // Atualiza o deslocamento para a próxima parte da barra
                    }
                });
            });

            // Adiciona o eixo Y com classes para cada seção
            svg
                .append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(yScale).ticks(maxDataValue / yIncrement))
                .selectAll(".tick")
                .each(function (d) {
                    // Determina a seção a que o tick pertence
                    const section = barchart.sections.find(
                        (sec) => d >= sec.range[0] && d <= sec.range[1]
                    );
                    const sectionClass = section ? `${section.name}axis` : "unknownaxis";

                    // Atribui a classe e adiciona linha horizontal
                    d3.select(this)
                        .attr("class", sectionClass)
                        .append("line")
                        .attr("x1", 0)
                        .attr("x2", width - margin.left - margin.right)
                        .attr("y1", 0)
                        .attr("y2", 0)
                        .attr("stroke", "black")
                        .attr("stroke-width", 0.5);
                });

            // Agrupa as partes do gráfico
            const parts = {
                4: d3.selectAll("rect.upper"),
                3: d3.selectAll("rect.meio3"),
                2: d3.selectAll("rect.meio2"),
                1: d3.selectAll("rect.meio1"),
                0: d3.selectAll("rect.lower"),
            };

            // Processa cada parte do gráfico
            for (const part in parts) {
                if (!parts[part].nodes().length) continue;

                const classe = parts[part].node().classList.value;
                const raiz = document.querySelector(`#${classe} svg`);

                if (!raiz) continue;

                // Inicializa dimensões
                raiz.parentElement.attributes.height = 0;
                raiz.parentElement.style.height = "0";
                raiz.style.width = `${width}px`;

                // Move os elementos para o SVG correspondente
                parts[part].nodes().forEach((element) => {
                    const divFilho = element;
                    divFilho.setAttribute("y", "0");
                    divFilho.style.transform = `translateX(50px)`;

                    if (
                        Number(divFilho.attributes.height.value) >=
                        Number(raiz.parentElement.attributes.height)
                    ) {
                        raiz.parentElement.attributes.height =
                            divFilho.attributes.height.value;
                    }

                    raiz.appendChild(divFilho);
                });

                // Atualiza a altura com base nos elementos

                raiz.parentElement.style.height = `${raiz.parentElement.attributes.height}px`;


                // Cria o domínio do gráfico
                const domain = document.createElement("g");
                domain.setAttribute("transform", "translate(40,0)");
                domain.setAttribute("fill", "none");
                domain.setAttribute("font-size", "10");
                domain.setAttribute("font-family", "sans-serif");
                domain.setAttribute("text-anchor", "end");

                // Cria o elemento de caminho
                const pathElement = document.createElement("path");
                pathElement.setAttribute("class", "domain");
                pathElement.setAttribute("stroke", "currentColor");
                pathElement.setAttribute(
                    "d",
                    `M-6,${Math.round(raiz.parentElement.attributes.height)}H0V20H-6`
                );

                domain.appendChild(pathElement);
                raiz.appendChild(domain);

                // Processa as linhas do eixo Y
                const linhas = document.querySelectorAll(`.${classe}axis`);
                if (linhas.length > 0) {
                    let linhaYmax = linhas[0].transform.animVal[0].matrix.f;

                    linhas.forEach((linha) => {
                        let y = (linha.transform.animVal[0].matrix.f - linhaYmax) * -1;
                        linha.setAttribute("transform", `translate(100, ${y})`);

                        if (classe == "meio1" || classe == "meio2" || classe == "meio3") {
                            linha.childNodes[1].style.display = "None";
                        } else {
                            linha.childNodes[1].style.transform =
                                "translate(-50px, 0) rotateX(180deg)";
                        }

                        raiz.appendChild(linha);
                        if (raiz.parentElement.id == "upper" || raiz.parentElement.id == "lower") {
                            raiz.parentElement.style.height = `${y}px`;
                        }
                    });
                }
            }

            // Remove o SVG base
            const baseSVG = document.querySelector("#chart > svg");
            if (baseSVG) {
                baseSVG.parentNode.removeChild(baseSVG);
            }

            // Aplica as transformações 3D


            const m1 = document.querySelector("#meio1");
            if (m1) {
                m1.style.transform = `rotate3d(1, 0, 0, -90deg) translate3d(0px, ${m1.clientHeight / 2}px, -${m1.clientHeight / 2}px)`;
            }

            const m3 = document.querySelector("#meio3");
            if (m3) {
                m3.style.transform = `rotate3d(1, 0, 0, 90deg) translate3d(0px, -${m3.clientHeight / 2}px, -${m3.clientHeight / 2}px)`;
            }

            const m2 = document.querySelector("#meio2");
            if (m2 && m3) {
                m2.style.transform = `rotateX(180deg) translate3d(0px, 0px, ${m3.clientHeight}px)`;
            }

            const upper = document.querySelector("#upper");
            if (upper && m3) {
                upper.style.transform = `rotateX(180deg) translate3d(0px, -${m3.clientHeight}px, 0px)`;
            }

            const lower = document.querySelector("#lower");
            if (lower && m1) {
                lower.style.transform = `rotateX(180deg) translate3d(0px, ${m1.clientHeight}px, 0px)`;
            }


            // Configura os controles de perspectiva/rotação
            const slider = document.querySelector("#sliderGirarGrafico");
            const sliderPerspective = document.querySelector("#sliderPerspective");
            const myDiv = document.getElementById("chart");

            if (slider && sliderPerspective && myDiv) {
                let rotateXValue = slider.value;
                let perspectiveValue = sliderPerspective.value;

                // Configura os event listeners para os sliders
                slider.addEventListener("input", () => {
                    rotateXValue = slider.value;
                    myDiv.style.transform = `perspective(${perspectiveValue}px) rotateY(${rotateXValue}deg)`;
                });

                sliderPerspective.addEventListener("input", () => {
                    perspectiveValue = sliderPerspective.value;
                    myDiv.style.transform = `perspective(${perspectiveValue}px) rotateY(${rotateXValue}deg)`;
                });
            }

            myDiv.style.top = `-${myDiv.clientHeight / 2 - upper.clientHeight - upper.clientHeight / 3}px`;

            // Remove nós filhos desnecessários
            const parent = document.getElementById("chart");
            if (parent && parent.lastChild) {
                parent.removeChild(parent.lastChild);
            }
        },
    },
};

module.exports = BarChart;