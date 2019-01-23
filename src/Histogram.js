let d3 = require("d3");

let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class Histogram extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "Histogram";
    }

    _putDefaultSettings(){
        this.settings.paddingRight = 20;
        this.settings.paddingTop = 25;
        this.settings.paddingBottom = 50;
        this.settings.paddingLeft = 40;
    }

    resize(){
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.cellHeight = svgBounds.height-margin.bottom;
        this.cellWidth = svgBounds.width- margin.left;

        this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        this.datak = {};

        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }else{
                this.newkey.push(k);
            }
        }

        this.cellWidth /= this.newkey.length;

        this.newkey =[];

        let j =0;
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){

            }else{
                let xvalues = [];
                for (let i = 0; i <this.d.length ; i++){
                    xvalues.push(this.d[i][k]);
                }
                this.newkey.push(k);
                this.datak[k] = xvalues;

                this.bins[k] = d3.histogram()
                    .domain(this.domain[k])
                    .thresholds(20)
                    (this.datak[k]);

                this.x[k] = d3.scaleBand()
                    .domain(this.bins[k].map(d => d.x0))
                    .range([margin.left, this.cellWidth]);


                this.y[k] =  d3.scaleLinear()
                    .domain([0,d3.max(this.bins[k], d => d.length)]).nice()
                    .range([this.cellHeight, margin.top]);

                j++;
            }
        }


        this.redraw();
        return this;
    }

    data(d){
        super.data(d);
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.cellHeight = svgBounds.height-margin.bottom;
        this.cellWidth = svgBounds.width- margin.left;

        this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        this.datak = {};

        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }else{
                this.newkey.push(k);
            }
        }

        this.cellWidth /= this.newkey.length;

        this.newkey =[];

        let j =0;
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){

            }else{
                let xvalues = [];
                for (let i = 0; i <this.d.length ; i++){
                    xvalues.push(this.d[i][k]);
                }
                this.newkey.push(k);
                this.datak[k] = xvalues;

                this.bins[k] = d3.histogram()
                    .domain(this.domain[k])
                    .thresholds(20)
                    (this.datak[k]);

                this.x[k] = d3.scaleBand()
                    .domain(this.bins[k].map(d => d.x0))
                    .range([margin.left, this.cellWidth]);


                this.y[k] =  d3.scaleLinear()
                    .domain([0,d3.max(this.bins[k], d => d.length)]).nice()
                    .range([this.cellHeight, margin.top]);

                j++;
            }
        }

        this.redraw();
        return this;
    }


    redraw(){
        let histogram = this;

        this.foreground.selectAll(".textLabel").remove();
        this.foreground.selectAll(".axisY").remove();
        this.foreground.selectAll("rect.data").remove();

        let margin = ({top: this.settings.paddingTop , right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

        let draw_Bins = (k, j) => {

            let x = d3.scaleLinear()
                .domain([0,d3.max(this.datak[k])]).nice()
                .range([margin.left,this.cellWidth]);

            histogram.xAxis[k] = g => g
                .attr("transform", `translate(0,${this.cellHeight})`)
                .call(d3.axisBottom(x)
                    .tickSizeOuter(0))
                .call(g => g.append("text")
                    .attr("x", margin.right)
                    .attr("y", -4)
                    .attr("fill", "#000")
                    .attr("font-weight", "bold")
                    .attr("text-anchor", "end"));

            histogram.yAxis[k] = g => g
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(this.y[k]))
                .call(g => g.select(".domain").remove())
                .call(g => g.select(".tick:last-of-type text").clone()
                    .attr("x", 5)
                    .attr("y", -20)
                    .attr("text-anchor", "start")
                    .text("-"+k));

            let chart = histogram.foreground.select(".cellGroup")
                .append("g")
                .attr("class","hChart")
                .attr("id","data_"+j)
                .attr("transform",`translate(${(j* this.cellWidth)},0)`);

            let dataEnter = chart.selectAll("rect.data")
                .data(histogram.d)
                .enter().append("rect")
                .attr("class", "data")
                .data(histogram.bins[k])
                .attr("data-index", function(d,i){ return i; })
                .attr("x", d => histogram.x[k](d.x0))
                .attr("width", histogram.x[k].bandwidth()-0.5)
                .attr("y", d => histogram.y[k](d.length))
                .attr("height", d => histogram.y[k](0) - histogram.y[k](d.length))
                .style("fill", histogram.settings.color)
                .attr("stroke","black")
                .attr("stroke-width","1px")
                .attr("key", k);

            this._bindDataMouseEvents(dataEnter);

            let enterAxisX = chart.append("g")
                .attr("class","textLabel")
                .call(histogram.xAxis[k])
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", "-.55em")
                .attr("transform", "translate(10,15)" );

            let enterAxisY = chart.append("g")
                .attr("class","axisY")
                .call(histogram.yAxis[k]);
        };

        this.foreground.selectAll("g.cellGroup").remove();

        let updateChart  = this.foreground
            .selectAll(".data")
            .data(this.d);

        let groups = this.foreground
            .append("g")
            .attr("class","cellGroup");



        for (let i = 0; i <this.newkey.length ; i++) {
            draw_Bins(this.newkey[i],i);
        }


        return this;
    }

    highlight(...args){
        let highlighted;

        if(args[0] instanceof SVGElement){
        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length) {

            highlighted = this.foreground
                .selectAll('rect[data-index="' + args[1] + '"]')
                .style("stroke", this.settings.highlightColor)
                .attr("stroke-width","1px");
            if(highlighted)
                super.highlight(highlighted.nodes(), args[0], args[1], args[2]);
        }
    }
    removeHighlight(...args){
        if(args[1] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            let elem = this.foreground.selectAll('rect[data-index="'+args[1]+'"]')
                .style("stroke", "black")
                .attr("stroke-width","1px");
            this.background.selectAll(".lineHighlight").remove();
            super.removeHighlight(elem.node(), elem.datum(), args[1]);
        }

    }

    getHighlightElement(i){

        this.foreground.selectAll('rect[data-index="'+i+'"]')

        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");
        let rect = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "rect"))
            .attr("class", "lineHighlight")
            .style("fill", "none")
            .style("stroke", this.settings.highlightColor)
            .attr("stroke-width","2px");
        group.appendChild(rect);
        return group;
    }

    setAxisX(args){
        this.settings.axisX = args;
        console.log(args);
    }

    setAxisY(args){
        this.settings.axisY = args;
        console.log(args);

    }
}

module.exports = Histogram;