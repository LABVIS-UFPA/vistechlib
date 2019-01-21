let d3 = require("d3");

let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class BoxPlot extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "BoxPlot";
    }

    _putDefaultSettings(){
        // this.settings.innerPadding = 8;
        this.settings.paddingRight = 20;
        this.settings.paddingTop = 25;
        this.settings.paddingBottom = 50;
        this.settings.paddingLeft = 40;
    }

    resize(){
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

        let svgBounds = this.svg.node().getBoundingClientRect();
        let value =0, datak = {};

        this.cellHeight = svgBounds.height-margin.bottom;
        this.cellWidth = svgBounds.width- margin.bottom;

        this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        datak = {};
        let i = 0;

        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }else{
                this.newkey.push(k);
            }
        }

        this.cellWidth /= this.newkey.length;


        this.redraw();
        return this;
    }

    data(d){
        super.data(d);
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});
        let svgBounds = this.svg.node().getBoundingClientRect();


        let value =0;

        this.cellHeight = svgBounds.height-margin.bottom;
        this.cellWidth = svgBounds.width- margin.bottom;

        this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        this.datak = {};
        let i = 0;

        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }else{
                this.newkey.push(k);
            }
        }

        // this.cellHeight /= this.newkey.length;
        this.cellWidth /= this.newkey.length;



        this.redraw();
        return this;
    }


    redraw(){
        let boxplot = this;

        this.foreground.selectAll(".textLabel").remove();
        this.foreground.selectAll(".axisY").remove();
        this.foreground.selectAll("rect.data").remove();

        let margin = ({top: this.settings.paddingTop , right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

        let keys = this.newkey;

        let i =0;
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){

            }else{
                let xvalues = [];
                for (let i = 0; i <this.d.length ; i++){
                    xvalues.push(this.d[i][k]);
                }
                boxplot.datak[k] = xvalues;

                boxplot.x[k] = d3.scaleBand()
                    .domain(k)
                    .range([margin.left, this.cellWidth])
                    .padding(0.3);

                // boxplot.bins[k] = d3.histogram()
                //     .domain(this.x[k].domain())
                //     // .thresholds(this.x[k].ticks(20))
                //     (this.datak[k]);
                // console.log(k," ",d3.max(this.datak[k]));

                boxplot.y[k] = d3.scaleLinear()
                    .range([this.cellHeight, margin.top])
                    .domain([0, d3.max(this.datak[k])]).nice();


                boxplot.xAxis[k] = g => g
                    .attr("transform", `translate(0,${this.cellHeight})`)
                    .call(d3.axisBottom(this.x[k]));

                boxplot.yAxis[k] = g => g
                    .attr("transform", `translate(${margin.left},0)`)
                    .call(d3.axisLeft(this.y[k]))
                    .call(g => g.select(".domain").remove())
                    .call(g => g.select(".tick:last-of-type text").clone()
                        .attr("x", 5)
                        .attr("text-anchor", "start")
                        .text("-"+k));

                i++;
            }
        }

        function rPoints(k,j) {

            let chart = boxplot.foreground.select(".cellGroup")
                .append("g")
                .attr("class","hChart")
                .attr("id","data_"+j)
                .attr("transform",`translate(${(j* boxplot.cellWidth)},0)`);

            let dataEnter = chart.selectAll("rect.data")
                .data(boxplot.d)
                .enter().append("rect")
                .attr("data-index", function(d,i){ return i; })
                .attr("class", "data")
                .attr("x", d => boxplot.x[k].bandwidth())
                // .data(boxplot.datak[k])
                // .attr("y", d => boxplot.y[k](d.length))
                // .attr("width", d => Math.max(0, boxplot.x[k](d.x1) - boxplot.x[k](d.x0) - 1))
                // .attr("height", d => boxplot.y[k](0) - boxplot.y[k](d.length))
                .style("fill", boxplot.settings.color)
                .attr("key", k);

            let enterAxisX = chart.append("g")
                .attr("class","textLabel")
                .call(boxplot.xAxis[k])
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", "-.55em")
                .attr("transform", "translate(10,15)" );
            //
            let enterAxisY = chart.append("g")
                .attr("class","axisY")
                .call(boxplot.yAxis[k]);
        }

        // this.foreground.selectAll("g.cellGroup").remove();
        this.foreground.selectAll("g.cellGroup").remove();

        let updateChart  = this.foreground
            .selectAll(".data")
            .data(this.d);

        let groups = this.foreground
            .append("g")
            .attr("class","cellGroup");


        console.log(keys);
        for (let i = 0; i <keys.length ; i++) {
            rPoints(keys[i],i);
        }

        function histogram (season) {
            
        }
            // sort players by points asc
            let skaters = season.skaters.sort((a,b) => a[perMode] - b[perMode]);

            // map points to an array
            let stat = skaters.map((sk) => sk[perMode]);

            // get the min and max
            let min = stat[0];
            let max = stat[stat.length-1];

            // quantiles
            let q1 = d3.quantile(stat, 0.25);
            let q2 = d3.quantile(stat, 0.50);
            let q3 = d3.quantile(stat, 0.75);

            // interquartile range
            let iqr = q3 - q1;

            // range
            let r0 = Math.max(min, q1 - iqr * 1.50);
            let r1 = Math.min(max, q3 + iqr * 1.50);

            let group = {
                group: season.sid,
                skaters,
                min,
                max,
                quartiles: [q1,q2,q3],
                range: [r0,r1],
                iqr,
                outliers: skaters.filter(sk => sk[perMode] > r1)
            }

            return group;


        return this;
    }

    highlight(...args){

    }
    removeHighlight(...args){

    }
    getHighlightElement(i){

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

module.exports = BoxPlot;