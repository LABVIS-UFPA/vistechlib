// function (d) {
//     let colliding = true;
//     let cx = 0, cy = beeswarm.y[k](d[k]), ccx, ccy;
//     while(colliding){
//         let dd = 4*beeswarm.settings.radius*beeswarm.settings.radius;
//         colliding = false;
//         for(let col of circlesCollision){
//             if((col.cx-cx)*(col.cx-cx)+(col.cy-cy)*(col.cy-cy) < dd){
//                 ccx = col.cx; ccy = col.cy;
//                 colliding = true;
//                 break;
//             }
//         }
//         if(colliding){
//             cx = posWoutColl(ccx,ccy,cy,dd,1)+1;
//         }else{
//             circlesCollision.push({cx, cy});
//         }
//     }
//     return cx;
// }


// (d) => {
//     let cy = beeswarm.y[k](d[k]);
//     let r = this.settings.radius;
//     let colls = quadtree.getCollisions({
//         x1: 0,
//         y1: cy-r,
//         x2: this.boxWidth/2 - r*2,
//         y2: cy+r
//     });
//     console.log(colls.length);
//     let maxc = colls[0];
//     for(let i=0; i<colls.length; i++){
//         if(colls[i].cx > maxc.cx){
//             maxc = colls[i];
//         }
//     }
//     let dd = 4*r*r;
//     let cx = maxc ? posWoutColl(maxc.cx,maxc.cy,cy,dd,1)+1 : 0;
//     quadtree.insert({
//         x1: cx-r,
//         y1: cy-r,
//         x2: cx+r,
//         y2: cy+r
//     }, {cx,cy});
//     return cx;
// }


let d3 = require("d3");
let _ = require("underscore");

class Visualization {

