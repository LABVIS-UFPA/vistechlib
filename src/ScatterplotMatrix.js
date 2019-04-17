
let d3 = require("d3");
let _ = require("underscore");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class ScatterplotMatrix extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "ScatterplotMatrix";
    }

    _putDefaultSettings(){
        this.settings.innerPadding = 8;
        this.settings.paddingRight = 20;
    }

    resize(){
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let ip = this.settings.innerPadding;
        //TODO: substituir essa chamada de método por: this.visContentWidth;
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.cellWidth = (svgBounds.width-pl-pr-ip*(this.keys.length-1))/this.keys.length;
        this.cellHeight = (svgBounds.height-pt-pb-ip*(this.keys.length-1))/this.keys.length;

        for(let k of this.keys){
            // if(this.domainType[k] === "Categorical"){
            //     this.x[k].rangePoints([0, this.cellWidth], 0);
            //     this.y[k].rangePoints([0, this.cellHeight], 0);
            // }else{
            this.x[k].range([0, this.cellWidth]);
            this.y[k].range([this.cellHeight, 0]);
            // }
        }
        // console.log("redraw");
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

        this.cellWidth = (svgBounds.width-pl-pr-ip*(this.keys.length-1))/this.keys.length;
        this.cellHeight = (svgBounds.height-pt-pb-ip*(this.keys.length-1))/this.keys.length;

        this.x = {};
        this.y = {};
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
                this.x[k] = d3.scalePoint()
                    .domain(this.domain[k])
                    .range([0, this.cellWidth]);
                this.y[k] = d3.scalePoint()
                    .domain(this.domain[k])
                    .range([0, this.cellHeight]);
            }else{
                this.x[k] =  d3.scaleLinear()
                    .domain(this.domain[k])
                    .range([0, this.cellWidth]);
                this.y[k] =  d3.scaleLinear()
                    .domain(this.domain[k])
                    .range([this.cellHeight, 0]);
            }
        }
        return this;
    }


    redraw(){

        //Atualiza os Eixos
        let y_axes = this.y;

        let crossed = ScatterplotMatrix.cross(this.keys, this.keys);

        let scatterplot = this;

        function redrawDataPoints(k) {

            let cell = d3.select(this);


            let dataEnter = cell.selectAll("circle.data")
                .data(scatterplot.d).enter()
                .append("circle")
                .attr("class", "data")
                .attr("data-index", function(d,i){ return i; })
                .attr("data-col", k.x)
                .attr("data-row", k.y)
                .attr("cx", function(d) { return scatterplot.x[k.x](d[k.x]); })
                .attr("cy", function(d) { return scatterplot.y[k.y](d[k.y]); })
                .attr("r", 2)
                .style("fill", scatterplot.settings.color)
                .style("fill-opacity", ".7");

            scatterplot._bindDataMouseEvents(dataEnter);

            cell.selectAll("circle.data")
                .data(scatterplot.d)
                .attr("cx", function(d) { return scatterplot.x[k.x](d[k.x]); })
                .attr("cy", function(d) { return scatterplot.y[k.y](d[k.y]); })
                .style("fill", scatterplot.settings.color);
            cell.selectAll("circle.data")
                .data(scatterplot.d).exit().remove();

        }

        let scatterGroups = this.foreground.selectAll("g.cellGroup").data(crossed);


        scatterGroups.exit().remove();

        scatterGroups
            .attr("transform", (d) => {
                return "translate(" +
                    d.i * (this.cellWidth+this.settings.innerPadding)
                    + "," + d.j * (this.cellHeight+this.settings.innerPadding) + ")";
            })
            .each(redrawDataPoints);

        let scatterGroupEnter = scatterGroups.enter()
            .append("g")
            .attr("class", "cellGroup")
            .attr("transform", (d) => {
                return "translate(" +
                    d.i * (this.cellWidth+this.settings.innerPadding)
                    + "," + d.j * (this.cellHeight+this.settings.innerPadding) + ")";
            })
            .each(redrawDataPoints);


        scatterGroupEnter.append("rect")
            .attr("class", "frame")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", scatterplot.cellWidth)
            .attr("height", scatterplot.cellHeight)
            .style("fill", "none")
            .style("stroke", "#aaa");

        scatterGroups
            .selectAll("rect.frame")
            .attr("width", scatterplot.cellWidth)
            .attr("height", scatterplot.cellHeight);

        scatterGroupEnter
            .filter(function(d) { return d.i === d.j; })
            .append("text")
            .attr("class", "axisLabel")
            .style("fill", "black")
            .attr("x", scatterplot.settings.innerPadding)
            .attr("y", scatterplot.settings.innerPadding)
            .attr("dy", ".71em")
            .text(function(d) { return d.x; });
        scatterGroups
            .selectAll("text.axisLabel")
            .text(function(d) { return d.x; });


        // this.foreground.selectAll("g.cellGroup").selectAll("text.axisLabel").remove();
        // this.foreground.selectAll("g.cellGroup")
        //     .filter(function(d) { return d.i === d.j; })
        //     .append("text")
        //     .attr("class", "axisLabel")
        //     .attr("x", scatterplot.settings.innerPadding)
        //     .attr("y", scatterplot.settings.innerPadding)
        //     .attr("dy", ".71em")
        //     .text(function(d) { return d.x; });

        this.foreground.selectAll(".x.axis").remove();
        this.foreground.selectAll(".x.axis")
            .data(this.keys)
            .enter().append("g")
            .attr("class", "x axis")
            .attr("transform", (d, i) => { return "translate("
                + i * (this.cellWidth+this.settings.innerPadding)
                + "," + (this.svg.node().getBoundingClientRect().height -this.settings.paddingBottom-this.settings.paddingTop) +")"; })
            .each(function(d) {
                d3.select(this).call(d3.axisBottom(scatterplot.x[d]).ticks(6));
            });

        this.foreground.selectAll(".y.axis").remove();
        this.foreground.selectAll(".y.axis")
            .data(this.keys)
            .enter().append("g")
            .attr("class", "y axis")
            .attr("transform", (d, i) => { return "translate(0," + i * (this.cellHeight+this.settings.innerPadding) + ")"; })
            .each(function(d) {
                d3.select(this).call(d3.axisLeft(scatterplot.y[d]).ticks(6));
            });

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
        if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            let strObj = {}, isFirst = {};
            for(let k of this.keys){
                strObj[k] = "M ";
                isFirst[k] = true;
            }

            details = this.foreground
              .selectAll('circle.data[data-index="'+args[1]+'"]')
              .style("stroke", this.settings.highlightColor)
              .each(function(){
                  let circle = d3.select(this);
                  let t = utils.parseTranslate(this.parentElement);
                  if(isFirst[circle.attr("data-row")]){
                      strObj[circle.attr("data-row")] +=
                        (parseFloat(circle.attr("cx")) + t.x)
                        +" "+(parseFloat(circle.attr("cy")) + t.y);
                      isFirst[circle.attr("data-row")] = false;
                  }else{
                      strObj[circle.attr("data-row")] += " Q "+
                        + t.x+ " " + t.y
                        + " , " + (parseFloat(circle.attr("cx")) + t.x)
                        + " " +(parseFloat(circle.attr("cy")) + t.y);
                  }


              })
              .append(":title")
              .text(text);

            this.background
              .selectAll("path.lineHighlight")
              .data(_.values(strObj)).enter()
              .append("path")
              .attr("class", "lineHighlight")
              .attr("d", function(d) { return d; })
              .style("fill", "none")
              .style("stroke", this.settings.highlightColor);
        }
       
    }
    
    highlight(...args){

        let highlighted;

        if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            let strObj = {}, isFirst = {};
            for(let k of this.keys){
                strObj[k] = "M ";
                isFirst[k] = true;
            }

            highlighted = this.foreground
                .selectAll('circle.data[data-index="'+args[1]+'"]')
                .style("stroke", this.settings.highlightColor)
                .each(function(){
                    let circle = d3.select(this);
                    let t = utils.parseTranslate(this.parentElement);
                    if(isFirst[circle.attr("data-row")]){
                        strObj[circle.attr("data-row")] +=
                            (parseFloat(circle.attr("cx")) + t.x)
                            +" "+(parseFloat(circle.attr("cy")) + t.y);
                        isFirst[circle.attr("data-row")] = false;
                    }else{
                        strObj[circle.attr("data-row")] += " Q "+
                            + t.x+ " " + t.y
                            + " , " + (parseFloat(circle.attr("cx")) + t.x)
                            + " " +(parseFloat(circle.attr("cy")) + t.y);
                    }


                });

            this.background
                .selectAll("path.lineHighlight")
                .data(_.values(strObj)).enter()
                .append("path")
                .attr("class", "lineHighlight")
                .attr("d", function(d) { return d; })
                .style("fill", "none")
                .style("stroke", this.settings.highlightColor);
        }
        if(highlighted)
            super.highlight(highlighted.nodes(), args[0], args[1], args[2]);
    }
    removeHighlight(...args){
        if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            let elem = this.foreground.selectAll('circle.data[data-index="'+args[1]+'"]').style("stroke", "none");
            this.background.selectAll(".lineHighlight").remove();
            super.removeHighlight(elem.node(), elem.datum(), args[1]);
        }
    }
    getHighlightElement(i){
        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");
        let strObj = {}, isFirst = {};
        for(let k of this.keys){
            strObj[k] = "M ";
            isFirst[k] = true;
        }

        this.foreground.selectAll('circle.data[data-index="'+i+'"]')
            .each(function(){
                let circle = d3.select(this);
                let t = utils.parseTranslate(this.parentElement);
                if(isFirst[circle.attr("data-row")]){
                    strObj[circle.attr("data-row")] +=
                        (parseFloat(circle.attr("cx")) + t.x)
                        +" "+(parseFloat(circle.attr("cy")) + t.y);
                    isFirst[circle.attr("data-row")] = false;
                }else{
                    strObj[circle.attr("data-row")] += " Q "+
                        + t.x+ " " + t.y
                        + " , " + (parseFloat(circle.attr("cx")) + t.x)
                        + " " +(parseFloat(circle.attr("cy")) + t.y);
                }


            });

        for(let d of _.values(strObj)){
            let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            d3.select(path)
                .attr("class", "lineHighlight")
                .style("fill", "none")
                .style("stroke", this.settings.highlightColor)
                .attr("d", d);
            group.appendChild(path);
        }
        return group;
    }

    static cross(a, b) {
        let c = [], n = a.length, m = b.length, i, j;
        for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
        return c;
    }

}


module.exports = ScatterplotMatrix;