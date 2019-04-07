let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class BarChart extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);

        this.name = "BarChart";
        this.x = d3.scaleBand().paddingInner(0).paddingOuter(0);
    }
    _putDefaultSettings(){
        this.settings.innerPadding = 20;
        this.settings.radius = 2;
        this.settings.paddingTop = 15;
        this.settings.paddingBottom = 10;
        this.settings.paddingLeft = 55;
        this.settings.paddingRight = 10;
        this.negativeMode = "disabled";
    }

    resize(){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.boxHeight = (svgBounds.height-pt-pb-ip*(this.keys.length-1))/this.keys.length;
        this.innerWidth = svgBounds.width-pl-pr;

        this.x.range([0, this.innerWidth]);

        for(let k of this.keys){
            let type=this.domainType[k];
            this.y[k].range([
                this.boxHeight-(type === "Categorical"?10:0),
                0
            ]);
        }

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

        this.boxHeight = (svgBounds.height-pt-pb-ip*(this.keys.length-1))/this.keys.length;
        this.innerWidth = svgBounds.width-pl-pr;

        let xdomain_array = [];
        for(let i=0;i<this.d.length;i++)
            xdomain_array.push(i);
        this.x.domain(xdomain_array)
            .range([0, this.innerWidth]);
        this.y = {};
        for(let k of this.keys){
            let type=this.domainType[k];
            if(type === "Categorical"){
                this.y[k] = d3.scalePoint();
            }else{
                this.y[k] = d3.scaleLinear();
            }
            this.y[k].domain(this.domain[k]).range([
                this.boxHeight-(type === "Categorical"?10:0),
                0
            ]);
        }
        return this;
    }


    redraw(){
        let t0 = performance.now();

        let ip = this.settings.innerPadding;
        let barchart = this;

        let group_join = this.foreground.selectAll("g.dataGroup")
            .data(this.keys, d=>d)
            .join(
                enter => {
                    let enter_result = enter.append("g")
                        .attr("class", "dataGroup");
                    enter_result.append("text")
                        .attr("class", "axisLabel")
                        .attr("x", 0)
                        .attr("y", -2)
                        .style("fill", "black")
                        .text(d=>d);
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
            .attr("transform", (d,i) => `translate(0,${i*this.boxHeight+i*ip})`);

        group_join.selectAll(".rule.top")
            .attr("x1","0").attr("y1","0")
            .attr("x2",barchart.innerWidth).attr("y2","0");
        group_join.selectAll(".rule.bottom")
            .attr("x1","0").attr("y1",barchart.boxHeight)
            .attr("x2",barchart.innerWidth).attr("y2",barchart.boxHeight);

        this.foreground.selectAll("g.dataGroup").each(function (key){
            let g = d3.select(this);
            g.selectAll(".data")
                .data(barchart.d)
                .join(
                    enter => {
                        let enter_result = enter.append("rect")
                            .attr("class", "data")
                            .style("stroke","none")
                            .attr("data-index", (d,i)=>i);
                        barchart._bindDataMouseEvents(enter_result);
                        return enter_result;
                    }
                )
                .style("fill", barchart.settings.color)
                .attr("x", (d,i) => barchart.x(i))
                .attr("y", (d) => barchart.y[key](d[key]))
                .attr("width", barchart.x.bandwidth())
                .attr("height", (d) => barchart.boxHeight - barchart.y[key](d[key]));

            g.selectAll("g.y.axis").remove();
            g.append("g")
                .attr("class", "y axis")
                .call(d3.axisLeft(barchart.y[key]).ticks(6));


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
            details = this.foreground.selectAll(`.data[data-index="${args[1]}"]`)
              .style("stroke", this.settings.highlightColor)
              .style("stroke-width", "2")
              .each(function(){
                  this.parentNode.appendChild(this);
              })
              .append(":title")
              .text(text);
        }
        n
    }

    highlight(...args){
        let highlighted;
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
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
            if(dataSelect.nodes().length > 0)
                super.removeHighlight(dataSelect.node(), dataSelect.datum(), args[1]);
        }
    }
    getHighlightElement(i){
        let histogram = this;
        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");

        this.foreground.selectAll('rect[data-index="'+i+'"]').each(function(){
            let t = utils.parseTranslate(this.parentElement);
            //let tp = utils.parseTranslate(this.parentElement.parentElement);
            let rect_select = d3.select(this);

            let rect = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "rect"))
                .attr("class", "rectHighlight")
                .style("fill", "none")
                .style("stroke", histogram.settings.highlightColor)
                .attr("stroke-width","2px")
                .attr("x", (+rect_select.attr("x"))+t.x)
                .attr("y", (+rect_select.attr("y"))+t.y)
                .attr("width", rect_select.attr("width"))
                .attr("height", rect_select.attr("height"));

            group.appendChild(rect.node());
        });

        return group;
    }


}

module.exports = BarChart;