    constructor(parentElement, settings){
        //default configuration
        this.parentElement = parentElement;
        console.log(this.parentElement);
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
            paddingBottom: 30
        };
        //sobreescreve as configurações padrão pelas configurações dadas por parâmetro.
        if(typeof settings === "object"){
            for(let p in this.settings){
                if(this.settings.hasOwnProperty(p) && settings.hasOwnProperty(p))
                    this.settings[p] = settings[p];
            }
        }


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
                    if(/^\d{1,2}(:\d{1,2}){1,2}(\s*[AaPp][Mm])?$/.test(this.d[0][k])){
                        for(let i=0;i<this.d.length;i++) {
                            this.d[i][k] = new Date(Date.parse(this.d[i][k]));
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
    removeHighlight(...args){
        if(this.isHighlighting){
            this.isHighlighting = false;
            this.event.apply("highlightend", this, args);
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

}


class ParallelCoordinates extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "ParallelCoordinates";

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

    }


    redraw(){

        if(!this.hasData)
            return;

        // let axis = d3.svg.axis().orient("left");
        //Atualiza os Eixos
        let y_axes = this.y;

        let self = this;


        this.foreground.selectAll("path.data")
            .data(this.d).enter()
            .append("path")
            .attr("class", "data")
            .attr("data-index", function(d,i){ return i; })
            .attr("d", this.lineFunction)
            .style("stroke", this.settings.color)
            .on("mouseover", function (d,i) { self.event.call("datamouseover", d, i); })
            .on("mouseout", function (d,i) { self.event.call("datamouseout", d, i); })
            .on("click", function (d,i) { self.event.call("dataclick", d, i); });
        this.foreground.selectAll("path.data")
            .data(this.d)
            .attr("d", this.lineFunction)
            .style("stroke", this.settings.color);
        this.foreground.selectAll("path.data")
            .data(this.d)
            .exit()
            .remove();

        this.overlay.selectAll(".axis")
            .data(this.keys)
            .exit().remove();
        this.axis = this.overlay.selectAll(".axis")
            .data(this.keys)
            .attr("transform", (d) => { return "translate(" + this.x(d) + ")"; })
            .each(function(d) { d3.select(this).call(d3.axisLeft(y_axes[d])); });
        this.axis.select("text.column_label")
            .text(function(d) { return d; });

        this.axis = this.overlay.selectAll(".axis")
            .data(this.keys)
            .enter()
            .append("g")
            .attr("class", "axis")
            .attr("transform", (d) => { return "translate(" + this.x(d) + ")"; })
            .each(function(d) { d3.select(this).call(d3.axisLeft(y_axes[d])); });

        // Add an axis and title.
        this.axis.append("text")
            .style("text-anchor", "middle")
            .attr("class", "column_label")
            .attr("y", -9)
            .text(function(d) { return d; });


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
            this.foreground.selectAll('path.data[data-index="'+args[1]+'"]')
                .style("stroke", this.settings.color)
                .style("stroke-width", "1");
            // this.overlay.selectAll(".lineHighlight").remove();
            this.event.apply("highlightend", null, args);
        }
        super.removeHighlight.apply(this, args);
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

}

class ParallelBundling extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.animation = true;
        this.clusterOn = 'all';
        this.colorScheme = ['firebrick', 'mediumseagreen', 'steelblue', 'gold', 'chocolate', 'magenta'];
        this.clusterColor = someCluster => {
            if (this.clusterTags.includes(someCluster)){
                return this.colorScheme[this.clusterTags.indexOf(someCluster)];
            } else {
                return 'dimgrey';
            }
        };

        let Path = require('d3-path').path;
        this.lineFunction = d => {
            let path = new Path();
            let x,y,x1,y1,x2,y2;
            let BOX1 = 1;
            let BOX2 = 20;
            let FACTOR = 10;
            let cluster = (this.clusterOn === 'all') ? 'all' : d[this.clusterOn];
            if (this.clusterOn === 'all') this.domain['all'] = ['all'];

            const isCategorical = someKey => this.domainType[someKey] === "Categorical";
            const map = (i, a, b, x, y) => {
                let scale = d3.scaleLinear().domain([a, b]).range([x, y]);
                return scale(i);
            };

            const keysExceptLast = this.keys.slice(0,-1);
            keysExceptLast.forEach((key, keyIndex)=> {
                const nextKey = this.keys[keyIndex + 1];


                const co_co = !isCategorical(key) && !isCategorical(nextKey);
                const co_ca = !isCategorical(key) && isCategorical(nextKey);
                const ca_co = isCategorical(key) && !isCategorical(nextKey);

                let displacement;
                if (isCategorical(nextKey)) {
                    let ordination;
                    if(!isCategorical(key)) {
                        ordination = this.sortedClusters[cluster][key].filter(entry => {
                            return entry[nextKey] === d[nextKey];
                        });
                    }
                    else {
                        ordination = this.clusters.find(c => c.key === cluster).values.filter(entry => {
                            return entry[nextKey] === d[nextKey];
                        })
                    }
                    const indexOfData = ordination.indexOf(d);
                    const quantityOfMembers = ordination.length;
                    const relativeIndexPositionOfd = quantityOfMembers - indexOfData;
                    let auxiliaryDisplacement = 0;

                    const createDisplacementScale = () => {
                        for (let tag of this.clusterTags) {
                            if (tag === cluster) break;
                            auxiliaryDisplacement += this.reservedSpaceInCategoricalAxes[tag][nextKey][d[nextKey]];
                        }
                        return d3.scaleLinear()
                            .domain([0,quantityOfMembers])
                            .range([auxiliaryDisplacement, auxiliaryDisplacement + this.reservedSpaceInCategoricalAxes[cluster][nextKey][d[nextKey]]]);

                    };

                    const displacementScale = createDisplacementScale();
                    this.verticalPositionDisplacementOnAxis = displacementScale(relativeIndexPositionOfd);
                    displacement = displacementScale(relativeIndexPositionOfd);
                };
                let quantityOfMembersInCluster = this.clusters.find(c => c.key === cluster).values.length;

                let location_in_array_thisKey = this.sortedClusters[cluster][key].indexOf(d);
                let keyFactor = map(location_in_array_thisKey, 0, quantityOfMembersInCluster, 1, -1) * FACTOR;

                let location_in_array_nextKey = this.sortedClusters[cluster][nextKey].indexOf(d);
                let nextKeyFactor = map(location_in_array_nextKey, 0, quantityOfMembersInCluster, 1, -1) * FACTOR;

                if (keyIndex === 0) { // Mover para o inicio
                    if (!isCategorical(key)) {
                        x = this.x(key);
                        y = this.y[key](d[key]);
                        path.moveTo(x, y);
                    }
                    else {
                        let ordination = this.sortedClusters[cluster][key].filter(entry => {
                            return entry[key] === d[key];
                        });
                        let indexOfd = ordination.indexOf(d);
                        let quantityOfMembers = ordination.length;
                        let relativeDisplacement = quantityOfMembers - indexOfd;
                        let sumOfReservedSpaces = 0;
                        for (let tag of this.clusterTags) {
                            if (tag === cluster) break;
                            sumOfReservedSpaces += this.reservedSpaceInCategoricalAxes[tag][key][d[key]];
                        }
                        let displacementScale = d3.scaleLinear()
                            .domain([0, quantityOfMembers])
                            .range([sumOfReservedSpaces, this.reservedSpaceInCategoricalAxes[cluster][key][d[key]] + sumOfReservedSpaces]);
                        let displacement = displacementScale(relativeDisplacement);

                        x = this.x(key);
                        y = this.y[key](d[key]) + displacement;
                        path.moveTo(x, y);
                    }
                }

                if (!isCategorical(key)) { // LINHA PARA BOX SE CO
                    x = this.x(key) + this.band(BOX1);
                    // y = this.y[key](data[key]);
                    path.lineTo(x, y);
                }
                else { // LINHA PARA BOX SE CA
                    x = this.x(key) + this.band(BOX1);
                    // y = this.y[key](data[key]);
                    path.lineTo(x, y);
                }

                // Bezier para a banda 25 se co
                if (!isCategorical(key)) {
                    x1 = this.x(key) + this.band(BOX1) / 2 + this.band(10);
                    y1 = this.y[key](d[key]);
                    x2 = this.x(key) + this.band(BOX1) / 2;
                    y2 = this.y[key](this.means[key][cluster]) + keyFactor;
                    x = this.x(key) + this.band(25) + this.band(BOX1) / 2;
                    y = this.y[key](this.means[key][cluster]) + keyFactor;
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }

                // Cubica para banda 25 se ca
                else {
                    x1 = this.x(key) + this.band(BOX1) / 2 + this.band(10);
                    y1 = y;
                    x2 = this.x(key) + this.band(BOX1) / 2;
                    y2 = this.y[key](this.modes[key][cluster]) + keyFactor + this.axesSizesWithPadding[key] / 2;
                    x = this.x(key) + this.band(25) + this.band(BOX1) / 2;
                    y = this.y[key](this.modes[key][cluster]) + keyFactor + this.axesSizesWithPadding[key] / 2;
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }

                // Cubica para a banda 75 co-co
                if (co_co) {
                    x1 = this.x(key) + this.band(50);
                    y1 = this.y[key](this.means[key][cluster]) + keyFactor;
                    x2 = this.x(key) + this.band(50);
                    y2 = this.y[nextKey](this.means[nextKey][cluster]) + nextKeyFactor;
                    x = this.x(key) + this.band(75) - this.band(BOX1) / 2;
                    y = this.y[nextKey](this.means[nextKey][cluster]) + nextKeyFactor;
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }
                // Cubica para a banda 75 co-ca
                else if (co_ca) {
                    x1 = this.x(key) + this.band(50);
                    y1 = this.y[key](this.means[key][cluster]) + keyFactor;
                    x2 = this.x(key) + this.band(50);
                    y2 = this.y[nextKey](this.modes[nextKey][cluster]) + nextKeyFactor + this.axesSizesWithPadding[nextKey] / 2;
                    x = this.x(key) + this.band(75) - this.band(BOX1) / 2;
                    y = this.y[nextKey](this.modes[nextKey][cluster]) + nextKeyFactor + this.axesSizesWithPadding[nextKey] / 2;
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }
                // Cubica para banda 75 ca-co
                else if (ca_co) {
                    x1 = this.x(key) + this.band(50);
                    y1 = this.y[key](this.modes[key][cluster]) + keyFactor + this.axesSizesWithPadding[key] / 2;
                    x2 = this.x(key) + this.band(50);
                    y2 = this.y[nextKey](this.means[nextKey][cluster]) + nextKeyFactor;
                    x = this.x(key) + this.band(75) - this.band(BOX1) / 2;
                    y = this.y[nextKey](this.means[nextKey][cluster]) + nextKeyFactor;
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }
                // Cubica para banda 75 ca-ca
                else {
                    x1 = this.x(key) + this.band(50);
                    y1 = this.y[key](this.modes[key][cluster]) + keyFactor + this.axesSizesWithPadding[key] / 2;
                    x2 = this.x(key) + this.band(50);
                    y2 = this.y[nextKey](this.modes[nextKey][cluster]) + nextKeyFactor + this.axesSizesWithPadding[nextKey] / 2;
                    x = this.x(key) + this.band(75) - this.band(BOX1) / 2;
                    y = this.y[nextKey](this.modes[nextKey][cluster]) + nextKeyFactor + this.axesSizesWithPadding[nextKey] / 2;
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }

                // Quadratica para next BOX se co
                if (!isCategorical(nextKey)) {
                    x1 = this.x(nextKey) - this.band(BOX1) / 2;
                    y1 = this.y[nextKey](this.means[nextKey][cluster]) + nextKeyFactor;
                    x2 = this.x(nextKey) - this.band(BOX1) / 2 - this.band(10);
                    y2 = this.y[nextKey](d[nextKey]);
                    x = this.x(nextKey) - this.band(BOX1) / 2;
                    y = this.y[nextKey](d[nextKey]);
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }
                // Cubica para next this.band(BOX1) se ca
                else {
                    x1 = this.x(nextKey) - this.band(BOX1) / 2;
                    y1 = this.y[nextKey](this.modes[nextKey][cluster]) + nextKeyFactor + this.axesSizesWithPadding[nextKey] / 2;
                    x2 = this.x(nextKey) - this.band(BOX1) / 2 - this.band(10);
                    y2 = this.y[nextKey](d[nextKey]) + displacement;
                    x = this.x(nextKey) - this.band(BOX1) / 2;
                    y = this.y[nextKey](d[nextKey]) + displacement;
                    path.bezierCurveTo(x1, y1, x2, y2, x, y);
                }

                //Linha para next dimension se co
                if (!isCategorical(nextKey)) {
                    x = this.x(nextKey);
                    y = this.y[nextKey](d[nextKey]);
                    path.lineTo(x, y);
                }
                else { // se categorico
                    x = this.x(nextKey);
                    y = this.y[nextKey](d[nextKey]) + displacement;
                    path.lineTo(x, y);
                }

            });
            return path.toString();
        };

        this.x = d3.scalePoint().range([
            0,
            this.svg.node().getBoundingClientRect().width
            -this.settings.paddingLeft
            -this.settings.paddingRight
        ], 0);

    }

