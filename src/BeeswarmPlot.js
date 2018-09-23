let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class BeeswarmPlot extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.settings.innerPadding = settings? settings.innerPadding || 10 : 10;
        this.settings.radius = settings? settings.radius || 2 : 2;
        this.name = "BeeswarmPlot";

        this.x = d3.scalePoint()
    }

    resize(){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.boxWidth = (svgBounds.width-pl-pr-ip*(this.keys.length-1))/this.keys.length;
        this.innerHeight = svgBounds.height-pt-pb;

        this.x.range([this.boxWidth/2, svgBounds.width-pl-pr-this.boxWidth/2]);
        for(let k of this.keys){
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

    data(d){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        super.data(d);

        let svgBounds = this.svg.node().getBoundingClientRect();

        this.dByAxis = {};
        this.boxWidth = (svgBounds.width-pl-pr-ip*(this.keys.length-1))/this.keys.length;

        this.innerHeight = svgBounds.height-pt-pb;

        this.x.domain(this.keys)
            .range([ this.boxWidth/2, svgBounds.width-pl-pr-this.boxWidth/2]);
        this.y = {};
        for(let k of this.keys){
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

    }


    redraw(){


        let t0 = performance.now();

        let posWoutColl = (ccx, ccy, cy, dd, sign) => { return ccx + sign*Math.sqrt(dd - (ccy-cy)*(ccy-cy)); };

        //Atualiza os Eixos
        let beeswarm = this;


        function redrawDataPoints (k){
            beeswarm.resetXfunction();

            let dataSelection = d3.select(this)
                .selectAll("circle.dataPoint")
                .data(beeswarm.d);

            dataSelection.exit().remove();
            dataSelection.enter()
                .append("circle")
                .attr("class", "dataPoint")
                .attr("data-index", function(d, i){ return i; })
                .style("fill-opacity", ".6")
                .on("mouseover", function (d,i) { beeswarm.event.call("datamouseover", this, d,i); })
                .on("mouseout", function (d,i) { beeswarm.event.call("datamouseout", this, d,i); })
                .on("click", function (d,i) { beeswarm.event.call("dataclick", this, d,i); })

                .attr("cx", (d) => { return beeswarm.xPoints(d, k); })
                .attr("cy", (d) => { return beeswarm.yPoints(d, k); })
                .style("fill", beeswarm.settings.color)
                .attr("r", beeswarm.settings.radius);

            dataSelection
                .attr("cx", (d) => { return beeswarm.xPoints(d, k); })
                .attr("cy", (d) => { return beeswarm.yPoints(d, k); })
                .style("fill", beeswarm.settings.color);
        }

        console.log(this.keys);
        let beegroup = this.foreground.selectAll("g.beeSwarmGroup")
            .data(this.keys);

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
    }

    highlight(...args){
        let beeswarm = this;
        let pl = this.settings.paddingLeft;
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            let str = "M ";
            this.foreground.selectAll('circle[data-index="'+args[1]+'"]').style("stroke", this.settings.highlightColor)
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
        super.highlight.apply(this, args);
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
        switch (this.pointXmethod){
            case "center":
                let binQuant = Math.floor(this.innerHeight/(this.settings.radius*2));
                this.binHeight = this.innerHeight/binQuant;
                let hist = {};
                this.initXPos ={};
                this.xPos ={};

                for(let k of this.keys){
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
        for(let k of this.keys)
            for (let i = 0; i < this.initXPos[k].length; i++)
                this.xPos[k][i] = this.initXPos[k][i];
    }

}

module.exports = BeeswarmPlot;