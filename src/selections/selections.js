

class LineSelection {
    constructor(line){
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
        }else if(line instanceof Number){
            this.x1 = arguments[0];
            this.y1 = arguments[1];
            this.x2 = arguments[2];
            this.y2 = arguments[3];
        }
    }
}

class RectSelection {
    constructor(rect){
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

class FreeDrawingSelection {

}

class LassoSelection {

}