    resize(){

        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let svgBounds = this.svg.node().getBoundingClientRect();

        if(this.x)
            this.x.range([0, svgBounds.width-pl-pr]);
        else
            this.x = d3.scalePoint().range([0, svgBounds.width-pl-pr]);

        if(this.y) {
            for (let prop of this.keys) {
                this.y[prop].range([svgBounds.height -pt-pb, 0]);
            }
        }
        console.log("redraw");
        this.redraw();
        return this;
    }

    data(d){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        super.data(d);
        this.categoricalKeys = this.keys.filter(key => this.domainType[key]==='Categorical');

        const mode = array => _.chain(array).countBy().pairs().max(_.last).head().value();
        const clustering = () => {
            const defineClusters = () => {
                const validateClusterOnParameter = () => {
                    if (this.domainType[this.clusterOn] !== 'Categorical')
                        this.clusterOn = this.keys.find(key => this.domainType[key] === 'Categorical');
                };
                const defineClusterTags = () => {this.clusterTags = this.clusters.map(d=>d.key)};
                const clusterDataByKey = key => {this.clusters = d3.nest().key(d => d[key]).entries(d);};
                const clusterDataInOneGroup = () => {
                    this.clusters = [{key: 'all', values: d}];
                    this.clusterOn = 'all';
                };

                if(this.clusterOn === 'all'){
                    clusterDataInOneGroup();
                } else {
                    validateClusterOnParameter();
                    clusterDataByKey(this.clusterOn);
                }
                defineClusterTags();
            };
            const defineSortedClusters = () => {
                const sortClusterMembersByContinuousKey = (clusterTag,key) => {
                    //TODO: make this pass the test where there are no categorical keys
                    return this.clusters
                        .find(d => d.key === clusterTag).values.slice()
                        .sort((a, b) => a[key] - b[key]);

                };
                const sortClusterMembersByCategoricalKey = (clusterTag,key) => {
                    return this.clusters
                        .find(d => d.key === clusterTag).values.slice()
                        .sort((a,b) => this.domain[key].indexOf(a[key]) - this.domain[key].indexOf(b[key]));
                };
                this.sortedClusters = {};
                this.clusterTags.forEach(clusterTag => {
                    this.sortedClusters[clusterTag] = {};
                    this.keys.forEach(key => {
                        if(this.domainType[key] !== "Categorical")
                            this.sortedClusters[clusterTag][key] = sortClusterMembersByContinuousKey(clusterTag, key);
                        else
                            this.sortedClusters[clusterTag][key] = sortClusterMembersByCategoricalKey(clusterTag, key);
                    })
                })
            };
            const defineStatisticsFromClusters = () => {
                const getMeansAndVariancesOfClustersOnKey = (key) => {
                    this.means[key] = {};
                    this.variances[key] = {};
                    this.clusterTags.forEach(clusterKey => {
                        let pluck = _.pluck(this.clusters.find(d => d.key === clusterKey).values, key);
                        this.means[key][clusterKey] = d3.mean(pluck);
                        this.variances[key][clusterKey] = d3.max(pluck) - d3.min(pluck)
                    });
                };
                const getModeOfClustersOnKey = (key) => {
                    this.modes[key] = {};
                    this.clusterTags.forEach(clusterKey => {
                        let pluck = _.pluck(this.clusters.find(d => d.key === clusterKey).values, key);
                        this.modes[key][clusterKey] = mode(pluck);
                    });
                };

                this.means = {};
                this.variances = {};
                this.modes = {};

                this.keys.forEach(key => {
                    if (this.domainType[key] !== 'Categorical')
                        getMeansAndVariancesOfClustersOnKey(key);
                    else
                        getModeOfClustersOnKey(key);
                });
            };
            const defineCategoricalOrdinationMetrics = () => {
                const calculateClusterQuantity = (tag,key) => {
                    this.domain[key].forEach( category => {
                        let sum = 0;
                        this.clusters.find(c => c.key === tag).values.forEach( entry => {
                            if (entry[key] === category)
                                sum += 1;
                        });
                        this.quantityOfClusterMembersThatPassOn[tag][key][category] = sum;
                    });
                };
                const calculateTotalQuantity = (key,category) => {
                    let sum = 0;
                    this.clusterTags.forEach( tag=> {
                        sum += this.quantityOfClusterMembersThatPassOn[tag][key][category];
                    });
                    this.totalQuantityOfEntriesThatPassOn[key][category] = sum;
                };


                this.quantityOfClusterMembersThatPassOn = {};
                this.clusterTags.forEach( tag => {
                    this.quantityOfClusterMembersThatPassOn[tag] = {};
                    this.categoricalKeys.forEach( key => {
                        this.quantityOfClusterMembersThatPassOn[tag][key]= {};
                        calculateClusterQuantity(tag, key);
                    })
                });


                this.totalQuantityOfEntriesThatPassOn = {};
                this.categoricalKeys.forEach( key => {
                    this.totalQuantityOfEntriesThatPassOn[key] = {};
                    this.domain[key].forEach( category => {
                        calculateTotalQuantity(key, category);
                    });
                });
            };

            defineClusters();
            defineSortedClusters();
            defineStatisticsFromClusters();
            defineCategoricalOrdinationMetrics();
        };
        const defineScales = () => {
            const updateScaleDomains = () => {
                const createBandScaleFromXScale = () => {
                    this.band = p => (p/100)*(this.x(this.keys[1]) - this.x(this.keys[0]));
                };

                this.x.domain(this.keys);
                createBandScaleFromXScale();
            };
            const defineYScales = () => {
                // const createCategoricalScaleFor = key => {
                //     this.y[key] = d3.scalePoint()
                //         .domain(['*'].concat(this.domain[key]))
                //         .range([$(this.svg[0][0]).height()-pt-pb, 0]);
                // };
                // const createTimeScaleFor = key => {
                //     this.y[key] =  d3.scaleTime()
                //         .domain(this.domain[key])
                //         .range([$(this.svg[0][0]).height()-pt-pb, 0]);
                // };
                // const createNumericScaleFor = key => {
                //     this.y[key] =  d3.scaleLinear()
                //         .domain(this.domain[key])
                //         .range([$(this.svg[0][0]).height()-pt-pb, 0]);
                // };

                this.y = {};
                this.keys.forEach(key => {
                    switch(this.domainType[key]){
                        case ('Categorical'): this.y[key] = d3.scalePoint(); break;
                        case ('Time'): this.y[key] =  d3.scaleTime(); break;
                        default: this.y[key] =  d3.scaleLinear();
                    }
                    this.y[key]
                        .domain(this.domainType[key] === 'Categorical' ?
                            ['*'].concat(this.domain[key]) : this.domain[key])
                        .range([this.svg.node().getBoundingClientRect().height -pt -pb, 0]);
                });
            };
            this.defineReservedSpaceInCategoricalAxes = () =>{
                const calculateCategoricalAxesSizes = () => {
                    // TODO: remove hardcoded Padding in interface
                    this.axesPadding = 10;
                    const paddAxisSize = size => size - (((((this.axesPadding - 1) * 49 )/ 99) + 1)/100) * size;

                    this.axesSizesWithNoPadding = {};
                    this.axesSizesWithPadding = {};
                    this.categoricalKeys.forEach( key => {
                        let sizeWithNoPadding = this.y[key](this.domain[key][0]) - this.y[key](this.domain[key][1]);
                        this.axesSizesWithNoPadding[key] = sizeWithNoPadding;
                        this.axesSizesWithPadding[key] = paddAxisSize(sizeWithNoPadding);
                    })
                };
                const calculateReservedSpaceInCategoricalAxes = (tag,key,category) => {
                    const total = this.totalQuantityOfEntriesThatPassOn[key][category];
                    const size = this.axesSizesWithPadding[key];
                    const auxiliaryScale = d3.scaleLinear().domain([0, total]).range([0, size]);
                    const quantity = this.quantityOfClusterMembersThatPassOn[tag][key][category];
                    this.reservedSpaceInCategoricalAxes[tag][key][category] = auxiliaryScale(quantity);
                };

                calculateCategoricalAxesSizes();

                this.reservedSpaceInCategoricalAxes = {};
                this.clusterTags.forEach(tag => {
                    this.reservedSpaceInCategoricalAxes[tag] = {};
                    this.categoricalKeys.forEach( key => {
                        this.reservedSpaceInCategoricalAxes[tag][key] = {};
                        this.domain[key].forEach(category => {
                            calculateReservedSpaceInCategoricalAxes(tag,key,category);
                        })
                    })
                })
            };
            updateScaleDomains();
            defineYScales();
            this.defineReservedSpaceInCategoricalAxes();
        };

        clustering();
        defineScales();
    }


