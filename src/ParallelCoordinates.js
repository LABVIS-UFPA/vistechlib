
let d3 = require("d3");
let Visualization = require("./Visualization.js");
let sel = require("./selections/selections.js");
/**
 * @class
 * @description Parallel coordinates are a common way of visualizing high-dimensional geometry and analyzing multivariate data.

 To show a set of points in an n-dimensional space, a backdrop is drawn consisting of n parallel lines, typically vertical and equally spaced. A point in n-dimensional space is represented as a polyline with vertices on the parallel axes; the position of the vertex on the i-th axis corresponds to the i-th coordinate of the point.
 * @augments Visualization
 * */
class ParallelCoordinates extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "ParallelCoordinates";
        this.lineFunction = (d) => {
            return d3.line()(this.keys_filter.map((key) => {
               return [this.x(key), this.y[key](d[key])];
            }))
        };

        this.x = d3.scalePoint().range( [
            0,
            this.visContentWidth
        ], 0);

    }

    resize(){
        super.resize();

        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;

        if(this.settings.filter){
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }
        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;

        if(this.x)
            this.x.range([0, this.visContentWidth]);
        else
            this.x = d3.scalePoint().range([0, this.visContentWidth]);


        if(this.y) {
            for (let prop of this.keys_filter) {
                //TODO: verificar como diferenciar entre scalePonint e Linear Contínuo.
                // if (typeof this.y[prop].padding === "function")
                this.y[prop].range([this.visContentHeight, 0]);
                // else
                //     this.y[prop].range([$(this.svg.node()).height() -pt-pb, 0]);
            }
        }

        this.redraw();

        this.linesCoords =  [];
        for(let d of this.d){
            this.linesCoords.push(this.keys_filter.map((key) => {
                return [this.x(key), this.y[key](d[key])];
            }));
        }

        return this;
    }

    data(d){
        super.data(d);

        if(this.settings.filter){
            let arr = this.settings.filter;
            this.settings.filter = this.keys.filter(function (item) {
                return item != arr[arr.indexOf(item)];
            });
        }
        this.settings.filter ? this.keys_filter = this.settings.filter : this.keys_filter = this.keys;

        this.x.domain(this.keys_filter);
        this.y = {};
        for(let k of this.keys_filter){
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
                .range([this.visContentHeight, 0]);
        }

        this.linesCoords =  [];
        for(let d of this.keys_filter){
            this.linesCoords.push(this.keys_filter.map((key) => {
                return [this.x(key), this.y[key](d[key])];
            }));
        }

        return this;
    }


    redraw(){

        if(!this.hasData)
            return this;

        // let axis = d3.svg.axis().orient("left");
        //Atualiza os Eixos
        let y_axes = this.y;

        let self = this;

        let dataUpdate = this.foreground.selectAll("path.data").data(this.d);

        dataUpdate.exit().remove();

        let dataEnter = dataUpdate
            .enter()
            .append("path")
            .attr("class", "data")
            .style("stroke", this.settings.color)
            .style("fill", "none")
            .attr("data-index", (d,i)=>i);

        this._bindDataMouseEvents(dataEnter);

        dataEnter.merge(dataUpdate)
            .attr("d", this.lineFunction)
            .style("stroke", this.settings.color);



        let axisUpdate = this.overlay.selectAll(".axis").data(this.keys_filter);

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
            .on('click', function(d, i) {
                self.event.call("dimensiontitleclick", this, d, i);
            })
            .text(function(d) { return d; })
            .style("fill", "black");

        this.axis = this.overlay.selectAll(".axis");

        return super.redraw();
    }

    // updateColors(){
    //     if(this.domainType[this.focus] !== 'Categorical') this.color = "dimgray"
    //     else {
    //         this.colorScale = d3.scaleOrdinal().domain(this.domain[this.focus]).range(
    //             ['firebrick', 'mediumseagreen', 'steelblue', 'gold', 'chocolate', 'magenta']
    //         )
    //         this.color = d => {
    //             let category = d[this.focus]
    //             return this.colorScale(category)
    //         }
    //     }
    //     this.redraw()
    // }

    detail(...args){
        let obj =  Object.entries(args[0]);
        let text = "";
        for (let j = 0; j < args[2].length; j++) {
            for (let i = 0; i < obj.length; i++) {
                if(args[2][j]===obj[i][0]){
                    text+= obj[i][0]+" : "+ obj[i][1]+"\n";
                }
            }
        }

        let parallelcoordinates = this;
        let highlighted;
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            highlighted = this.foreground
              .selectAll('path.data[data-index="'+args[1]+'"]')
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
        let parallelcoordinates = this;

        let highlighted;
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            highlighted = this.foreground
                .selectAll('path.data[data-index="'+args[1]+'"]')
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
            let dataSelect = this.foreground.selectAll('path.data[data-index="'+args[1]+'"]')
                .style("stroke", this.settings.color)
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
        if(selection instanceof sel.Selection) {
            if(this.foreground.node().hasChildNodes()) {
                let child_list = this.foreground.node().childNodes;
                let selected = selection.select(child_list, sel.Selection.Type.STROKE);
                super.select(selected);
            }
        }
    }

    getSelected(){
        return this.selectionLayer.selectAll("*").nodes();
    }

    filterByDimension(args) {
        this.settings.filter = args;
    }

}

module.exports = ParallelCoordinates;
