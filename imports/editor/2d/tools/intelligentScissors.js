// Intelligent Scissors implementation
//
// This implementation is based on the paper:
// "Intelligent Scissors for Image Composition", Eric N. Mortensen and
//  William A. Barrett, Brigham Young University.
//
// by Jens Reinhart

export default (function () {
    var lib = {};

    lib.calculateCosts = function (image) {
        var data = image.data, // Image Data as array in form [Red, Green, Blue, Alpha]
            w = image.width,
            h = image.height,
            grayData = [], // Image as Gray Image
            laplace = []; // Image after Laplace convolution


        // create gray-image with array of size w*h
        for (let i = 0; i < w*h; i++) {
            grayData[i] = Math.round(0.299 * data[i*4] +  0.587 * data[i*4 + 1] + 0.114 * data[i*4 + 2]);
        }

        // Convolve with laplacian kernel
        let kernel = [
             0,-1, 0,
            -1, 4,-1,
             0,-1, 0
        ];


        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if(x == 0 || y == 0 || x == w-1 || y == h-1) {
                    // skip boarder Pixel
                    laplace[(y*w) + x] = grayData [(y*w) + x];
                    continue;
                }
                laplace[(y*w) + x] =
                    grayData[(y-1) * w + (x-1)] * kernel[0] +
                    grayData[(y  ) * w + (x-1)] * kernel[1] +
                    grayData[(y+1) * w + (x-1)] * kernel[2] +
                    grayData[(y-1) * w + (x  )] * kernel[3] +
                    grayData[(y  ) * w + (x  )] * kernel[4] +
                    grayData[(y+1) * w + (x  )] * kernel[5] +
                    grayData[(y-1) * w + (x+1)] * kernel[6] +
                    grayData[(y  ) * w + (x+1)] * kernel[7] +
                    grayData[(y+1) * w + (x+1)] * kernel[8];
            }
        }
        // TODO check why negative values

        // TODO implement zero Crossings here

        return laplace;
    };

    lib.setSeedPoint = function(image, px, py) {


        return null;
    };

    return lib;
})();