    redraw(withAnimation){
        if(!this.hasData)
            return;

        let y_axes = this.y;
        let self = this;

        const calculateCategoricalAxesSizes = () => {
            const paddAxisSize = size => size - (((((this.axesPadding - 1) * 49 )/ 99) + 1)/100) * size;

            this.axesSizesWithNoPadding = {};
            this.axesSizesWithPadding = {};
            this.categoricalKeys.forEach( key => {
                let sizeWithNoPadding = this.y[key](this.domain[key][0]) - this.y[key](this.domain[key][1]);
                this.axesSizesWithNoPadding[key] = sizeWithNoPadding;
                this.axesSizesWithPadding[key] = paddAxisSize(sizeWithNoPadding);
            })
        };
        this.defineReservedSpaceInCategoricalAxes();
        calculateCategoricalAxesSizes();
        const drawLines = () => {
            const linesUpdateSelection = this.foreground.selectAll('path.data').data(this.d);

            const updateAllLinesWithAnimation = (selection) => {
                const transitionScale = d3.scaleLinear().domain([0,this.d.length]).range([0,200]);
                selection
                    .transition()
                    .attr("class", "data")
                    .attr("data-index", function(d,i){ return i; })
                    .attr("d", this.lineFunction)
                    .style("stroke", d=> this.clusterColor(d[this.clusterOn]))
                    .attr('cluster', d=> this.clusterOn === 'all' ? 'all': d[this.clusterOn]);

                selection.on("mouseover", function (d,i) { self.event.call("datamouseover", this, d, i); })
                    .on("mouseout", function (d,i) { self.event.call("datamouseout", this, d, i); })
                    .on("click", function (d,i) { self.event.call("dataclick", this, d, i); });
            };
            const updateAllLinesWithoutAnimation = (selection) => {
                selection
                    .attr("class", "data")
                    .attr("data-index", function(d,i){ return i; })
                    .attr("d", this.lineFunction)
                    .style('stroke-width',1)
                    .style("stroke", d=> this.clusterColor(d[this.clusterOn]))
                    .attr('cluster', d=> this.clusterOn === 'all' ? 'all': d[this.clusterOn]);

                selection.on("mouseover", (d,i) =>{ this.event.call("datamouseover", this, d,i); })
                    .on("mouseout", (d,i) =>{ this.event.call("datamouseout", this, d,i); })
                    .on("click", (d,i) =>{ this.event.call("dataclick", this, d,i); });
            };
            const removeExtraLines = () => {
                linesUpdateSelection
                    .exit()
                    .remove();
            };
            this.painterAlgorithm = () => {
                const drawOrder = this.clusterTags.slice().sort( (a,b) => this.clusters.find(c => c.key === b).values.length - this.clusters.find(c => c.key === a).values.length);
                drawOrder.forEach( tag => {
                    this.foreground.selectAll(`path[cluster=${tag}].data`).each(function() {
                        this.parentNode.appendChild(this)
                    })
                });
            };

            let mergeSelection = linesUpdateSelection.enter().append("path")
                .merge(linesUpdateSelection);
            if (this.animation && withAnimation)
                updateAllLinesWithAnimation(mergeSelection);
            else
                updateAllLinesWithoutAnimation(mergeSelection);
            removeExtraLines();

            setTimeout(this.painterAlgorithm, 250);

        };
        drawLines();

        // const drawAxes = () => {
        //     const axesUpdateSelection = this.overlay.selectAll('.axis').data(this.keys);
        //
        //     const appendNewAxes = () => {};
        //     const updateAllAxes = () => {};
        //     const removeExtraAxes = () => {};
        // }


        this.overlay.selectAll(".axis")
            .data(this.keys)
            .exit().remove();

        this.axis = this.overlay.selectAll(".axis")
            .data(this.keys)
            .attr("transform", (d) => { return "translate(" + this.x(d) + ")"; })
            .each(function(d) {
                if(self.domainType[d] !== 'Categorical') d3.select(this).call(d3.axisLeft(y_axes[d]));
            });

        this.axis.select("text.column_label")
            .text(function(d) { return d; });

        let axisSelection = this.overlay.selectAll('.axis').data(this.keys);

        let axisSelectionEnter = axisSelection
            .enter()
            .append("g")
            .attr("class", "axis")
            .each(function(key) {
                if(self.domainType[key] !== 'Categorical') d3.select(this).call(d3.axisLeft(y_axes[key]));
                else {
                    // let size = self.y[key](self.domain[key][0]) - self.y[key](self.domain[key][1]);
                    // let PADDING = size/50;
                    self.domain[key].forEach((category, index) => {
                        let g = d3.select(this).append('g').attr('class', 'categoricalAxis').attr('category', category)
                            .attr('transform','translate(0,'+self.y[key](category)+')');

                        let s = d3.scaleLinear().domain([0,1]).range([0, self.axesSizesWithPadding[key]]);
                        g.call(d3.axisLeft(s).ticks(0));
                        g.append('text').text(category).attr('x', -10).attr('y', self.axesSizesWithPadding[key]/2);

                    })
                }
            });


        //insere label textual para cada eixo no enter().
        axisSelectionEnter
            .append("text")
            .style("text-anchor", "middle")
            .attr("class", "column_label")
            .style("fill", "black")
            .style("font-size", "10pt")
            .attr("y", -9)
            .on('click', d=>this.setClusterKey(d))
            .text(function(d) { return d; });

        axisSelectionEnter
            .merge(axisSelection)
            .attr("transform", (key) => { return "translate(" + this.x(key) + ")"; })
            .each(function(key) {
                if(self.domainType[key] !== 'Categorical') d3.select(this).call(d3.axisLeft(y_axes[key]));
                else {
                    // let size = self.y[key](self.domain[key][0]) - self.y[key](self.domain[key][1]);
                    // let PADDING = size/50;
                    let g = d3.select(this).selectAll('.categoricalAxis')
                        .attr('transform', function() { return 'translate(0,'+ self.y[key](d3.select(this).attr('category')) +')'});


                    let s = d3.scaleLinear().domain([0,1]).range([0, self.axesSizesWithPadding[key]]);

                    g.selectAll('*').remove();
                    g.call(d3.axisLeft(s).ticks(0));
                    g.append('text').text(function() {return d3.select(this.parentNode).attr('category')})
                        .attr('text-anchor', 'end')
                        .attr('x', -5)
                        .attr('y', self.axesSizesWithPadding[key]/2);
                }
            });

        axisSelection.exit().remove();
        // Add an axis and title.
        // let labelUpdate = axisSelection.selectAll("text.column_label").data(this.keys);
        // labelUpdate.enter()
        //     .append("text")
        //     .style("text-anchor", "middle")
        //     .attr("class", "column_label")
        //     .attr("y", -9)
        //     .on('click', d=>this.setClusterKey(d))
        //     .merge(labelUpdate)
        //     .text(function(d) { return d; });

        // let categoricalAxisSelection = this.overlay.selectAll('.categoricalAxis');
    }

