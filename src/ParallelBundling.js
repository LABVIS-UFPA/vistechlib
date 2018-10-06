
let d3 = require("d3");
let _ = require("underscore");
let Visualization = require("./Visualization.js");

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

                this._bindDataMouseEvents(selection);
            };

            const updateAllLinesWithoutAnimation = (selection) => {
                selection
                    .attr("class", "data")
                    .attr("data-index", function(d,i){ return i; })
                    .attr("d", this.lineFunction)
                    .style('stroke-width',1)
                    .style("stroke", d=> this.clusterColor(d[this.clusterOn]))
                    .attr('cluster', d=> this.clusterOn === 'all' ? 'all': d[this.clusterOn]);

                this._bindDataMouseEvents(selection);
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

        this.event.apply("draw");

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
            let elem = this.foreground.selectAll('path.data[data-index="'+args[1]+'"]')
                .style("stroke", function(d) {return self.clusterColor(d[self.clusterOn])})
                .style("stroke-width", 1);
            // this.overlay.selectAll(".lineHighlight").remove();
            // this.event.apply("highlightend", null, args);
            super.removeHighlight(elem.node(), elem.datum(), args[1]);
        }
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

}


module.exports = ParallelBundling;