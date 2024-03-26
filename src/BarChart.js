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


    constructor(parentElement, settings) {
        super(parentElement, settings);

        this.drawStrategy = BarChart.strategies[this.settings.drawStrategy];

        this.name = "BarChart";
        this.x = d3.scaleBand().paddingInner(0.1).paddingOuter(0.1);
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
        this.settings.drawStrategy = " ";// "default" "scale-break", "perspective", "perspective escalonada", "scale break perspective"
        this.settings.breakPoint = 0.6;
        this.settings.breakPoint2 = 0.5;        
        this.settings.cols = {};

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

        // this.drawStrategy = estrategia
        
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
                                .attr("data-index", (d, i) => i);
                            barchart._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .style("fill", barchart.settings.color)
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("y", (d) => barchart.y[key](d[key]))
                    .attr("width", barchart.x.bandwidth())
                    .attr("height", (d) => barchart.boxHeight - barchart.y[key](d[key]));

                g.selectAll("g.y.axis").remove();
                g.append("g")
                    .attr("class", "y axis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(6));


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
                let segundo_maior = 20;

                console.log(barchart.boxHeight, segundo_maior)

                barchart.breakPoint = barchart.settings.breakPoint;
                barchart.gapSize = 10;

                // barchart.breaksize = 40;
                // barchart.settings.cols[k]={};
                // barchart.settings.cols[k].barchart.breaksize;                
                // console.log(barchart.settings.cols[k].breaksize)


                barchart.y[k] = d3.scaleLinear().domain([0, segundo_maior]).range([barchart.boxHeight, barchart.boxHeight * barchart.breakPoint + barchart.gapSize / 2]);
                barchart.ybreak[k] = d3.scaleLinear().domain([segundo_maior, maximo]).range([barchart.boxHeight * barchart.breakPoint - barchart.gapSize / 2, 0]);

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
                    .enter()
                    .append("rect")
                    .attr("class", "lower")
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("y", (d) => Math.max(barchart.y[key](d[key]), miny))
                    .attr("width", barchart.x.bandwidth())
                    .attr("height", (d) => Math.min(barchart.boxHeight - barchart.y[key](d[key]), maxh))
                    .style("fill", barchart.settings.color);


                g.selectAll("rect.upper")
                    .data(barchart.d)
                    .enter()
                    .append("rect")
                    .attr("class", "upper")
                    .attr("x", (d, i) => barchart.x(i))
                    .attr("width", barchart.x.bandwidth())
                    .attr("y", (d) => barchart.ybreak[key](d[key]))
                    .attr("height", (d) => Math.max(barchart.boxHeightBreak - barchart.ybreak[key](d[key]), 0))
                    .style("fill", barchart.settings.color);

                g.append("g")
                    .attr("class", "y upperaxis")
                    .call(d3.axisLeft(barchart.ybreak[key]).ticks(4));

                g.append("g")
                    .attr("class", "y loweraxis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(4));

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

                barchart.breakPoint = 0.8;
                barchart.breakPoint2 = 0.85;


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
            barchart.z = 40;

            for (let k of barchart.keys_filter) {
                let maximo = barchart.domain[k][1];

                barchart.breakPoint = 0.8;
                barchart.breakPoint2 = 0.92;
                barchart.breakPoint3 = 0.91;
                barchart.breakPoint4 = 0.91;

                let corte1 = 10;
                let corte2 = 100;
                let corte3 = 130;
                let corte4 = 230;


                barchart.boxHeightBreak = barchart.boxHeight * barchart.breakPoint;
                barchart.boxHeightBreak2 = barchart.boxHeightBreak * barchart.breakPoint2;
                barchart.boxHeightBreak3 = barchart.boxHeightBreak2 * barchart.breakPoint3;
                barchart.boxHeightBreak4 = barchart.boxHeightBreak3 * barchart.breakPoint4;



                barchart.y[k] = d3.scaleLinear().domain([0, corte1]).range([barchart.boxHeight, barchart.boxHeightBreak]);
                barchart.ybreak[k] = d3.scaleLinear().domain([corte1, corte2]).range([barchart.boxHeightBreak, barchart.boxHeightBreak2]);
                barchart.ybreak2[k] = d3.scaleLinear().domain([corte2, corte3]).range([barchart.boxHeightBreak2, barchart.boxHeightBreak3]);
                barchart.ybreak3[k] = d3.scaleLinear().domain([corte3, corte4]).range([barchart.boxHeightBreak3, barchart.boxHeightBreak4]);
                barchart.ybreak4[k] = d3.scaleLinear().domain([corte4, maximo]).range([barchart.boxHeightBreak4, 0]);

            }
        },
        draw: (barchart) => {

            barchart.foreground.selectAll("g.dataGroup").each(function (key) {

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
                g.selectAll("path.meio1")
                    .data(barchart.d)
                    .enter()
                    .append("path")
                    .attr("class", "meio1")
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let width = barchart.x.bandwidth();
                        let y = Math.max(barchart.ybreak[key](d[key]), barchart.boxHeightBreak2);
                        let height = Math.max(Math.min((barchart.boxHeightBreak) - barchart.ybreak[key](d[key]), maxh2), 0);
                        return `M${x + (barchart.z)},${y} L${x + (width - (barchart.z))},${y} L${x + (width)},${y + height} L${x},${y + height} Z`;
                    });


                let maxh3 = barchart.boxHeightBreak2 - barchart.boxHeightBreak3;
                g.selectAll("path.meio2")
                    .data(barchart.d)
                    .enter()
                    .append("path")
                    .attr("class", "meio2")
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let width = barchart.x.bandwidth();
                        let y = Math.max(barchart.ybreak2[key](d[key]), barchart.boxHeightBreak3);
                        let height = Math.max(Math.min((barchart.boxHeightBreak2) - barchart.ybreak2[key](d[key]), maxh3), 0);
                        return `M${x + (barchart.z)},${y} L${x + (width - (barchart.z))},${y} L${x + (width - (barchart.z))},${y + height} L${x + (barchart.z)},${y + height} Z`;
                    });

                let maxh4 = barchart.boxHeightBreak3 - barchart.boxHeightBreak4;
                g.selectAll("path.meio3")
                    .data(barchart.d)
                    .enter()
                    .append("path")
                    .attr("class", "meio3")
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let width = barchart.x.bandwidth();
                        let y = Math.max(barchart.ybreak3[key](d[key]), barchart.boxHeightBreak4);
                        let height = Math.max(Math.min((barchart.boxHeightBreak3) - barchart.ybreak3[key](d[key]), maxh4), 0);
                        return `M${x},${y} L${x + width},${y} L${x + (width - (barchart.z))},${y + height} L${x + (barchart.z)},${y + height} Z`;
                    });

                g.selectAll("path.upper")
                    .data(barchart.d)
                    .enter()
                    .append("path")
                    .attr("class", "upper")
                    .style("fill", barchart.settings.color)
                    .attr("d", (d, i) => {
                        let x = barchart.x(i);
                        let y = barchart.ybreak4[key](d[key]);
                        let width = barchart.x.bandwidth();
                        let height = Math.max(barchart.boxHeightBreak4 - barchart.ybreak4[key](d[key]), 0);
                        return `M${x},${y} L${x + (width)},${y} L${x + (width)},${y + height} L${x},${y + height} Z`;

                    });

                // Axis
                g.append("g")
                    .attr("class", "y loweraxis")
                    .call(d3.axisLeft(barchart.y[key]).ticks(3));

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "y meio1")
                    .attr("d", (d, i) => {
                        let x = 0;
                        let y = barchart.boxHeightBreak;
                        let heigth = barchart.boxHeightBreak2;
                        return `M${x},${y} L${x + (barchart.z)},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "y meio2")
                    .attr("d", (d, i) => {
                        let x = 0;
                        let y = barchart.boxHeightBreak2;
                        let heigth = barchart.boxHeightBreak3;
                        return `M${x + (barchart.z)},${y} L${x + (barchart.z)},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "y meio3")
                    .attr("d", (d, i) => {
                        let x = 0;
                        let y = barchart.boxHeightBreak3;
                        let heigth = barchart.boxHeightBreak4;
                        return `M${x + (barchart.z)},${y} L${x},${heigth} Z`;
                    });

                g.append("g")
                    .attr("class", "y upper")
                    .call(d3.axisLeft(barchart.ybreak4[key]).ticks(6));

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
                    .attr("class", "Axisrigth.meio1")
                    .attr("d", (d, i) => {
                        let x = barchart.innerWidth;
                        let x2 = barchart.innerWidth - (barchart.z);
                        let y = barchart.boxHeightBreak;
                        let heigth = barchart.boxHeightBreak2;
                        let width = barchart.x.bandwidth;
                        return `M${x},${y} L${x2},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axis rigth.meio2")
                    .attr("d", (d, i) => {
                        let x = barchart.innerWidth - (barchart.z);
                        let y = barchart.boxHeightBreak2;
                        let heigth = barchart.boxHeightBreak3;
                        return `M${x},${y} L${x},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axis rigth.meio3")
                    .attr("d", (d, i) => {
                        let x = barchart.innerWidth - (barchart.z);
                        let x2 = barchart.innerWidth;
                        let y = barchart.boxHeightBreak3;
                        let heigth = barchart.boxHeightBreak4;
                        return `M${x},${y} L${x2},${heigth} Z`;
                    });

                g.append("path")
                    .attr("stroke", "black")
                    .attr("class", "Axisrigth.meio1")
                    .attr("d", (d, i) => {
                        let x = barchart.innerWidth;
                        let y = barchart.boxHeightBreak4;
                        let heigth = 0;
                        return `M${x},${y} L${x},${heigth} Z`;
                    });


                // Texture

                for (j = 0; j < 2; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("class", "Line1")
                        .attr("d", (d, i) => {
                            let x = 0;
                            let x2 = barchart.innerWidth;
                            let y = barchart.boxHeight - j * 27;
                            return `M${x},${y} L${x2},${y} Z`;
                        });
                }

                let xbreak = 0;
                for (j = 0; j < 4; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("stroke-width", (1 - (j * 30) / 100))
                        .attr("class", "Line2")
                        .attr("d", (d, i) => {                        
                            let x2 = barchart.innerWidth - (xbreak)
                            let y = barchart.boxHeightBreak - j * 6;
                            return `M${xbreak},${y} L${x2},${y} Z`;                            
                        });
                        xbreak = xbreak + (barchart.z)/3
                }

                for (j = 0; j < 3; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("stroke-width", (0.19))
                        .attr("class", "Line3")                        
                        .attr("d", (d, i) => {
                            let x = barchart.z;
                            let x2 = barchart.innerWidth - (barchart.z);
                            let y = barchart.boxHeightBreak2 - (5) - j * 4;
                            return `M${x},${y} L${x2},${y} Z`;
                        })
                        .attr("filter", "url(#dropshadow)")
                }

                let xbreak3 = barchart.z;
                for (j = 0; j < 4; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("stroke-width", (0.19 + (j * 27) / 100))
                        .attr("class", "Line4")
                        .attr("d", (d, i) => {                            
                            let x2 = (barchart.innerWidth ) - (xbreak3)
                            let y = barchart.boxHeightBreak3 - j * 5.5;
                            console.log((0.19 + (j * 27) / 100))
                            return `M${xbreak3},${y} L${x2},${y} Z`;
                        });
                        xbreak3 = xbreak3 - (barchart.z)/3
                }

                for (j = 0; j < 4; j++) {
                    g.append("path")
                        .attr("stroke", "black")
                        .attr("class", "Line5")
                        .attr("d", (d, i) => {
                            let x = 0;
                            let x2 = barchart.innerWidth;
                            let y = barchart.boxHeightBreak4 - (10) - j * 39.3;
                            return `M${x},${y} L${x2},${y} Z`;
                        });
                }

            });

        }
    },
}

module.exports = BarChart;
