


function require(str){

    switch(str){
        case "d3":
            return window.d3;
        case "moment":
            return window.moment;
    }

}

var module = {};