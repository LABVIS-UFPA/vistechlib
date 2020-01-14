let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");

/**
 * @class
 * @description Circle Packing is a method to visualize large amounts of hierarchically structured data. Tangent circles represent brother nodes at the same level; to visualize the hierarchy, all children of a node are packed into that node (and thus determine its size).
 * @augments Visualization
 * */

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

        this.redraw();
        return this;
    }

    data(d){

        super.data(d);
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }
            if(this.domainType[k] === "Numeric"){
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

        let root = {_name_:"root", children: d};
        if(this.settings.hierarchies){
            _hierarchy.call(this, this.settings.hierarchies);
        }else{
            if(this.settings.size){
                let size = this.settings.size;
                this.d_h = d3.hierarchy(root).sum(function(d) {return d[size]}).sort(function(a, b) { return b.height - a.height || b.height - a.height; });
                _hierarchy.call(this, this.settings.hierarchies);
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

            this.background
                .attr("transform",`translate(${width/2},${height/2})`)
                .attr("width",svgBounds.width)
                .attr("height",svgBounds.height)
                .style("background", color(0))
                .style("cursor", "pointer")

            this.background.selectAll('.circlePacking').remove();


            const node = this.background.append("g")
                .attr("class","circlePacking")
                .selectAll("circle")
                .data(this.d_parents)
                .join("circle")
                .attr('class','data-parent')
                .attr("fill", d =>color(d.depth))

      //this._bindDataMouseEvents(node, "ancestor");

        //this.foreground.selectAll(".data").exit().remove();
        let updateSelection = this.foreground.selectAll(".data")
            .data(this.d_h.leaves());
        updateSelection.exit().remove();

        let enterSelection = updateSelection.enter().append("circle")
            .attr("class", "data")
            .attr("data-index", function(d, i){return i; })
            .style("stroke", "black")
            .style("stroke-width", "0.5px");

        this._bindDataMouseEvents(enterSelection);

        let v = [root.x, root.y, root.r * 2]
        const r =  Math.min(svgBounds.height,svgBounds.width);
        const k = r / v[2];

        enterSelection.merge(updateSelection)
            .attr('parent', d=>d.parent.data._name_)
            .style("fill", this.settings.color)
            .attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`)
            .attr("r", d => d.r * k);

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
               .text(d => d.data._name_);


            zoomTo([root.x, root.y, root.r * 2]);

            function zoomTo(v) {
                const r =  Math.min(svgBounds.height,svgBounds.width);
                const k = r / v[2];

                label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
                node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
                node.attr("r", d => d.r * k);
                enterSelection.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
                enterSelection.attr("r", d => d.r * k);
            }


            this._bindDataMouseEvents(enterSelection);
            return super.redraw();

    }

    detail(...args){

    }

    highlight(...args){

        console.log(args[0]);
        console.log(args[1]);


        this.highlightLayer.append("circle")
            .attr('class','data-highlight')
              .attr("cx", args[0].x-10)
              .attr("cy",  args[0].y)
              .attr("r",  args[0].r)
              .style("fill", "none")
              .style("stroke", this.settings.highlightColor);

        //return group;

    }


    removeHighlight(...args){
        let remove =this.highlightLayer.selectAll('.data-highlight').remove();

        return remove;

    }

    getHighlightElement(i){
        let d = this.d_h.children[i];

        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");

        let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        d3.select(circle)
            .attr("class", "circleHighlight")
            .attr("cx", d.x-10)
            .attr("cy", d.y)
            .attr("r", d.r)
            .style("fill", "none")
            .style("stroke", this.settings.highlightColor)

        group.appendChild(circle);
        return group;

    }


    select(selection){

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
            let child = {_name_: d, children: []};
            data.children.push(child);
            group(child, index+1);
        }
    };

    let hie = {_name_: "root", children:[]};
    if(attrs && attrs.length > 0){
        group(hie, 0);

        for(let d of this.d){
            let aux = hie;
            for(let attr of attrs){
                for(let c of aux.children){
                    if(c._name_ === d[attr]){
                        aux = c;
                        break;
                    }
                }
            }
            aux.children.push(d);
        }
        if(size){
            this.d_h = d3.hierarchy(hie).sum(function(d) {return d[size]}).sort(function(a, b) { return b.height - a.height || b.value - a.value; });
        }else{
            for(let k of this.keys){
                if(this.domainType[k] === "Numeric"){
                    size = k;
                    break;
                }
            }
            this.d_h = d3.hierarchy(hie).sum(function(d) {return d[size]}).sort(function(a, b) { return b.height - a.height || b.value - a.value; });

        }

    }
};

// let _setLabel = function(func){
// };

let _makeHierarchy = function(obj){
    let svgBounds = this.svg.node().getBoundingClientRect();

    d3.pack()
        .size([svgBounds.width,svgBounds.height])
        (obj)
};


module.exports = CirclePacking;
