let d3 = require("d3");

let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


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
        // let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});
        // let svgBounds = this.svg.node().getBoundingClientRect();
        //
        // this.cellHeight = svgBounds.height-margin.bottom;
        // this.cellWidth = svgBounds.width- margin.left;
        //
        // this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        // this.datak = {};
        //
        // for(let k of this.keys){
        //     if(this.domainType[k] === "Categorical"){
        //     }else{
        //         this.newkey.push(k);
        //     }
        // }
        //
        // this.cellWidth /= this.newkey.length;
        //
        // this.newkey =[];
        //
        // let j =0;
        // for(let k of this.keys){
        //     if(this.domainType[k] === "Categorical"){
        //
        //     }else{
        //         let xvalues = [];
        //         for (let i = 0; i <this.d.length ; i++){
        //             xvalues.push(this.d[i][k]);
        //         }
        //         this.newkey.push(k);
        //         this.datak[k] = xvalues;
        //
        //         this.bins[k] = d3.histogram()
        //             .domain(this.domain[k])
        //             .thresholds(20)
        //             (this.datak[k]);
        //
        //         console.log(this.bins[k]);
        //
        //         this.x[k] = d3.scaleBand()
        //             .domain(this.bins[k].map(d => d.x0))
        //             .range([margin.left, this.cellWidth]);
        //
        //
        //         this.y[k] =  d3.scaleLinear()
        //             .domain([0,d3.max(this.bins[k], d => d.length)]).nice()
        //             .range([this.cellHeight, margin.top]);
        //
        //         j++;
        //     }
        // }
        //
        //
        // this.redraw();
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

        this.binHeight = {};
        this.binWidth = {};

        for(let k of this.keys){
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
        this.cellWidth-=this.settings.innerPadding*(this.newkey.length-1);
        this.cellWidth /= this.newkey.length;

        for(let k of this.newkey){
            if(this.domainType[k] === "Categorical"){
                this.bins[k] = [];
                for(let cat of this.domain[k]){
                    this.bins[k].push([]);
                    this.bins[k][this.bins[k].length-1].x0 = cat;
                }
                for(let d of this.d){
                    for(let bin of this.bins[k]){
                        if(bin.x0 === d[k]){
                            bin.push(d);
                        }
                    }
                }
                console.log(this.bins[k]);
            }else{

                this.bins[k] = d3.histogram()
                    .domain(this.domain[k])
                    .thresholds(20)
                    .value(d => d.data[k])
                    (this.d_wrapper);

                this.binWidth[k] = this.cellWidth/this.bins[k].length;
                this.x[k] = d3.scaleLinear()
                    .domain([this.bins[k][0].x0,this.bins[k][this.bins[k].length-1].x1])
                    .range([0, this.cellWidth]);


                let bigger_bin = 0, domain_array = [];
                for(let bin of this.bins[k]){
                    if(bin.length>bigger_bin) bigger_bin=bin.length;
                }
                for(let i=0; i<bigger_bin;i++)
                    domain_array.push(i);

                this.binHeight[k] = this.cellHeight/bigger_bin;
                this.y[k] =  d3.scaleBand()
                    .domain(domain_array)
                    .range([this.cellHeight, 0])
                    .paddingInner(0)
                    .paddingOuter(0);
                // this.y[k] =  d3.scaleLinear()
                //     .domain([0,+1])
                //     .range([this.cellHeight, 0]);

                this.y_scale[k] =  d3.scaleLinear()
                    .domain([0,bigger_bin])
                    .range([this.cellHeight, 0]);

            }
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

        let margin = ({top: this.settings.paddingTop , right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

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
                        enter => enter.append("rect")
                            .attr("class", "data")
                            .attr("data-index", d => d.index)
                            .style("stroke", "none")
                            .style("rx", "2")
                            .style("ry", "2")
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
            .data(this.newkey)
            .join(
                enter => enter.append("g")
                    .attr("class","cellGroup")
                    .attr("id",d=>"group_"+d)
            )
            .attr("transform",(d,i)=>{return `translate(${(i*histogram.cellWidth+i*pad)},0)`;});

        histogram.foreground.selectAll("g.cellGroup").each(function(d){
            let gGroup = d3.select(this);
            draw_minibars(gGroup, d);

            gGroup.selectAll("g.x.axis").remove();
            gGroup.append("g")
                .attr("class", "x axis")
                .attr("transform", `translate(0,${histogram.cellHeight})`)
                .call(d3.axisBottom(histogram.x[d]).ticks(6));

            gGroup.selectAll("g.y.axis").remove();
            gGroup.append("g")
                .attr("class", "y axis")
                .call(d3.axisLeft(histogram.y_scale[d]).ticks(6));

        });

        // let updateChart  = this.foreground
        //     .selectAll(".data")
        //     .data(this.d);
        //
        // let groups = this.foreground
        //     .append("g")
        //     .attr("class","cellGroup");
        //
        //
        //
        // for (let i = 0; i <this.newkey.length ; i++) {
        //     draw_Bins(this.newkey[i],i);
        // }

        console.log("Histogram-Redraw: ",performance.now()-t0);
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