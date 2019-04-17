/**
 *
 * @param a x0 line1
 * @param b y0 line1
 * @param c x1 line1
 * @param d y0 line1
 * @param p x0 line2
 * @param q y0 line2
 * @param r x1 line2
 * @param s y2 line2
 * @returns {boolean} line1 intersects line2
 */
module.exports.lineIntersects = (a,b,c,d,p,q,r,s) => {
    let det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) {
        return false;
    } else {
        lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
        gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
};


module.exports.parseTranslate = (elem) => {
    let m = elem.transform.baseVal.consolidate().matrix;
    return {
        x: m.e,
        y: m.f
    };
};

// class QuadTree{
//
//     constructor(){
//         this.root = {};
//     }
//
//     insert(bound, node){
//         let _insert = function (root, bound, node) {
//             if(root.isLeaf){
//                 let brother = {isLeaf:true, bound: root.bound, node: root.node};
//                 let inserted = {isLeaf:true, bound: bound, node: node};
//                 root.bound = QuadTree.unionBound(brother.bound, bound);
//                 root.isLeaf = false;
//                 root.node = undefined;
//                 root.child1 = brother;
//                 root.child2 = inserted;
//                 return root.bound;
//             }else{
//                 let mb1 = QuadTree.unionBound(root.child1.bound, bound);
//                 let mb2 = QuadTree.unionBound(root.child2.bound, bound);
//                 let resultBound;
//                 if(QuadTree.boundArea(mb1) > QuadTree.boundArea(mb2)){
//                     resultBound = _insert(root.child2, bound, node);
//                 }else{
//                     resultBound = _insert(root.child1, bound, node);
//                 }
//                 root.bound = QuadTree.unionBound(root.bound, resultBound);
//                 return root.bound;
//             }
//         };
//         if(!this.root.bound){
//             this.root.bound = bound;
//             this.root.node = node;
//             this.root.isLeaf = true;
//         }else{
//             _insert(this.root, bound, node);
//         }
//     }
//
//     getCollisions(bound){
//
//         let _getCollisions = (root, bound, array) => {
//             if(QuadTree.isColliding(root.bound, bound)){
//                 if(root.isLeaf){
//                     array.push(root.node);
//                 }else{
//                     _getCollisions(root.child1, bound, array);
//                     _getCollisions(root.child2, bound, array);
//                 }
//             }
//         };
//
//         if(this.root.bound){
//             let collisions = [];
//             _getCollisions(this.root, bound, collisions);
//             return collisions;
//         }
//         return [];
//     }
//
//     static unionBound(b1, b2){
//         return {
//             x1: Math.min(b1.x1, b2.x1),
//             y1: Math.min(b1.y1, b2.y1),
//             x2: Math.max(b1.x2, b2.x2),
//             y2: Math.max(b1.y2, b2.y2)
//         };
//     }
//     static boundArea(b){
//         return (b.x2-b.x1)*(b.y2-b.y1);
//     }
//     static isColliding(b1, b2){
//         return !(b2.x1 > b1.x2 ||
//             b2.x2 < b1.x1 ||
//             b2.y1 > b1.y2 ||
//             b2.y2 < b1.y1);
//     }
// }