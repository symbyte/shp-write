var ext = require('./extent');
const { forEach, reduce }= require('./util');

module.exports.write = function writePoints(geometries, extent, shpView, shxView, TYPE) {

    var shpI = 0,
        shxI = 0,
        shxOffset = 100;

    forEach(geometries, writePolyLine);

    function writePolyLine(coordinates, i) {

        var flattened = justCoords(coordinates),
            contentLength = (flattened.length * 16) + 48;

        var featureExtent = reduce(flattened, function(extent, c) {
            return ext.enlarge(extent, c);
        }, ext.blank());

        // INDEX
        shxView.setInt32(shxI, shxOffset / 2); // offset
        shxView.setInt32(shxI + 4, contentLength / 2); // offset length

        shxI += 8;
        shxOffset += contentLength + 8;

        shpView.setInt32(shpI, i + 1); // record number
        shpView.setInt32(shpI + 4, contentLength / 2); // length
        shpView.setInt32(shpI + 8, TYPE, true); // POLYLINE=3
        shpView.setFloat64(shpI + 12, featureExtent.xmin, true); // EXTENT
        shpView.setFloat64(shpI + 20, featureExtent.ymin, true);
        shpView.setFloat64(shpI + 28, featureExtent.xmax, true);
        shpView.setFloat64(shpI + 36, featureExtent.ymax, true);
        shpView.setInt32(shpI + 44, 1, true); // PARTS=1
        shpView.setInt32(shpI + 48, flattened.length, true); // POINTS
        shpView.setInt32(shpI + 52, 0, true); // The only part - index zero

        forEach(flattened, function writeLine(coords, i) {
            shpView.setFloat64(shpI + 56 + (i * 16), coords[0], true); // X
            shpView.setFloat64(shpI + 56 + (i * 16) + 8, coords[1], true); // Y
        });

        shpI += contentLength + 8;
    }
};

module.exports.shpLength = function(geometries) {
    return (geometries.length * 56) +
        // points
        (justCoords(geometries).length * 16);
};

module.exports.shxLength = function(geometries) {
    return geometries.length * 8;
};

module.exports.extent = function(coordinates) {
    return reduce(justCoords(coordinates), function(extent, c) {
        return ext.enlarge(extent, c);
    }, ext.blank());
};

function totalPoints(geometries) {
    var sum = 0;
    forEach(geometries, function(g) { sum += g.length; });
    return sum;
}

function justCoords(coords, l) {
    if (l === undefined) l = [];
    if (typeof coords[0][0] == 'object') {
        return reduce(coords, accumulateCoords, l);
    } else {
        return coords;
    }
}

function accumulateCoords(memo, c) {
  const memoPosition = memo.length;
  const coords = justCoords(c);
  forEach(coords, (coord, i) => {
    memo[memoPosition + i] = coord;
  })
  return memo;
}

