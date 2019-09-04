let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class CirclePacking extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "CirclePacking";
    }

    _putDefaultSettings(){
        this.settings.labelVAlign = "top";
        this.settings.labelHAlign = "left";
        this.settings.paddingTop =0 ;
        this.settings.paddingBottom =40;
        this.settings.paddingLeft = 10;
        this.settings.paddingRight = 10;
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
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }
            if(this.domainType[k] === "Numeric"){
                console.log(this.domain[k]);
                let  values= [];
                for (let i = 0; i <d.length ; i++) {
                    values.push(d[i][k]);
                }
                values = [...new Set(values)];
                this.domain[k] = values;
            }
            if(this.domainType[k] === "Time"){

            }
        }

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
        let circlePacking = this;

        let svgBounds = this.svg.node().getBoundingClientRect();
        let svg = this.foreground;


        let color = d3.scaleLinear()
            .domain([0, 5])
            .range(["white", "grey"])
            .interpolate(d3.interpolateHcl)

        const root =this.d_h;

        let width = svgBounds.width;
        let height =svgBounds.height;

        svg
            .attr("transform",`translate(${width/2},${height/2})`)
            .attr("width",svgBounds.width)
            .attr("height",svgBounds.height)
            .style("background", color(0))
            .style("cursor", "pointer")


        d3.selectAll('.circlePacking').remove();

        const node = svg.append("g")
            .attr("class","circlePacking")
            .selectAll("circle")
            .data(root.descendants())
            .join("circle")
            .attr('class',d=>d.children?'father':'data')
            .attr("fill", d => d.children ? color(d.depth) :this.settings.color)
            .attr("data-index", function(d, i){return i; })
        //     .style("fill", this.settings.color)
        //     .style("stroke", "black")
        //   .attr("pointer-events", d => !d.children ? "none" : null)
        //.on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
        //.on("mouseout", function() { d3.select(this).attr("stroke", null); })
        //.on("click", d => focus !== d && (zoom(d), d3.event.stopPropagation()));


        // let enterSelection = node.enter().append("circle")
        //     .attr("class", "data")
        //     .attr("data-index", function(d, i){return i; })
        //     //.attr("parent",d=>d.)
        //     .style("fill", this.settings.color)
        //     .style("stroke", "black")
        //     .style("stroke-width", "0.5px");

        const removelabel = svg.select('.labels').remove();
        const label = svg.append("g")
            .attr('class','labels')
            .style("font", "10px sans-serif")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .selectAll("text")
            .data(root.descendants().slice(1))
            .join("text")
            .style("fill-opacity", d => d.parent === root ? 1 : 0)
            .style("display", d => d.parent === root ? "inline" : "none")
          //  .text(d => d.data.data.name);


        zoomTo([root.x, root.y, root.r * 2]);


        function zoomTo(v) {
            const k = (svgBounds.height-40) / v[2];

            let view = v;

            label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("r", d => d.r * k);
        }


        this._bindDataMouseEvents(node);
        return super.redraw();
    }

    detail(...args){

    }

    highlight(...args){

    }

    removeHighlight(...args){

    }

    getHighlightElement(i){

    }


    select(selection){

    }

    setSize(attrs){

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

    d3.pack()
        .size([svgBounds.width,svgBounds.height])
       // .padding(1)
     //  (d3.hierarchy(obj)
       //     .sum(d => d.value)
    //        .sort((a, b) => b.value - a.value))
    (obj)
};


module.exports = CirclePacking;
