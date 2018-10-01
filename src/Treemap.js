let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");




class Treemap extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        //this.settings.radius = settings? settings.radius || 2 : 2;
        this.name = "Treemap";
        this.settings.labelVAlign = settings ? settings.labelVAlign || "top" : "top";
        this.settings.labelHAlign = settings ? settings.labelHAlign || "left" : "left";
        this.settings.paddingTopHierarchies = settings ? settings.paddingTopHierarchies || 15 : 15;
        this.settings.paddingBottomHierarchies = settings ? settings.paddingBottomHierarchies || 2 : 2;
        this.settings.paddingLeftHierarchies = settings ? settings.paddingLeftHierarchies || 2 : 2;
        this.settings.paddingRightHierarchies = settings ? settings.paddingRightHierarchies || 2 : 2;
    }

    resize(){
        _makeHierarchy.call(this, this.d_h);

        this.redraw();
        return this;
    }

    data(d){

        super.data(d);


        if(this.settings.hierarchies){
            _hierarchy.call(this, this.settings.hierarchies);
        }else{
            let root = {name:"root", children: d};
            this.d_h = d3.hierarchy(root).count();
        }

        _makeHierarchy.call(this, this.d_h);


        this.d_parents = [];
        this.d_h.each((d) => {
            if(d.height !== 0)
                this.d_parents.push(d);
        });
    }


    redraw(){


        //let t0 = performance.now();



        let updateParents = this.foreground.selectAll(".data-parent").data(this.d_parents);
        updateParents.exit().remove();
        let enterParents = updateParents.enter().append("rect")
            .attr("class", "data-parent")
            .style("fill", "gray")
            .style("stroke", "black")
            .style("stroke-width", "0.5px");

        enterParents.merge(updateParents)
            .attr("x", (d)=>{return d.x0;})
            .attr("y", (d)=>{return d.y0;})
            .attr("width", (d)=>{return d.x1 - d.x0;})
            .attr("height", (d)=>{return d.y1 - d.y0;});



        let updateSelection = this.foreground.selectAll(".data").data(this.d_h.leaves());
        updateSelection.exit().remove();

        let treemap = this;

        let enterSelection = updateSelection.enter().append("rect")
            .attr("class", "data")
            .attr("data-index", function(d, i){ return i; })
            .style("fill", this.settings.color)
            .style("stroke", "black")
            .style("stroke-width", "0.5px")

            .on("mouseover", function (d,i) { treemap.event.call("datamouseover", this, d,i); })
            .on("mouseout", function (d,i) { treemap.event.call("datamouseout", this, d,i); })
            .on("click", function (d,i) { treemap.event.call("dataclick", this, d,i); });

        enterSelection.merge(updateSelection)
            .attr("x", (d)=>{return d.x0;})
            .attr("y", (d)=>{return d.y0;})
            .attr("width", (d)=>{return d.x1 - d.x0;})
            .attr("height", (d)=>{return d.y1 - d.y0;});


        let t1 = performance.now();
        //console.log("TIme: "+(t1-t0));

        if(this.settings.label) {
            console.log(this.settings.label);
            _setLabel.call(this, this.settings.label);
        }

        return this;
    }

    highlight(...args){
        let dataItens = this.d_h.leaves();
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < dataItens.length){
            let d = dataItens[args[1]];
            this.selectionLayer.selectAll("rect.data-highlight").remove();
            this.selectionLayer.append("rect")
                .attr("class", "data-highlight")
                .attr("x", d.x0)
                .attr("y", d.y0)
                .attr("width", d.x1 - d.x0)
                .attr("height", d.y1 - d.y0)
                .style("fill", "none")
                .style("stroke", this.settings.highlightColor);
        }
        super.highlight.apply(this, args);
    }
    removeHighlight(...args){
        if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            this.selectionLayer.selectAll("rect.data-highlight").remove();
            super.removeHighlight.apply(this, this.d[args[1]], args[1]);
        }
    }
    getHighlightElement(i){
        let d = this.d_h.children[i];

        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");
        let path = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "rect"))
            .attr("class", "rectHighlight")
            .attr("x", d.x0)
            .attr("y", d.y0)
            .attr("width", d.x1 - d.x0)
            .attr("height", d.y1 - d.y0)
            .style("fill", "none")
            .style("stroke", this.settings.highlightColor);

        group.appendChild(path);
        return group;
    }

    setLabel(func){
        this.settings.label = func;
        return this;
    }

    hierarchy(attrs){
        this.settings.hierarchies = attrs;
        if(this.domain)
            _hierarchy.call(this, attrs);
        return this;
    }

}

let _hierarchy = function(attrs){

    console.log(attrs, this.domain);
    let group = (data, index) => {
        if(index >= attrs.length)
            return;

        let attr = attrs[index];
        console.log(attr, this.domain[attr]);
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
        this.d_h = d3.hierarchy(hie).count();
    }
};


let _setLabel = function(func){
    let treemap = this;
    let ha = this.settings.labelHAlign;
    let va = this.settings.labelVAlign;

    if(typeof func === "function"){
        this.foreground.selectAll(".dataLabel").remove();
        this.foreground.selectAll(".data").each(function(d, i){
            console.log(func(d.data,i), d.data);
            let text = treemap.foreground.append("text")
                .attr("class", "dataLabel")
                .text(func(d.data,i))
                .attr("x", ha === "left" ? d.x0 + 5 : (ha === "middle" ? d.x0 + (d.x1-d.x0)/2 : d.x1-5))
                .attr("y", va === "bottom" ? d.y1-5 : d.y0 + (d.y1-d.y0)/2)
                .attr("text-anchor", ha === "left" ? "start" : (ha === "middle" ? "middle" : "end"))
                .style("fill", "black")
                .style("font-family", "monospace");

            if(va === "top"){
                let h = text.node().getBoundingClientRect().height;
                text.attr("y", d.y0+h+5);
            }
        });
    }
};

let _makeHierarchy = function(obj){

    let svgBounds = this.svg.node().getBoundingClientRect();
    let pt = this.settings.paddingTop;
    let pb = this.settings.paddingBottom;
    let pl = this.settings.paddingLeft;
    let pr = this.settings.paddingRight;

    let pth = this.settings.paddingTopHierarchies;
    let pbh = this.settings.paddingBottomHierarchies;
    let plh = this.settings.paddingLeftHierarchies;
    let prh = this.settings.paddingRightHierarchies;


    d3.treemap()
        .paddingTop(pth).paddingLeft(plh).paddingBottom(pbh).paddingRight(prh)
        .size([svgBounds.width-pl-pr, svgBounds.height-pt-pb])(obj);
};


module.exports = Treemap;