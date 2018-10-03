let _ = require("underscore");
let d3 = require("d3");
let moment = require('moment');

class Visualization {

    constructor(parentElement, settings){
        //default configuration
        this.parentElement = parentElement;
        this.settings = {
            color: "#069",//"grey",//"#069",
            highlightColor: "#FF1122",//"#08E700",
            opacity: 1,
            size_type: "fit",//"absolute"
            width: 700,
            height: 300,
            paddingTop: 25,
            paddingLeft: 50,
            paddingRight: 50,
            paddingBottom: 30,
            autoresize: true
        };
        //sobreescreve as configurações padrão pelas configurações dadas por parâmetro.
        if(typeof settings === "object"){
            for(let p in this.settings){
                if(this.settings.hasOwnProperty(p) && settings.hasOwnProperty(p))
                    this.settings[p] = settings[p];
            }
        }

        this.autoresize = this.settings.autoresize;

        this.event = d3.dispatch("brush", "draw", "highlightstart", "highlightend",
            "datamouseover","datamouseout", "dataclick");

        let fit = this.settings.size_type === "fit";

        this.svg = d3.select(parentElement).style("overflow", "hidden")
            .append("svg")
            .attr("width", fit ? "100%" : this.settings.width)
            .attr("height", fit ? "100%" : this.settings.height);

        this.canvas = this.svg.append("g");
        this.background = this.canvas.append("g")
            .attr("class", "background")
            .attr("transform", "translate("+this.settings.paddingLeft+","+this.settings.paddingTop+")");

        this.foreground = this.canvas.append("g")
            .attr("class", "foreground")
            .attr("transform", "translate("+this.settings.paddingLeft+","+this.settings.paddingTop+")");

        this.selectionLayer = this.canvas.append("g")
            .attr("class", "selectionLayer")
            .attr("transform", "translate("+this.settings.paddingLeft+","+this.settings.paddingTop+")");

        this.overlay = this.canvas.append("g")
            .attr("class", "overlay")
            .attr("transform", "translate("+this.settings.paddingLeft+","+this.settings.paddingTop+")");

        this.annotations = this.canvas.append("g")
            .attr("class", "annotations")
            .attr("transform", "translate("+this.settings.paddingLeft+","+this.settings.paddingTop+")");

        this.parentElement.__vis__ = this;

        this.isHighlighting = false;

    }


    data(d){
        this.d = d;
        this.keys = [];
        this.domain = {};
        this.domainType = {};
        for(let k in this.d[0]){
            if(this.d[0].hasOwnProperty(k)){
                this.keys.push(k);
                if(isNaN(+this.d[0][k])) {
                    if(moment(this.d[0][k]).isValid()){
                        for(let i=0;i<this.d.length;i++) {
                            this.d[i][k] = moment(this.d[i][k]).toDate();
                        }
                        this.domainType[k] = "Time";
                        this.domain[k] = d3.extent(this.d, (obj) => {return obj[k];});
                    }else{
                        this.domain[k] = _.uniq(_.pluck(this.d, k));
                        this.domainType[k] = "Categorical";
                    }
                } else {
                    this.domain[k] =  d3.extent(this.d, (obj) => {return obj[k]});
                    this.domainType[k] = "Numeric";
                }
            }
        }
        this.hasData = true;
        return this;
    }

    resize(){
        return this;
    }

    redraw(){
        return this;
    }

    setColor(color){
        if(arguments.length === 0)
            return this.settings.color;
        this.settings.color = color;
        return this;
    }

    on(e, func) {
        this.event.on(e, func);
        return this;
    };

    highlight(...args){
        if(!this.isHighlighting){
            this.isHighlighting = true;
            this.event.apply("highlightstart", this, args);
        }
    }
    removeHighlight(elem, ...args){
        if(this.isHighlighting){
            this.isHighlighting = false;
            this.event.apply("highlightend", elem, args);
        }
    }
    getHighlightElement(i){

    }

    annotate(svgElement){
        this.annotations.node().appendChild(svgElement);
    }

    clearAnnotations(){
        this.annotations.selectAll("*").remove();
    }


    select(elems){
        if(elems[0] instanceof Node){
            for(let elem of elems){
                this.selectionLayer.node().appendChild(elem);
            }
            this.foreground.selectAll(".data").style("opacity", "0.2");
        }
    }
    removeSelect(){
        let elems = this.selectionLayer.selectAll(".data").nodes();
        for(let elem of elems){
            this.foreground.node().appendChild(elem);
        }
        this.foreground.selectAll(".data").style("opacity", "1");
    }
    getSelected(){
        return this.selectionLayer.selectAll("*").nodes();
    }

    set autoresize(isAutoResize){
        this.settings.autoresize = isAutoResize;
        window.onresize = isAutoResize ? () => {
            this.resize();
        } : undefined;
    }

    get autoresize(){
        return this.settings.autoresize;
    }

}

module.exports = Visualization;