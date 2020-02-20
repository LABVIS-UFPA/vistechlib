let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");

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
class PieChart extends Visualization {

    constructor(parentElement, settings) {
        super(parentElement, settings);

        this.name = "BarChart";
        this.x = d3.scaleBand().paddingInner(0).paddingOuter(0);
    }
    _putDefaultSettings() {
        this.settings.labelVAlign = "top";
        this.settings.labelHAlign = "left";
        this.settings.paddingTop = 20;
        this.settings.paddingBottom = 20;
        this.settings.paddingLeft = 10;
        this.settings.paddingRight = 10;
    }

    resize() {
        let margin = ({ top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft });
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.cellWidth = svgBounds.width / this.keys.length;
        this.cellHeight = svgBounds.height / this.keys.length;

        this.redraw();
        return this;
    }

    data(d) {
        super.data(d);

        let margin = ({ top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft });
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.cellWidth = svgBounds.width / this.keys.length;
        this.cellHeight = svgBounds.height / this.keys.length;
        this.dimensions = [];

        for (let k of this.keys) {
            if (this.domainType[k] === "Categorical") {
                let domain = [];
                for (let cat of this.d) {
                    domain.push(cat[k]);
                }

                domain = utils.reduce_and_count(domain);
                this.dimensions.push(domain);

            } else {
                let domain = [];
                for (let cat of this.d) {
                    domain.push(cat[k]);
                }

                domain = utils.reduce_and_count(domain);
                this.dimensions.push(domain);
            }
        }


        return this;
    }


    redraw() {
        let t0 = performance.now();
        let radius = Math.min(this.cellWidth, this.cellHeight)/2;
        let svgBounds = this.svg.node().getBoundingClientRect();
 
        let arc = d3.arc()
            .innerRadius(0)
            .outerRadius(Math.min(this.cellWidth, this.cellHeight)/2);

        const pie = d3.pie()
            .sort(null)
            .value(d => d.value);

        this.foreground.selectAll(".PieChart").remove();
        d3.selectAll('.labels').remove();
        d3.selectAll("text").remove();

        for (let i = 0; i < this.keys.length; i++) {
            let arcs = pie(this.dimensions[i]);
            //criar arco
            let drawpie = [];

            const arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);

            drawpie[i] = this.foreground
                .append("g").attr('class', 'PieChart')
                .attr('data', this.keys[i]).attr('data-index', i);

            let upadatePie = drawpie[i].append("g")
                .attr("stroke", "white")
                .selectAll("path")

            let createSlice = upadatePie.data(arcs)
                .join("path")
                .attr("fill", d => this.settings.color)
                .attr("d", arc)

            //parte das legendas
            const labelsUpdate = drawpie[i].selectAll("path");

            let titleArc = []
            titleArc[i] = this.foreground.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 12)
                .attr("text-anchor", "middle")
                .attr("class", "labels")
                .selectAll("text")
                .data(arcs)
                .join("text")
                .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
                .call(text => text.append("tspan")
                    .attr("y", "-0.4em")
                    .attr("font-weight", "bold")
                    .attr('color', "red")
                    .text(d => isNaN(d.data.name) ? d.data.name : (+d.data.name).toFixed(2)))
                .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
                    .attr("x", 0)
                    .attr("y", "0.7em")
                    .attr("fill-opacity", 0.7)
                    .text(d => d.value.toLocaleString()));

        }

        let layout_position = utils.define_layout_positions(svgBounds.width, svgBounds.height, this.keys.length);

        if (layout_position == 'width') {
            //translate positions charts   
            this.foreground
                .selectAll('.PieChart')
                .attr("transform", (d, i) => `translate(${this.cellWidth/2+ (this.cellWidth * i)},${svgBounds.height  / 2})`);
            this.foreground
                .selectAll('.labels')
                .attr("transform", (d, i) => `translate(${(this.cellWidth/2 + (this.cellWidth * i))},${svgBounds.height / 2})`);
        }else if(layout_position == 'height'){
            this.foreground
                .selectAll('.PieChart')
                .attr("transform", (d, i) => `translate(${(svgBounds.width/2-this.cellWidth/2) },${(this.cellHeight * i)+this.cellHeight*0.35})`);
            this.foreground
                .selectAll('.labels')
                .attr("transform", (d, i) => `translate(${(svgBounds.width/2-this.cellWidth/2) },${(this.cellHeight * i)+this.cellHeight*0.35})`);
        }else if(layout_position=='none'){
            this.foreground
                .selectAll('.PieChart')
                .attr("transform", (d, i) => `translate(${this.cellWidth/2+ (this.cellWidth * i)},${svgBounds.height  / 2})`);
            this.foreground
                .selectAll('.labels')
                .attr("transform", (d, i) => `translate(${(this.cellWidth/2 + (this.cellWidth * i))},${svgBounds.height / 2})`);
        }
        



        let t1 = performance.now();
        console.log("TIme: " + (t1 - t0));

        return super.redraw();
    }

    detail(...args) {

    }

    highlight(...args) {

    }
    removeHighlight(...args) {

    }
    getHighlightElement(i) {

    }

    filterByDimension(args) {

    }


}

module.exports = PieChart;
