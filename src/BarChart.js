
let d3 = require("d3");
let _ = require("underscore");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class BarChart extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "BarChart";
    }

    _putDefaultSettings(){
        this.settings.innerPadding = 8;
        this.settings.paddingRight = 20;
        this.settings.paddingBottom = 75;
    }

    resize(){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;

        let svgBounds = this.svg.node().getBoundingClientRect();
        this.cellWidth = svgBounds.width - pl;
        this.cellHeight = svgBounds.height -pb;

        this.redraw();
        return this;
    }

    data(d){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;

        super.data(d);
        let svgBounds = this.svg.node().getBoundingClientRect();
        this.cellWidth = svgBounds.width - pl;
        this.cellHeight = svgBounds.height -pb;

        this.redraw();
        return this;
    }


    redraw(){
        let barchart = this;
        this.foreground.selectAll(".textLabel").remove();
        this.foreground.selectAll(".data").remove();
        this.foreground.selectAll(".axisY").remove();

        let margin = ({top: this.settings.paddingTop , right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

        let chart = this.foreground;

        let updateChart  = this.foreground
            .selectAll(".data")
            .data(this.d);

        updateChart.exit().remove();

        let width = barchart.cellWidth,
            height = barchart.cellHeight;

        this.x = d3.scaleBand()
            .domain(this.d.map(d => d.y))
            .range([margin.left, this.cellWidth - margin.right])
            .padding(0.1);

        this.y = d3.scaleLinear()
            .domain([0, d3.max(this.d, d => d.x)]).nice()
            .range([this.cellHeight - margin.bottom, margin.top]);

        this.xAxis = g => g
            .attr("transform", `translate(0,${this.cellHeight - margin.bottom})`)
            .call(d3.axisBottom(this.x)
                .tickSizeOuter(0));

        this.yAxis = g => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(this.y))
            .call(g => g.select(".domain").remove());

        let dataEnter = updateChart
            .data(barchart.d).enter()
            .append("rect")
            .attr("class","data")
            .attr("height", d => this.y(0) - this.y(d.x))
            .attr("width", this.x.bandwidth())
            .attr("x", d => this.x(d.y))
            .attr("y", d => this.y(d.x))
            .attr("data-index", function(d,i){ return i; })
            .style("fill",barchart.settings.color)
            .style("stroke","black")
            .style("stroke-width",0.5);
        dataEnter.exit().remove();

        let enterAxisX = chart.append("g")
            .attr("class","textLabel")
            .call(this.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.55em")
            .attr("transform", "rotate(-90)" );
        //
        //
        let enterAxisY = chart.append("g")
            .attr("class","axisY")
            .call(this.yAxis);

        return this;
    }

    highlight(...args){

    }
    removeHighlight(...args){

    }
    getHighlightElement(i){
    }

}



module.exports = BarChart;