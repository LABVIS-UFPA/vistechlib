let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class Sunbust extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "Sunbust";
    }
    
    _putDefaultSettings(){
        this.settings.labelVAlign = "top";
        this.settings.labelHAlign = "left";
        this.settings.paddingTop =0 ;
        this.settings.paddingBottom =0;
        this.settings.paddingLeft = 0;
        this.settings.paddingRight = 0;
    }

    resize(){
        _makeHierarchy.call(this, this.d_h);
        let svgBounds = this.svg.node().getBoundingClientRect();
        this.h =  Math.min(svgBounds.height,svgBounds.width);
        this.w = Math.min(svgBounds.height,svgBounds.width);
        this.r = Math.min(svgBounds.height,svgBounds.width)/2;

        this.redraw();
        return this;
    }

    data(d){

        super.data(d);

        let svgBounds = this.svg.node().getBoundingClientRect();

        this.w = Math.min(svgBounds.height,svgBounds.width);
        this.h =  Math.min(svgBounds.height,svgBounds.width);
        this.r = Math.min(this.w, this.h) / 2;

        if(this.settings.hierarchies){
            _hierarchy.call(this, this.settings.hierarchies);
        }else{
            let root = {name:"root", children: d};
            if(this.settings.size){
                let size = this.settings.size;
                this.d_h = d3.hierarchy(root).sum(function(d) {return d[size]}).sort(function(a, b) { return b.height - a.height || b.value - a.value; });


            }else{
                this.d_h = d3.hierarchy(root).count();
            }
        }
        _makeHierarchy.call(this, this.d_h);


        this.d_parents = [];
        this.d_h.each((d) => {
            if(d.height !== 0)
                this.d_parents.push(d);
        });
    }

    redraw(){

        let sunbust = this;

        let radius = this.w/ 2;

        let svgBounds = this.svg.node().getBoundingClientRect();
        this.foreground.selectAll("#sun").remove();

        let Parens = this.foreground
            .append("g")
            .attr("id","sun")
            .attr("transform", "translate(" + svgBounds.width/ 2 + "," + svgBounds.height/ 2 + ")");

        let upParents = Parens
            .selectAll(".g")
            .data(sunbust.d_h.descendants().filter(d => d.depth));

        let arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        upParents.exit().remove();
        let enterParents = upParents.enter()
            .append("g")
            .attr("class", "data");

        let format = d3.format(",d");

        let ArcEnter = enterParents.append("path")
            .attr("d", arc)
            .attr("class", "data")
            .attr("data-index", function(d, i){return i; })
            .style("fill",  sunbust.settings.color )
            .style("stroke", "white")
            .style("stroke-width", "1px")
            .append("title");
            // .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);
            // .attr('id', d=>d.data.name);


        let letterEnter =  d3.select("#sun").append("g")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .selectAll("text")
            .data(sunbust.d_h.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
            .enter().append("text")
            .attr("transform", function(d) {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2;
                return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            })
            .attr("dy", "0.35em")
            .text(d => d.data.name);

        return this;
    }

    highlight(...args){

    }

    removeHighlight(...args){

    }
    getHighlightElement(i){

    }

    select(selection){
        if(Array.isArray(selection)){
            //selection[0]
        }
    }

    setSize(attrs){
        this.settings.size = attrs;
    }

    hierarchy(attrs){
        this.settings.hierarchies = attrs;
        if(this.domain)
            _hierarchy.call(this, attrs);
        return this;
    }

    // setLabel(func){
    //     this.settings.label = func;
    //     return this;
    // }

}

let _hierarchy = function(attrs){
    let size = this.settings.size;
    let group = (data, index) => {
        if(index >= attrs.length)
            return;

        let attr = attrs[index];
        for(let d of this.domain[attr]){
            let child = {name: d, children: []};
            data.children.push(child);
            group(child, index+1);
        }
    };

    let hie = {name: "root", children:[]};
    if(attrs && attrs.length > 0){
        group(hie, 0);

        for(let d of this.d){
            let aux = hie;
            for(let attr of attrs){
                for(let c of aux.children){
                    if(c.name === d[attr]){
                        aux = c;
                        break;
                    }
                }
            }
            aux.children.push(d);
        }
        if(size){
            this.d_h = d3.hierarchy(hie).sum(function(d) {return d[size]}).sort(function(a, b) { return b.height - a.height || b.value - a.value; });;
        }else{
            this.d_h = d3.hierarchy(hie).count();
        }

    }
};

// let _setLabel = function(func){
// };

let _makeHierarchy = function(obj){
    let svgBounds = this.svg.node().getBoundingClientRect();

    let radius = Math.min(svgBounds.height,svgBounds.width)/ 2;
    d3.partition()
        .size([2 * Math.PI, radius])
        (obj);

};


module.exports = Sunbust;