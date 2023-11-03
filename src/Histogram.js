let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


/**
 * @class
 * @description  histogram is an accurate representation of the distribution of numerical data.
 *  It is an estimate of the probability distribution of a continuous variable and was first
 *  introduced by Karl Pearson. It differs from a bar graph, in the sense that a bar graph relates two variables,
 *  but a histogram relates only one.  
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
class Histogram extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "Histogram";
    }

    _putDefaultSettings(){
        this.settings.paddingRight = 5;
        this.settings.paddingTop = 25;
        this.settings.paddingBottom = 25;
        this.settings.paddingLeft = 30;
        this.settings.innerPadding = 40;
    }

    resize(){
        super.resize();
        let t0 = performance.now();
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.cellHeight = svgBounds.height-margin.bottom-margin.top;
        this.cellWidth = svgBounds.width-margin.left-margin.right;

        if(this.settings.filter){
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }
        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;


        this.cellWidth-=this.settings.innerPadding*(this.keys_filter.length-1);
        this.cellWidth /= this.keys_filter.length;

        for(let k of this.keys_filter){
            this.y[k].range([this.cellHeight, 0]);
            this.binWidth[k] = this.cellWidth/this.bins[k].length;
            this.x[k].range([0, this.cellWidth]);
            //Escala do eixo.
            this.y_scale[k] =  d3.scaleLinear()
                .domain([0,this.bigger_bin[k]])
                .range([this.cellHeight, 0]);
        }
        console.log("Histogram-Resize: ",performance.now()-t0);

        this.redraw();
        return this;
    }

    data(d){
        let t0 = performance.now();
        super.data(d);
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.cellHeight = svgBounds.height-margin.bottom-margin.top;
        this.cellWidth = svgBounds.width-margin.left-margin.right;

        this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        this.datak = {};
        this.y_scale = {};
        this.x_scale = {};
        this.bigger_bin = {};

        this.binWidth = {};

        if(this.settings.filter){
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }
        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;

        for(let k of this.keys_filter){
            if(this.domainType[k] === "Categorical"){
                this.newkey.push(k);
            }else if(this.domainType[k] === "Numeric"){
                this.newkey.push(k);
            }
        }

        this.d_wrapper = [];
        for(let i=0;i<this.d.length;i++){
            this.d_wrapper.push({index:i, data: this.d[i]});
        }
        this.cellWidth-=this.settings.innerPadding*(this.keys_filter.length-1);
        this.cellWidth /= this.keys_filter.length;

        for(let k of this.newkey){
            if(this.domainType[k] === "Categorical"){
                this.bins[k] = [];
                for(let cat of this.domain[k]){
                    this.bins[k].push([]);
                    this.bins[k][this.bins[k].length-1].x0 = cat;
                }
                for(let d of this.d_wrapper){
                    for(let bin of this.bins[k]){
                        if(bin.x0 === d.data[k]){
                            bin.push(d);
                        }
                    }
                }
            }else{
                this.bins[k] = d3.histogram()
                    .domain(this.domain[k])
                    .thresholds(20)
                    .value(d => d.data[k])
                    (this.d_wrapper);
            }
            this.binWidth[k] = this.cellWidth/this.bins[k].length;
            this.x[k] = d3.scaleLinear()
                .domain([this.bins[k][0].x0,this.bins[k][this.bins[k].length-1].x1])
                .range([0, this.cellWidth]);

            if(this.domainType[k] === "Categorical"){
                this.x_scale[k] = d3.scaleBand()
                    .domain(this.domain[k])
                    .range([0, this.cellWidth])
                    .paddingInner(0)
                    .paddingOuter(0);
            }else{
                this.x_scale[k] = this.x[k];
            }

            this.bigger_bin[k] = 0;
            let domain_array = [];
            for(let bin of this.bins[k]){
                if(bin.length>this.bigger_bin[k]) this.bigger_bin[k]=bin.length;
            }
            for(let i=0; i<this.bigger_bin[k];i++)
                domain_array.push(i);

            //this.binHeight[k] = this.cellHeight/bigger_bin;
            this.y[k] =  d3.scaleBand()
                .domain(domain_array)
                .range([this.cellHeight, 0])
                .paddingInner(0)
                .paddingOuter(0);
            // this.y[k] =  d3.scaleLinear()
            //     .domain([0,+1])
            //     .range([this.cellHeight, 0]);

            this.y_scale[k] =  d3.scaleLinear()
                .domain([0,this.bigger_bin[k]])
                .range([this.cellHeight, 0]);
        }
        console.log("Histogram-Data: ",performance.now()-t0);
        return this;
    }


    redraw(){
        let t0 = performance.now();
        let histogram = this;

        this.foreground.selectAll(".textLabel").remove();
        this.foreground.selectAll(".axisY").remove();
        this.foreground.selectAll("rect.data").remove();
        let pad = this.settings.innerPadding;

        let draw_minibars = (group_select, k) => {

            let bin_group = group_select.selectAll("g.bin_group");
            bin_group.data(histogram.bins[k])
                .join(
                    enter => enter.append("g").attr("class", "bin_group")
                )
                .attr("transform", (d,i)=>{return `translate(${(i*histogram.binWidth[k])},0)`;});

            group_select.selectAll("g.bin_group").each(function(bin_d){
                d3.select(this).selectAll("rect.data").data(bin_d)
                    .join(
                        enter => {
                            let enter_result = enter.append("rect")
                                .attr("class", "data")
                                .attr("data-index", d => d.index)
                                .style("stroke", "none")
                                .style("rx", "2")
                                .style("ry", "2");
                            histogram._bindDataMouseEvents(enter_result);
                            return enter_result;
                        }
                    )
                    .attr("width", histogram.binWidth[k])
                    .attr("height", histogram.y[k].bandwidth())
                    .attr("x", 0)
                    .attr("y", (d,i) => histogram.y[k](i))
                    .style("fill", histogram.settings.color);
            })
        };


        let groups_update = histogram.foreground
            .selectAll("g.cellGroup")
            .data(this.newkey, d=>d)
            .join(
                (enter) => {
                    let enter_result = enter.append("g")
                        .attr("class","cellGroup")
                        .attr("id",d=>"group_"+d);
                    enter_result.append("text")
                        .attr("class", "axisLabel")
                        .attr("x", 0)
                        .attr("y", -10)
                        .style("fill", "black")
                        .text(d=>d);
                    return enter_result;
                }

            )
            .attr("transform",(d,i)=>{return `translate(${(i*histogram.cellWidth+i*pad)},0)`;});

        // groups_update.selectAll("text.axisLabel").text(function(d){
        //     return d;
        // });


        histogram.foreground.selectAll("g.cellGroup").each(function(d){
            let gGroup = d3.select(this);
            draw_minibars(gGroup, d);

            gGroup.selectAll("g.x.axis").remove();
            gGroup.append("g")
                .attr("class", "x axis")
                .attr("transform", `translate(0,${histogram.cellHeight})`)
                .call(d3.axisBottom(histogram.x_scale[d]).ticks(6));

            gGroup.selectAll("g.y.axis").remove();
            gGroup.append("g")
                .attr("class", "y axis")
                .call(d3.axisLeft(histogram.y_scale[d]).ticks(6));

        });

        console.log("Histogram-Redraw: ",performance.now()-t0);
        return super.redraw();
    }

    detail(...args){
        let details;
        let obj =  Object.entries(args[0]);
        let text = "";

        for (let j = 0; j < args[2].length; j++) {
            for (let i = 0; i < obj.length; i++) {
                if(args[2][j]===obj[i][0]){
                    text+= obj[i][0]+" : "+ obj[i][1]+"\n";
                }
            }
        }

        if(args[0] instanceof SVGElement){
        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length) {
            details = this.foreground.selectAll(`.data[data-index="${args[1]}"]`)
              .style("stroke", this.settings.highlightColor)
              .style("stroke-width", "2")
              .each(function(){
                  this.parentNode.appendChild(this);
              })
              .append(":title")
              .text(text);
        }
    }

    highlight(...args){
        let highlighted;

        if(args[0] instanceof SVGElement){
        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length) {
            highlighted = this.foreground.selectAll(`.data[data-index="${args[1]}"]`)
                .style("stroke", this.settings.highlightColor)
                .style("stroke-width", "2")
                .each(function(){
                    this.parentNode.appendChild(this);
                });
        }
        if(highlighted)
            super.highlight(highlighted.nodes(), args[0], args[1], args[2]);
    }
    removeHighlight(...args){
        if(args[1] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            let dataSelect = this.foreground.selectAll(`.data[data-index="${args[1]}"]`)
                .style("stroke", "none");
            super.removeHighlight(dataSelect.node(), dataSelect.datum(), args[1]);
        }

    }

    getHighlightElement(i){
        let histogram = this;
        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");

        this.foreground.selectAll('rect[data-index="'+i+'"]').each(function(){
            let t = utils.parseTranslate(this.parentElement);
            let tp = utils.parseTranslate(this.parentElement.parentElement);
            let rect_select = d3.select(this);

            let rect = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "rect"))
                .attr("class", "rectHighlight")
                .style("fill", "none")
                .style("stroke", histogram.settings.highlightColor)
                .attr("stroke-width","2px")
                .attr("x", (+rect_select.attr("x"))+t.x+tp.x)
                .attr("y", (+rect_select.attr("y"))+t.y+tp.y)
                .attr("width", rect_select.attr("width"))
                .attr("height", rect_select.attr("height"));

            group.appendChild(rect.node());
        });

        return group;
    }


    _bindDataMouseEvents(selection, prefix){
        let vis = this;
        let _prefix = prefix || "data";
        selection
            .on("mouseover", function(d){ vis.event.call(_prefix+"mouseover", this, d.data, d.index); })
            .on("mouseout", function(d){ vis.event.call(_prefix+"mouseout", this, d.data, d.index); })
            .on("click", function(d){ vis.event.call(_prefix+"click", this, d.data, d.index); })
            .on("dblclick", function(d){ vis.event.call(_prefix+"dblclick", this, d.data, d.index); });
    }
    setAxisX(args){
        this.settings.axisX = args;
        console.log(args);
    }

    setAxisY(args){
        this.settings.axisY = args;
        console.log(args);

    }

    filterByDimension(args) {
        this.settings.filter = args;
    }
}


module.exports = Histogram;