    setClusterKey(key) {
        if (this.domainType[key] !== 'Categorical')
            this.clusterOn = 'all';
        else if (this.clusterOn !== key)
            this.clusterOn = key;
        else
            return;
        this.data(this.d);

        const WITH_ANIMATION = true;
        this.redraw(WITH_ANIMATION);
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
        let self = this;
        if(args[1] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            this.foreground.selectAll('path.data[data-index="'+args[1]+'"]')
                .style("stroke", function(d) {return self.clusterColor(d[self.clusterOn])})
                .style("stroke-width", 1);
            // this.overlay.selectAll(".lineHighlight").remove();
            this.event.apply("highlightend", null, args);
        }
        super.removeHighlight.apply(this, args);
        this.painterAlgorithm();
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

};

class ScatterplotMatrix extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.settings.innerPadding = settings? settings.innerPadding || 8 : 8;
        this.settings.paddingRight = settings? settings.paddingRight || 20 : 20;
        this.name = "ScatterplotMatrix";

        // this.x = d3.scale.linear()
        //     .range([padding / 2, size - padding / 2]);
        //
        // var y = d3.scale.linear()
        //     .range([size - padding / 2, padding / 2]);

    }

    resize(){
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let ip = this.settings.innerPadding;
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

    }


    redraw(){


        //Atualiza os Eixos
        let y_axes = this.y;

        let crossed = ScatterplotMatrix.cross(this.keys, this.keys);
        console.log(crossed);
        let scatterplot = this;

        function redrawDataPoints(k) {

            let cell = d3.select(this);


            cell.selectAll("circle.dataPoints")
                .data(scatterplot.d).enter()
                .append("circle")
                .attr("class", "dataPoints")
                .attr("data-index", function(d,i){ return i; })
                .attr("data-col", k.x)
                .attr("data-row", k.y)
                .attr("cx", function(d) { return scatterplot.x[k.x](d[k.x]); })
                .attr("cy", function(d) { return scatterplot.y[k.y](d[k.y]); })
                .attr("r", 2)
                .style("fill", scatterplot.settings.color)
                .style("fill-opacity", ".7")
                .on("mouseover", function(d,i){
                    scatterplot.event.datamouseover(d,i);
                })
                .on("mouseout", function(d,i){
                    scatterplot.event.datamouseout(d,i);
                })
                .on("click", function(d,i){
                    scatterplot.event.dataclick(d,i);
                });
            cell.selectAll("circle.dataPoints")
                .data(scatterplot.d)
                .attr("cx", function(d) { return scatterplot.x[k.x](d[k.x]); })
                .attr("cy", function(d) { return scatterplot.y[k.y](d[k.y]); })
                .style("fill", scatterplot.settings.color);
            cell.selectAll("circle.dataPoints")
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

    }

    highlight(...args){
        if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            let strObj = {}, isFirst = {};
            for(let k of this.keys){
                strObj[k] = "M ";
                isFirst[k] = true;
            }

            this.foreground.selectAll('circle.dataPoints[data-index="'+args[1]+'"]').style("stroke", this.settings.highlightColor)
                .each(function(){
                    let circle = d3.select(this);
                    let t = d3.transform(d3.select(this.parentElement).attr("transform"));
                    if(isFirst[circle.attr("data-row")]){
                        strObj[circle.attr("data-row")] +=
                            (parseFloat(circle.attr("cx")) + t.translate[0])
                            +" "+(parseFloat(circle.attr("cy")) + t.translate[1]);
                        isFirst[circle.attr("data-row")] = false;
                    }else{
                        strObj[circle.attr("data-row")] += " Q "+
                            + t.translate[0]+ " " + t.translate[1]
                            + " , " + (parseFloat(circle.attr("cx")) + t.translate[0])
                            + " " +(parseFloat(circle.attr("cy")) + t.translate[1]);
                    }


                });

            this.background
                .selectAll("path.lineHighlight")
                .data(_.values(strObj)).enter()
                .append("path")
                .attr("class", "lineHighlight")
                .style("fill", "none")
                .style("stroke", this.settings.highlightColor)
                .attr("d", function(d) { return d; })
        }
        super.highlight.apply(this, args);
    }
    removeHighlight(...args){
        if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            this.foreground.selectAll('circle.dataPoints[data-index="'+args[1]+'"]').style("stroke", "none");
            this.background.selectAll(".lineHighlight").remove();
        }
        super.removeHighlight.apply(this, args);
    }
    getHighlightElement(i){
        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");
        let strObj = {}, isFirst = {};
        for(let k of this.keys){
            strObj[k] = "M ";
            isFirst[k] = true;
        }

        this.foreground.selectAll('circle.dataPoints[data-index="'+i+'"]')
            .each(function(){
                let circle = d3.select(this);
                let t = d3.transform(d3.select(this.parentElement).attr("transform"));
                if(isFirst[circle.attr("data-row")]){
                    strObj[circle.attr("data-row")] +=
                        (parseFloat(circle.attr("cx")) + t.translate[0])
                        +" "+(parseFloat(circle.attr("cy")) + t.translate[1]);
                    isFirst[circle.attr("data-row")] = false;
                }else{
                    strObj[circle.attr("data-row")] += " Q "+
                        + t.translate[0]+ " " + t.translate[1]
                        + " , " + (parseFloat(circle.attr("cx")) + t.translate[0])
                        + " " +(parseFloat(circle.attr("cy")) + t.translate[1]);
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

class BeeswarmPlot extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.settings.innerPadding = settings? settings.innerPadding || 10 : 10;
        this.settings.radius = settings? settings.radius || 2 : 2;
        this.name = "BeeswarmPlot";

        this.x = d3.scalePoint()
    }

    resize(){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;
        let svgBounds = this.svg.node().getBoundingClientRect();

        this.boxWidth = (svgBounds.width-pl-pr-ip*(this.keys.length-1))/this.keys.length;
        this.innerHeight = svgBounds.height-pt-pb;

        this.x.range([this.boxWidth/2, svgBounds.width-pl-pr-this.boxWidth/2]);
        for(let k of this.keys){
            // if(this.domainType[k] === "Categorical"){
            //     this.y[k].rangePoints([this.innerHeight, 0], 0);
            // }else{
                this.y[k].range([this.innerHeight, 0]);
            // }
        }

        this.xPoints = this.getXfunction();
        this.yPoints = (d, k) => {
            return Math.floor(this.y[k](d[k])/this.binHeight)*this.binHeight;
        };
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

        this.dByAxis = {};
        this.boxWidth = (svgBounds.width-pl-pr-ip*(this.keys.length-1))/this.keys.length;

        this.innerHeight = svgBounds.height-pt-pb;

        this.x.domain(this.keys)
            .range([ this.boxWidth/2, svgBounds.width-pl-pr-this.boxWidth/2]);
        this.y = {};
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
                this.y[k] = d3.scalePoint();
            }else{
                this.y[k] = d3.scaleLinear();
            }
            this.y[k].domain(this.domain[k]).range([this.innerHeight, 0]);

            // this.dByAxis[k] = this.d.map((d) => { return _.pick(d, k); });
        }


        this.pointXmethod = "center";
        this.xPoints = this.getXfunction();
        this.yPoints = (d, k) => {
            return Math.floor(this.y[k](d[k])/this.binHeight)*this.binHeight;
        };

    }


    redraw(){


        let t0 = performance.now();

        let posWoutColl = (ccx, ccy, cy, dd, sign) => { return ccx + sign*Math.sqrt(dd - (ccy-cy)*(ccy-cy)); };

        //Atualiza os Eixos
        let beeswarm = this;


        function redrawDataPoints (k){
            beeswarm.resetXfunction();

            let dataSelection = d3.select(this)
                .selectAll("circle.dataPoint")
                .data(beeswarm.d);

            dataSelection.exit().remove();
            dataSelection.enter()
                .append("circle")
                .attr("class", "dataPoint")
                .attr("data-index", function(d, i){ return i; })
                .style("fill-opacity", ".6")
                .on("mouseover", (d,i) =>{ beeswarm.event.datamouseover(d,i); })
                .on("mouseout", (d,i) =>{ beeswarm.event.datamouseout(d,i); })
                .on("click", (d,i) =>{ beeswarm.event.dataclick(d,i); })

                .attr("cx", (d) => { return beeswarm.xPoints(d, k); })
                .attr("cy", (d) => { return beeswarm.yPoints(d, k); })
                .style("fill", beeswarm.settings.color)
                .attr("r", beeswarm.settings.radius);

            dataSelection
                .attr("cx", (d) => { return beeswarm.xPoints(d, k); })
                .attr("cy", (d) => { return beeswarm.yPoints(d, k); })
                .style("fill", beeswarm.settings.color);
        }

        console.log(this.keys);
        let beegroup = this.foreground.selectAll("g.beeSwarmGroup")
            .data(this.keys);

        beegroup.exit().remove();
        let beegroupenter = beegroup.enter()
            .append("g")
            .attr("class", "beeSwarmGroup")
            .attr("transform", (d) => {
                return "translate(" + this.x(d) + ",0)";
            })
            .each(redrawDataPoints);
        beegroup
            .attr("transform", (d) => {
                return "translate(" + this.x(d) + ",0)";
            });

        beegroupenter.append("rect")
            .attr("class", "frame")
            .attr("x", -beeswarm.boxWidth/2)
            .attr("y", 0)
            .attr("width", beeswarm.boxWidth)
            .attr("height", beeswarm.svg.node().getBoundingClientRect().height
                -beeswarm.settings.paddingTop-beeswarm.settings.paddingBottom)
            .style("fill", "none")
            .style("stroke", "#aaa");
        beegroupenter.append("g")
            .attr("class", "axis")
            .attr("transform", "translate("+(-beeswarm.boxWidth/2)+",0)")
            .each(function(k) { d3.select(this).call(d3.axisRight(beeswarm.y[k]).tickSizeInner(0)); });
        beegroupenter.append("text")
            .attr("class", "axisLabel")
            .attr("x", 0)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .text(function(d){
                return d;
            });

        beegroupenter.each(function(k){
            console.log("enter: "+k);
        });
        // beegroup.selectAll("")
        beegroup
            .each(function(k) {
                d3.select(this).selectAll("g.axis").call(d3.axisRight(beeswarm.y[k]).tickSizeInner(0));
            })
            .selectAll("g.axis")
            .attr("transform", "translate("+(-beeswarm.boxWidth/2)+",0)");

        beegroup
            .each(redrawDataPoints)
            .selectAll(".frame")
            .attr("x", -beeswarm.boxWidth/2)
            .attr("y", 0)
            .attr("width", beeswarm.boxWidth)
            .attr("height", beeswarm.svg.node().getBoundingClientRect().height
                -beeswarm.settings.paddingTop-beeswarm.settings.paddingBottom);

        beegroup
            .each(function(d){
                d3.select(this).selectAll("text.axisLabel").text(d);
            });


        let t1 = performance.now();
        console.log("TIme: "+(t1-t0));
    }

    highlight(...args){
        let beeswarm = this;
        let pl = this.settings.paddingLeft;
        if(args[0] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            // this.foreground.select
            // d3.select(args[0])
            let str = "M ";
            this.foreground.selectAll('circle[data-index="'+args[1]+'"]').style("stroke", this.settings.highlightColor)
                .each(function(){
                    let circle = d3.select(this);
                    let t = d3.transform(d3.select(this.parentElement).attr("transform"));
                    str += (parseFloat(circle.attr("cx")) + t.translate[0])
                        +","+circle.attr("cy") + " L "
                });
            str = str.substring(0, str.length - 3);
            this.background
                .append("path")
                .attr("class", "lineHighlight")
                .style("fill", "none")
                .style("stroke", this.settings.highlightColor)
                .attr("d", str)
        }
        super.highlight.apply(this, args);
    }
    removeHighlight(...args){
        if(args[1] instanceof SVGElement){

        }else if(typeof args[1] === "number" && args[1] >= 0 && args[1] < this.d.length){
            this.foreground.selectAll('circle[data-index="'+args[1]+'"]').style("stroke", "none");
            this.background.selectAll(".lineHighlight").remove();
        }
        super.removeHighlight.apply(this, args);
    }
    getHighlightElement(i){
        let str = "M ";
        this.foreground.selectAll('circle[data-index="'+i+'"]')
            .each(function(){
                let circle = d3.select(this);
                let t = d3.transform(d3.select(this.parentElement).attr("transform"));
                str += (parseFloat(circle.attr("cx")) + t.translate[0])
                    +","+circle.attr("cy") + " L "
            });
        str = str.substring(0, str.length - 3);

        let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        d3.select(group).attr("class", "groupHighlight");
        let path = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "path"))
            .attr("class", "lineHighlight")
            .style("fill", "none")
            .style("stroke", this.settings.highlightColor)
            .attr("d", str).node();
        group.appendChild(path);
        return group;
    }


    getXfunction(){
        switch (this.pointXmethod){
            case "center":
                let binQuant = Math.floor(this.innerHeight/(this.settings.radius*2));
                this.binHeight = this.innerHeight/binQuant;
                let hist = {};
                this.initXPos ={};
                this.xPos ={};

                for(let k of this.keys){
                    hist[k] = [];
                    this.initXPos[k] = [];
                    this.xPos[k] = [];
                    for(let i=0;i<=binQuant;i++)
                        hist[k][i] = 0;
                    for(let d of this.d)
                        hist[k][Math.floor(this.y[k](d[k])/this.binHeight)]++;


                    for(let i=0;i<hist[k].length;i++){
                        this.initXPos[k][i] = -hist[k][i]*this.settings.radius + this.settings.radius;
                        this.xPos[k][i] = this.initXPos[k][i];
                    }
                    console.log(k, binQuant, hist[k].length, this.xPos[k][this.xPos[k].length-1], this.xPos[k]);
                }
                return (d, k) => {
                    let i = Math.floor(this.y[k](d[k])/this.binHeight);
                    let xpos = this.xPos[k][i];
                    this.xPos[k][i] += this.settings.radius*2;
                    return xpos;
                };
        }
    }
    resetXfunction(){
        for(let k of this.keys)
            for (let i = 0; i < this.initXPos[k].length; i++)
                this.xPos[k][i] = this.initXPos[k][i];
    }

}


