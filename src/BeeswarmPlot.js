let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");

/**
 * @class
 * @description A bee swarm plot is a one-dimensional scatter plot similar to stripchart , but with various methods to separate coincident points such that each point is visible. Also, beeswarm introduces additional features unavailable in stripchart , such as the ability to control the color and plotting character of each point.  
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
class BeeswarmPlot extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);

        this.name = "BeeswarmPlot";

        this.x = d3.scalePoint()
    }
    _putDefaultSettings(){
        this.settings.innerPadding = 10;
        this.settings.radius = 2;
    }

    resize(){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        let svgBounds = this.svg.node().getBoundingClientRect();

        if(this.settings.filter){
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }

        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;

        this.boxWidth = (svgBounds.width-pl-pr-ip*(this.keys_filter.length-1))/this.keys_filter.length;
        this.innerHeight = svgBounds.height-pt-pb;

        this.x.range([this.boxWidth/2, svgBounds.width-pl-pr-this.boxWidth/2]);
        for(let k of this.keys_filter){
            // if(this.domainType[k] === "Categorical"){
            //     this.y[k].rangePoints([this.innerHeight, 0], 0);
            // }else{
            this.y[k].range([this.innerHeight, 0]);
            // }
        }

        this.xPoints = this.getXfunction();
        this.yPoints = (d, k) => {
            return Math.floor(this.y[k](d[k])/this.binHeight)*this.binHeight;
        };
        this.redraw();
        return this;
    }

    /**
     * @none
     */
    data(d){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        super.data(d);

        let svgBounds = this.svg.node().getBoundingClientRect();

        if(this.settings.filter){
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }

        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;

        this.dByAxis = {};
        this.boxWidth = (svgBounds.width-pl-pr-ip*(this.keys_filter.length-1))/this.keys_filter.length;

        this.innerHeight = svgBounds.height-pt-pb;

        this.x.domain(this.keys_filter)
            .range([ this.boxWidth/2, svgBounds.width-pl-pr-this.boxWidth/2]);
        this.y = {};
        for(let k of this.keys_filter){
            if(this.domainType[k] === "Categorical"){
                this.y[k] = d3.scalePoint();
            }else{
                this.y[k] = d3.scaleLinear();
            }
            this.y[k].domain(this.domain[k]).range([this.innerHeight, 0]);

            // this.dByAxis[k] = this.d.map((d) => { return _.pick(d, k); });
        }


        this.pointXmethod = "center";
        this.xPoints = this.getXfunction();
        this.yPoints = (d, k) => {
            return Math.floor(this.y[k](d[k])/this.binHeight)*this.binHeight;
        };

        return this;
    }


    redraw(){


        let t0 = performance.now();

        let posWoutColl = (ccx, ccy, cy, dd, sign) => { return ccx + sign*Math.sqrt(dd - (ccy-cy)*(ccy-cy)); };

        //Atualiza os Eixos
        let beeswarm = this;

        function redrawDataPoints (k){
            beeswarm.resetXfunction();

            let dataSelection = d3.select(this)
                .selectAll("circle.data")
                .data(beeswarm.d);

            dataSelection.exit().remove();
            let dataEnter = dataSelection.enter()
                .append("circle")
                .attr("class", "data")
                .attr("data-index", function(d, i){ return i; })
                .style("fill-opacity", ".6")
                .attr("cx", (d) => { return beeswarm.xPoints(d, k); })
                .attr("cy", (d) => { return beeswarm.yPoints(d, k); })
                .style("fill", beeswarm.settings.color)
                .attr("r", beeswarm.settings.radius);

            beeswarm._bindDataMouseEvents(dataEnter);

            dataSelection
                .attr("cx", (d) => { return beeswarm.xPoints(d, k); })
                .attr("cy", (d) => { return beeswarm.yPoints(d, k); })
                .style("fill", beeswarm.settings.color);
        }


        let beegroup = this.foreground.selectAll("g.beeSwarmGroup")
            .data(this.keys_filter);

        beegroup.exit().remove();
        let beegroupenter = beegroup.enter()
            .append("g")
            .attr("class", "beeSwarmGroup")
            .attr("transform", (d) => {
                return "translate(" + this.x(d) + ",0)";
            })
            .each(redrawDataPoints);
        beegroup
            .attr("transform", (d) => {
                return "translate(" + this.x(d) + ",0)";
            });

        beegroupenter.append("rect")
            .attr("class", "frame")
            .attr("x", -beeswarm.boxWidth/2)
            .attr("y", 0)
            .attr("width", beeswarm.boxWidth)
            .attr("height", beeswarm.svg.node().getBoundingClientRect().height
                -beeswarm.settings.paddingTop-beeswarm.settings.paddingBottom)
            .style("fill", "none")
            .style("stroke", "#aaa");
        beegroupenter.append("g")
            .attr("class", "axis")
            .attr("transform", "translate("+(-beeswarm.boxWidth/2)+",0)")
            .each(function(k) { d3.select(this).call(d3.axisRight(beeswarm.y[k]).tickSizeInner(0)); });
        beegroupenter.append("text")
            .attr("class", "axisLabel")
            .attr("x", 0)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("fill", "black")
            .text(function(d){
                return d;
            });

        beegroupenter.each(function(k){
            console.log("enter: "+k);
        });
        // beegroup.selectAll("")
        beegroup
            .each(function(k) {
                d3.select(this).selectAll("g.axis").call(d3.axisRight(beeswarm.y[k]).tickSizeInner(0));
            })
            .selectAll("g.axis")
            .attr("transform", "translate("+(-beeswarm.boxWidth/2)+",0)");

        beegroup
            .each(redrawDataPoints)
            .selectAll(".frame")
            .attr("x", -beeswarm.boxWidth/2)
            .attr("y", 0)
            .attr("width", beeswarm.boxWidth)
            .attr("height", beeswarm.svg.node().getBoundingClientRect().height
                -beeswarm.settings.paddingTop-beeswarm.settings.paddingBottom);

        beegroup
            .each(function(d){
                d3.select(this).selectAll("text.axisLabel").text(d);
            });


        let t1 = performance.now();
        console.log("TIme: "+(t1-t0));

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

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            let str = "M ";
            details = this.foreground
              .selectAll('circle[data-index="'+args[1]+'"]')
              .style("stroke", this.settings.highlightColor)
              .each(function(){
                  let circle = d3.select(this);
                  let t = utils.parseTranslate(this.parentElement);
                  str += (parseFloat(circle.attr("cx")) + t.x)
                    +","+circle.attr("cy") + " L "
              })
              .append(":title")
              .text(text);

            str = str.substring(0, str.length - 3);
            this.background
              .append("path")
              .attr("class", "lineHighlight")
              .style("fill", "none")
              .style("stroke", this.settings.highlightColor)
              .attr("d", str)
        }
    }

    highlight(...args){
        let highlighted;
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            let str = "M ";
            highlighted = this.foreground
                .selectAll('circle[data-index="'+args[1]+'"]')
                .style("stroke", this.settings.highlightColor)
                .each(function(){
                    let circle = d3.select(this);
                    let t = utils.parseTranslate(this.parentElement);
                    str += (parseFloat(circle.attr("cx")) + t.x)
                        +","+circle.attr("cy") + " L "
                });

            str = str.substring(0, str.length - 3);
            this.background
                .append("path")
                .attr("class", "lineHighlight")
                .style("fill", "none")
                .style("stroke", this.settings.highlightColor)
                .attr("d", str)
        }


        if(highlighted)
            super.highlight(highlighted.nodes(), args[0], args[1], args[2]);
    }
    removeHighlight(...args){
        if(args[1] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            let elem = this.foreground.selectAll('circle[data-index="'+args[1]+'"]').style("stroke", "none");
            this.background.selectAll(".lineHighlight").remove();
            super.removeHighlight(elem.node(), elem.datum(), args[1]);
        }
    }
    getHighlightElement(i){
        let str = "M ";
        this.foreground.selectAll('circle[data-index="'+i+'"]')
            .each(function(){
                let circle = d3.select(this);
                let t = utils.parseTranslate(this.parentElement);
                str += (parseFloat(circle.attr("cx")) + t.x)
                    +","+circle.attr("cy") + " L "
            });
        str = str.substring(0, str.length - 3);

        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");
        let path = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "path"))
            .attr("class", "lineHighlight")
            .style("fill", "none")
            .style("stroke", this.settings.highlightColor)
            .attr("d", str).node();
        group.appendChild(path);
        return group;
    }

    getXfunction(){
        let keys_filter;
        this.settings.filter ? keys_filter = this.settings.filter : keys_filter = this.keys;

        switch (this.pointXmethod){
            case "center":
                let binQuant = Math.floor(this.innerHeight/(this.settings.radius*2));
                this.binHeight = this.innerHeight/binQuant;
                let hist = {};
                this.initXPos ={};
                this.xPos ={};

                for(let k of this.keys_filter){
                    hist[k] = [];
                    this.initXPos[k] = [];
                    this.xPos[k] = [];
                    for(let i=0;i<=binQuant;i++)
                        hist[k][i] = 0;
                    for(let d of this.d)
                        hist[k][Math.floor(this.y[k](d[k])/this.binHeight)]++;


                    for(let i=0;i<hist[k].length;i++){
                        this.initXPos[k][i] = -hist[k][i]*this.settings.radius + this.settings.radius;
                        this.xPos[k][i] = this.initXPos[k][i];
                    }
                }
                return (d, k) => {
                    let i = Math.floor(this.y[k](d[k])/this.binHeight);
                    let xpos = this.xPos[k][i];
                    this.xPos[k][i] += this.settings.radius*2;
                    return xpos;
                };
        }
    }
    resetXfunction(){
        let keys_filter;
        this.settings.filter ? keys_filter = this.settings.filter : keys_filter = this.keys;

        for(let k of this.keys_filter)
            for (let i = 0; i < this.initXPos[k].length; i++)
                this.xPos[k][i] = this.initXPos[k][i];
    }

    filterByDimension(args) {
        this.settings.filter = args;
    }

}

module.exports = BeeswarmPlot;
