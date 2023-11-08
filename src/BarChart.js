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
        this.settings.negativeMode = "disabled"; //TODO: fazer funcionar
        this.settings.startZero = true;
        this.settings.drawStrategy = "default"; // "scale-break", "perspective"

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
                for (let k of this.keys_filter) {
                    if (this.domain[k][0] > 0) this.domain[k][0] = 0;
                }
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

        this.y[k].domain()
        }
        return this;
    }


    redraw() {
        // let t0 = performance.now();

        let ip = this.settings.innerPadding;
        let barchart = this;
        let estraegy = this.settings.drawStrategy;

        //console.log(xp);

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

        BarChart.strategies[estraegy](barchart); // chama a estrategia default



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
    "default": (barchart) => {
        console.log("To aqui")
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
    "scale-break": () => {

    },
    "perspective": () => {

    }
}

module.exports = BarChart;