class QuadTree{

    constructor(){
        this.root = {};
    }

    insert(bound, node){
        let _insert = function (root, bound, node) {
            if(root.isLeaf){
                let brother = {isLeaf:true, bound: root.bound, node: root.node};
                let inserted = {isLeaf:true, bound: bound, node: node};
                root.bound = QuadTree.unionBound(brother.bound, bound);
                root.isLeaf = false;
                root.node = undefined;
                root.child1 = brother;
                root.child2 = inserted;
                return root.bound;
            }else{
                let mb1 = QuadTree.unionBound(root.child1.bound, bound);
                let mb2 = QuadTree.unionBound(root.child2.bound, bound);
                let resultBound;
                if(QuadTree.boundArea(mb1) > QuadTree.boundArea(mb2)){
                    resultBound = _insert(root.child2, bound, node);
                }else{
                    resultBound = _insert(root.child1, bound, node);
                }
                root.bound = QuadTree.unionBound(root.bound, resultBound);
                return root.bound;
            }
        };
        if(!this.root.bound){
            this.root.bound = bound;
            this.root.node = node;
            this.root.isLeaf = true;
        }else{
            _insert(this.root, bound, node);
        }
    }

    getCollisions(bound){

        let _getCollisions = (root, bound, array) => {
            if(QuadTree.isColliding(root.bound, bound)){
                if(root.isLeaf){
                    array.push(root.node);
                }else{
                    _getCollisions(root.child1, bound, array);
                    _getCollisions(root.child2, bound, array);
                }
            }
        };

        if(this.root.bound){
            let collisions = [];
            _getCollisions(this.root, bound, collisions);
            return collisions;
        }
        return [];
    }

    static unionBound(b1, b2){
        return {
            x1: Math.min(b1.x1, b2.x1),
            y1: Math.min(b1.y1, b2.y1),
            x2: Math.max(b1.x2, b2.x2),
            y2: Math.max(b1.y2, b2.y2)
        };
    }
    static boundArea(b){
        return (b.x2-b.x1)*(b.y2-b.y1);
    }
    static isColliding(b1, b2){
        return !(b2.x1 > b1.x2 ||
            b2.x2 < b1.x1 ||
            b2.y1 > b1.y2 ||
            b2.y2 < b1.y1);
    }
}

// var vis = {
//     "Visualization": Visualization,
//     "ParallelCoordinates": ParallelCoordinates,
//     "ScatterplotMatrix": ScatterplotMatrix,
//     "BeeswarmPlot": BeeswarmPlot
// };

exports.Visualization = Visualization;
exports.ParallelCoordinates = ParallelCoordinates;
exports.ParallelBundling = ParallelBundling;
exports.ScatterplotMatrix = ScatterplotMatrix;
exports.BeeswarmPlot = BeeswarmPlot;