
let d3 = require("d3");

let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class BarChart extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "BarChart";
        this.xdata = [];
        this.ydata = [];
        // this.x = d3.scalePoint()
    }

    _putDefaultSettings(){
        this.settings.innerPadding = 8;
        this.settings.paddingRight = 20;
        this.settings.paddingBottom = 75;
    }

    resize(){
        let pt = this.settings.paddingTop;
        let pb = this.settings.paddingBottom;
        let pl = this.settings.paddingLeft;
        let pr = this.settings.paddingRight;
        let ip = this.settings.innerPadding;

        let svgBounds = this.svg.node().getBoundingClientRect();
        this.cellWidth = svgBounds.width - pl;
        this.cellHeight = svgBounds.height -pb;




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
        let axisX = this.settings.axisX;
        let axisY = this.settings.axisY;
        this.cellWidth = svgBounds.width - pl;
        this.cellHeight = svgBounds.height -pb;


        this.axis = [];
        this.x = [];
        this.y = [];

        let datax = [],datay = [],data_arr = [], value =0;

        let data = Object.keys(this.d).map(key => this.d[key]);

        for(let k of this.keys){
            let xvalues = [];
            data_arr.push([k]);
            for (let i = 0; i <data.length ; i++){
                xvalues.push(data[i][k]);
            }
            data_arr[value].push([xvalues]);
            value += 1;
        }
        // console.log("eixo x",axisX);
        if(!axisX)
            axisX  = [this.keys[0]];
        if(!axisY)
            axisY =  [this.keys[1]];
        data_arr.forEach(function (d,i) {
            if(d.indexOf(axisX[0])!=-1){
                datax = d[1][0];
            }
            if(d.indexOf(axisY[0])!=-1){
                datay = d[1][0];
            }

        });
        this.x = datax;
        this.y = datay;
        this.redraw();
        return this;
    }


    redraw(){
        let barchart = this;
        this.foreground.selectAll(".textLabel").remove();
        this.foreground.selectAll(".data").remove();
        this.foreground.selectAll(".axisY").remove();

        let margin = ({top: this.settings.paddingTop , right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

        let chart = this.foreground;

        let updateChart  = this.foreground
            .selectAll(".data")
            .data(this.d);

        updateChart.exit().remove();

        let x = d3.scaleBand()
            .domain(this.x)
            .range([margin.left, this.cellWidth - margin.right])
            .padding(0.1);

        let y = d3.scaleLinear()
            .domain([0, d3.max(this.y)]).nice()
            .range([this.cellHeight - margin.bottom, margin.top]);

        this.xAxis = g => g
            .attr("transform", `translate(0,${this.cellHeight - margin.bottom})`)
            .call(d3.axisBottom(x)
                .tickSizeOuter(0));

        this.yAxis = g => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y))
            .call(g => g.select(".domain").remove());

        let dataEnter = updateChart
            .data(barchart.d).enter()
            .append("rect")
            .attr("class","data")
            .data(barchart.y)
            .attr("width", x.bandwidth())
            .attr("height", d => y(0)- y(d))
            .attr("y", d => y(d))
            .data(barchart.x)
            .attr("x",function(d){ return x(d);})
            .attr("data-index", function(d,i){ return i; })
            .style("fill",barchart.settings.color)
            .style("stroke","black")
            .style("stroke-width",0.5);

        //
        // let  barUpdate = dataEnter.enter()
        //     .selectAll(".rect")
        //     .data(this.d)
        //     .style("fill", this.settings.color);

        dataEnter.exit().remove();
        // let  dataEnterWidth = updateChart()
        //     selectAll(".data")


        //         .attr("x",function (d,i) {
        //             return y(d);})
        //



        let enterAxisX = chart.append("g")
            .attr("class","textLabel")
            .call(this.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.55em")
            .attr("transform", "rotate(-90)" );

        let enterAxisY = chart.append("g")
            .attr("class","axisY")
            .call(this.yAxis);

        return this;
    }

    highlight(...args){

    }
    removeHighlight(...args){

    }
    getHighlightElement(i){

    }

    setAxisX(args){
        this.settings.axisX = args;
        console.log(args);
    }

    setAxisY(args){
        this.settings.axisY = args;
        console.log(args);

    }

    hierarchy(attrs){
        this.settings.hierarchies = attrs;
        if(this.domain)
            _hierarchy.call(this, attrs);
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


module.exports = BarChart;