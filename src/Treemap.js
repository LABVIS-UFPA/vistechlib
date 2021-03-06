let d3 = require("d3");
let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");

/**
 * @class
 * @description The treemap extends Visualization and its methods and internal variables.  
 *  A treemap is a visual method for displaying hierarchical data that uses nested rectangles to represent the branches of a tree diagram. Each rectangles has an area proportional to the amount of data it represents.
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
 */

class Treemap extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "Treemap";
    }

    _putDefaultSettings(){
        this.settings.labelVAlign = "top";
        this.settings.labelHAlign = "left";
        this.settings.paddingTopHierarchies = 15;
        this.settings.paddingBottomHierarchies = 2;
        this.settings.paddingLeftHierarchies = 2;
        this.settings.paddingRightHierarchies = 2;
        this.settings.paddingTop = this.settings.paddingBottom
            = this.settings.paddingLeft = this.settings.paddingRight = 20;
    }

 
    resize(){
        _makeHierarchy.call(this, this.d_h);

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

        if(this.settings.hierarchies){
            _hierarchy.call(this, this.settings.hierarchies);
        }else{
            let root = {_name_:"root", children: d};
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
        //let t0 = performance.now();
        let treemap = this;

        console.log("th",this.d_h);

        let updateParents = this.foreground
            .selectAll(".data-parent")
            .data(this.d_parents);


        updateParents.exit().remove();
        let enterParents = updateParents.enter()
            .append("g")
            .attr("class", "data-parent")
            .attr('id', d=>d.data._name_)

        ;

        let rectEnter = enterParents.append("rect")
            .style("fill", "gray")
            .style("stroke", "black")
            .style("stroke-width", "0.5px");



        treemap._bindDataMouseEvents(rectEnter, "ancestor");

        enterParents.append("text")
            .style("fill", "black")
            .style("font-family", "monospace");

        let mergeParents = enterParents.merge(updateParents)
            .attr("transform", (d)=>{return "translate("+d.x0+","+d.y0+")";});

        mergeParents.select("rect")
            .attr("width", (d)=>{return d.x1 - d.x0;})
            .attr("height", (d)=>{return d.y1 - d.y0;});

        mergeParents.select("text")
            .text((d)=>{return d.data._name_;})
            .attr("x", 2)
            .attr("y", function(){ return this.getBoundingClientRect().height - 3; });



        let updateSelection = this.foreground.selectAll(".data")
            .data(this.d_h.leaves());
        updateSelection.exit().remove();

        let enterSelection = updateSelection.enter().append("rect")
            .attr("class", "data")
            .attr("data-index", function(d, i){return i; })
            .attr("parent",d=>d._name_)
            .style("fill", this.settings.color)
            .style("stroke", "black")
            .style("stroke-width", "0.5px");

        this._bindDataMouseEvents(enterSelection);

        enterSelection.merge(updateSelection)
            .attr('parent', d=>d.parent.data._name_)
            .attr("x", (d)=>{return d.x0;})
            .attr("y", (d)=>{return d.y0;})
            .style("fill", this.settings.color)
            .attr("width", (d)=>{return d.x1 - d.x0;})
            .attr("height", (d)=>{return d.y1 - d.y0;});

        let foreground = this.foreground
        foreground.selectAll('rect.data').attr('parent', d=>d.parent.data._name_)
            .each(function(){
                let rect = d3.select(this)
                    .attr("x", (d)=>{return d.x0;})
                    .attr("y", (d)=>{return d.y0;}).remove()
                let parentName = rect.attr("parent")
                foreground.append(()=>
                    rect.node()


                )
            })


        if(this.settings.label) {
            console.log(this.settings.label);
            _setLabel.call(this, this.settings.label);
        }


        //let t1 = performance.now();
        //console.log("TIme: "+(t1-t0));
        return super.redraw();
    }

    detail(...args){
        let details;
        let dataItens = this.d_h.leaves();
        let obj =  Object.entries(args[0].data);
        let text = "";

        for (let j = 0; j < args[2].length; j++) {
          for (let i = 0; i < obj.length; i++) {
            if(args[2][j]===obj[i][0]){
              text+= obj[i][0]+" : "+ obj[i][1]+"\n";
            }
          }
        }

        if(args[0] instanceof SVGElement){
        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < dataItens.length){
            let d = dataItens[args[1]];
            this.annotations.selectAll("rect.data-details").remove();
            details = this.annotations.append("rect")
              .attr("class", "data-details")
              .attr("x", d.x0)
              .attr("y", d.y0)
              .attr("width", d.x1 - d.x0)
              .attr("height", d.y1 - d.y0)
              .style("fill","white")
              .attr("opacity",0.1)
              .style("stroke", this.settings.highlightColorColor)
              .append(":title")
              .text(text);

        }
    }

    highlight(...args){
        let highlighted;
        let dataItens = this.d_h.leaves();
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < dataItens.length){
            let d = dataItens[args[1]];
            this.highlightLayer.selectAll("rect.data-highlight").remove();
            highlighted = this.highlightLayer.append("rect")
                .attr("class", "data-highlight")
                .attr("x", d.x0)
                .attr("y", d.y0)
                .attr("width", d.x1 - d.x0)
                .attr("height", d.y1 - d.y0)
                .style("fill", "none")
                .style("stroke", this.settings.highlightColor);
        }
        if(highlighted)
            super.highlight(highlighted.nodes(), args[0], args[1], args[2]);
    }
    removeHighlight(...args){
        if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            this.highlightLayer.selectAll("rect.data-highlight").remove();
            super.removeHighlight(this.foreground
                    .select('rect.data[data-index="'+args[1]+'"]').node(),
                this.d[args[1]], args[1]);
        }
    }

    getHighlightElement(i){
        let d = this.d_h.children[i];

        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");

        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        d3.select(rect)
            .attr("class", "rectHighlight")
            .attr("x", d.x0)
            .attr("y", d.y0)
            .attr("width", d.x1 - d.x0)
            .attr("height", d.y1 - d.y0)
            .style("fill", "none")
            .style("stroke", this.settings.highlightColor);

        group.appendChild(rect);
        return group;
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

    setLabel(func){
        this.settings.label = func;
        return this;
    }

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

let _setLabel = function(func){
    let treemap = this;
    let ha = this.settings.labelHAlign;
    let va = this.settings.labelVAlign;

    if(typeof func === "function"){
        this.foreground.selectAll(".dataLabel").remove();
        this.foreground.selectAll(".data").each(function(d, i){
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
