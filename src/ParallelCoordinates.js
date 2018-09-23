
let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");

class ParallelCoordinates extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "ParallelCoordinates";
        this.color = 'dimgray'
        this.lineFunction = (d) => {
            return d3.line()(this.keys.map((key) => {
                return [this.x(key), this.y[key](d[key])];
            }))
        };


        this.x = d3.scalePoint().range([
            0,
            this.svg.node().getBoundingClientRect().width-this.settings.paddingLeft-this.settings.paddingRight
        ], 0);

    }

    resize(){

        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        if(this.x)
            this.x.range([0, this.svg.node().getBoundingClientRect().width-pl-pr]);
        else
            this.x = d3.scalePoint().range([0, this.svg.node().getBoundingClientRect().width-pl-pr]);

        if(this.y) {
            for (let prop of this.keys) {
                //TODO: verificar como diferenciar entre scalePonint e Linear Contínuo.
                // if (typeof this.y[prop].padding === "function")
                this.y[prop].range([this.svg.node().getBoundingClientRect().height-pt-pb, 0]);
                // else
                //     this.y[prop].range([$(this.svg.node()).height() -pt-pb, 0]);
            }
        }
        console.log("redraw");
        this.redraw();

        this.linesCoords =  [];
        for(let d of this.d){
            this.linesCoords.push(this.keys.map((key) => {
                return [this.x(key), this.y[key](d[key])];
            }));
        }

        return this;
    }

    data(d){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        super.data(d);
        this.x.domain(this.keys);
        this.y = {};
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical") {
                this.y[k] = d3.scalePoint()

            }else if(this.domainType[k] === "Time"){
                //TODO: Melhorar a escala para o tempo.
                this.y[k] =  d3.scaleTime();
            } else {
                this.y[k] =  d3.scaleLinear();
            }
            this.y[k]
                .domain(this.domain[k])
                .range([this.svg.node().getBoundingClientRect().height-pt-pb, 0]);
        }

        this.linesCoords =  [];
        for(let d of this.d){
            this.linesCoords.push(this.keys.map((key) => {
                return [this.x(key), this.y[key](d[key])];
            }));
        }

        return this;
    }


    redraw(){

        if(!this.hasData)
            return;

        // let axis = d3.svg.axis().orient("left");
        //Atualiza os Eixos
        let y_axes = this.y;

        let self = this;

        let dataUpdate = this.foreground.selectAll("path.data");

        dataUpdate.exit().remove();

        this.foreground.selectAll("path.data")
            .data(this.d).enter()
            .append("path")
            .attr("class", "data")
            .attr("data-index", function(d,i){ return i; })
            .on("mouseover", function (d,i) { self.event.call("datamouseover", this, d, i); })
            .on("mouseout", function (d,i) { self.event.call("datamouseout", this, d, i); })
            .on("click", function (d,i) { self.event.call("dataclick", this, d, i); })

            .merge(dataUpdate)
            .attr("d", this.lineFunction)
            .style("stroke", this.color);



        let axisUpdate = this.overlay.selectAll(".axis").data(this.keys);

        axisUpdate.exit().remove();
        axisUpdate.selectAll("*").remove();

        let axisEnter = axisUpdate
            .enter()
            .append("g")
            .attr("class", "axis");

        axisEnter.merge(axisUpdate)
            .attr("transform", (d) => { return "translate(" + this.x(d) + ")"; })
            .each(function(d) { d3.select(this).call(d3.axisLeft(y_axes[d])); })

            .append("text")
            .style("text-anchor", "middle")
            .attr("class", "column_label")
            .attr("y", -9)
            .on('click', d => {
                this.focus = d;
                this.updateColors();
                console.log(d)
            })
            .text(function(d) { return d; })
            .style("fill", "black");

        this.axis = this.overlay.selectAll(".axis");

    }

    updateColors(){
        if(this.domainType[this.focus] !== 'Categorical') this.color = "dimgray"
        else {
            this.colorScale = d3.scaleOrdinal().domain(this.domain[this.focus]).range(
                ['firebrick', 'mediumseagreen', 'steelblue', 'gold', 'chocolate', 'magenta']
            )
            this.color = d => {
                let category = d[this.focus]
                return this.colorScale(category)
            }
        }
        this.redraw()
    }
    highlight(...args){
        let parallelcoordinates = this;

        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            this.foreground.selectAll('path.data[data-index="'+args[1]+'"]')
                .style("stroke", parallelcoordinates.settings.highlightColor)
                .style("stroke-width", "2")
                .each(function(){
                    // parallelcoordinates.overlay.node()
                    //     .appendChild(d3.select(this.cloneNode())
                    //         .attr("class", "lineHighlight")
                    //         .style("stroke", parallelcoordinates.settings.highlightColor)
                    //         .style("stroke-width", "2")
                    //         .style("fill", "none")
                    //         .node());
                    this.parentNode.appendChild(this);
                });
        }
        super.highlight.apply(this, args);
    }
    removeHighlight(...args){
        if(args[1] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            let dataSelect = this.foreground.selectAll('path.data[data-index="'+args[1]+'"]')
                .style("stroke", this.color)
                .style("stroke-width", "1");
            // this.overlay.selectAll(".lineHighlight").remove();
            super.removeHighlight(dataSelect.node(), dataSelect.datum(), args[1]);
            // this.event.apply("highlightend", dataSelect.node(), [dataSelect.datum(), args[1]]);
        }

    }
    getHighlightElement(i){
        let parallelcoordinates = this;
        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");
        this.foreground.selectAll('path.data[data-index="'+i+'"]').each(function(){
            group.appendChild(d3.select(this.cloneNode())
                .attr("class", "lineHighlight")
                .style("stroke", parallelcoordinates.settings.highlightColor)
                .style("stroke-width", "2")
                .style("fill", "none")
                .node());
        });
        return group;
    }

    select(selection){
        console.log("entrou");
        let result = [];
        if(Array.isArray(selection)){
            if(Array.isArray(selection[0])){
                console.log("aqui");
                for(let k=0; k<this.linesCoords.length; k++){
                    data_block: {
                        let polyLine = this.linesCoords[k];
                        for (let j = 0; j < polyLine.length - 1; j++) {
                            for (let i = 0; i < selection.length - 1; i++) {
                                this.foreground.append("line")
                                    .attr("x1", selection[i][0]-this.settings.paddingLeft)
                                    .attr("x2", selection[i + 1][0]-this.settings.paddingLeft)
                                    .attr("y1", selection[i][1]-this.settings.paddingTop)
                                    .attr("y2", selection[i + 1][1]-this.settings.paddingTop)
                                    .style("fill", "none")
                                    .style("stroke", "red");
                                let intersect = utils.lineIntersects(selection[i][0]-this.settings.paddingLeft,
                                    selection[i][1]-this.settings.paddingTop,
                                    selection[i + 1][0]-this.settings.paddingLeft,
                                    selection[i + 1][1]-this.settings.paddingTop,
                                    polyLine[j][0], polyLine[j][1],
                                    polyLine[j + 1][0], polyLine[j + 1][1]);
                                if (intersect) {
                                    result.push(
                                        this.foreground.select('path.data[data-index="' + k + '"]').node());
                                    break data_block;
                                }
                            }
                        }
                    }
                }
            }else if(typeof selection[0] === "number"){
                //seleção através de índices.
                for(let i of selection){
                    result.push(
                        this.foreground.select('path.data[data-index="'+i+'"]').node());
                }

            }else if(selection[0] instanceof SVGPathElement){
                for(let i of selection){
                    result.push(i);
                }
            }
        }
        console.log(result);
        super.select(result);
    }

    getSelected(){
        return this.selectionLayer.selectAll("*").nodes();
    }

}

module.exports = ParallelCoordinates;