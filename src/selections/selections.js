let utils = require("../Utils.js");

class Selection {
    constructor(){

    }

    select(SVGElements){
        return (SVGElements instanceof Array || SVGElements instanceof NodeList) && SVGElements[0] instanceof SVGGeometryElement;
    }

    setSelection(){}

    setPadding(){}

    getSVGElement(){
        return this.element;
    }

    // verifyTouch(queryElement, targetElement, type) {
    //     let method = type === Selection.Type.FILL ? "isPointInFill":"isPointInStroke";
    //     let l = Math.floor(queryElement.getTotalLength());
    //     let point = {x:0,y:0};
    //     console.log("this.verifyTouch() "+l);
    //     for(let i=0; i<l;i++) {
    //         let p = queryElement.getPointAtLength(i);
    //         console.log("tentando: "+point);
    //         if (targetElement[method](point)) {
    //             console.log("foi");
    //             return true;
    //         }
    //     }
    //     return false;
    // }
}

Selection.Type = {FILL: 0, STROKE: 1};

class LineSelection extends Selection{
    constructor(line){
        super();
        this.element = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this.setSelection.apply(this, arguments);
    }

    select(SVGElements, type){
        let selected = [];
        if(super.select(SVGElements)){
            for(let elem of SVGElements){
                if(this.intersects(elem)){
                    selected.push(elem);
                }
            }
        }
        return selected;
    }

    setSelection(line){
        if(line instanceof Object){
            this.x1 = line.x1 || 0;
            this.x2 = line.x2 || 0;
            this.y1 = line.y1 || 0;
            this.y2 = line.y2 || 0;
        }else if(line instanceof Array){
            this.x1 = line[0] || 0;
            this.y1 = line[1] || 0;
            this.x2 = line[2] || 0;
            this.y2 = line[3] || 0;
        }else if(typeof line === "number"){
            this.x1 = arguments[0];
            this.y1 = arguments[1];
            this.x2 = arguments[2];
            this.y2 = arguments[3];
        }else{
            throw "Argumentos Errados... espera-se uma linha, obtido: "
            +arguments[0]+" "+arguments[1]+" "+arguments[2]+" "+arguments[3];
        }
        this.stroke_width = 1;
        this.stroke_color = "black";


        this.element.setAttribute("x1", this.x1);
        this.element.setAttribute("y1", this.y1);
        this.element.setAttribute("x2", this.x2);
        this.element.setAttribute("y2", this.y2);
        this.element.setAttribute("stroke-width", this.stroke_width);
        this.element.setAttribute("stroke", this.stroke_color);

    }

    intersects(elem){
        if(elem instanceof SVGPathElement){
            let total = Math.floor(elem.getTotalLength()/4)-1;
            let tp1,tp2;
            for(let i=0;i<total;i++) {
                tp1 = elem.getPointAtLength(i*4);
                tp2 = elem.getPointAtLength((i+1)*4);
                if (utils.lineIntersects(tp1.x, tp1.y,
                        tp2.x, tp2.y, this.x1, this.y1,
                        this.x2, this.y2)) {
                    return true;
                }
            }
        }
        return false;
    }

}

class RectSelection extends Selection {
    constructor(rect){
        super();
        if(rect instanceof Object){
            this.x1 = rect.x1 || 0;
            this.x2 = rect.x2 || 0;
            this.y1 = rect.y1 || 0;
            this.y2 = rect.y2 || 0;
        }else if(rect instanceof Array){
            this.x1 = rect[0] || 0;
            this.y1 = rect[1] || 0;
            this.x2 = rect[2] || 0;
            this.y2 = rect[3] || 0;
        }else if(rect instanceof Number){
            this.x1 = arguments[0];
            this.y1 = arguments[1];
            this.x2 = arguments[2];
            this.y2 = arguments[3];
        }
    }
}

class FreeDrawingSelection extends Selection {

}

class LassoSelection extends Selection {

}


module.exports = {
    Selection,
    LineSelection,
    RectSelection,
    FreeDrawingSelection,
    LassoSelection
};