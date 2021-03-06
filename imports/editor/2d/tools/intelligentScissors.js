// Intelligent Scissors implementation
//
// This implementation is based on the paper:
// "Intelligent Scissors for Image Composition", Eric N. Mortensen and
//  William A. Barrett, Brigham Young University.
//
// by Jens Reinhart

import { dot } from 'mathjs'

export default class IntelligentScissors {

    constructor(image) {
        this.w = image.width; // Image width
        this.h = image.height; // Image height
        this.grayData = []; // Image as Gray Image
        this.zeroCrossings = []; // Binary matrix with zero crossing
        this.sobelX = []; // Image after sobel filter in x direction
        this.sobelY = []; // Image after sobel filter in y direction
        this.gradientMagnitude = [];
        this.pointers = new Map();   // pointers from each pixel indicating the minimum Path ([x,y]: [x,y])

        this.seedPoint = [];

        // Weights for the cost function
        this.wz = 0.43; // Zero-Crossings
        this.wg = 0.14; // Gradient Magnitude
        this.wd = 0.43; // Gradient Direction

        let start = new Date().getTime(); // TIME MEASUREMENT
        this.initCosts(image);
        let time = new Date().getTime() - start;
        console.log("Time in ms: " + time);
    }

    getSeedPoint = function() {
        return this.seedPoint;
    }

    getPointer = function(px, py) {
        return this.intToCoords(this.pointers.get(this.coordsToInt([px, py])));
    }

    setSeedPoint = function (px, py) {
        this.seedPoint = [px, py];

        this.calculatePathMatrix(px, py);
    };

    getPathToSeedPoint = function(px, py) {
        let point = [px,py];
        let path = []
        while(!(point[0] == this.seedPoint[0] && point[1] == this.seedPoint[1])) {
            path.push(point);
            point = this.intToCoords(this.pointers.get(this.coordsToInt(point)));
        }
        return path;
    }

    /**
     * Calculate the Laplacian Zero-Crossings and Gradient Magnitude to initiate the cost functions
     * @param image
     */
    initCosts = function (image) {
        var data = image.data, // Image Data as array in form [Red, Green, Blue, Alpha]
            gaussian = [], // Image after Gaussian convolution
            laplace = [], // Image after Laplace convolution
            maxG = null; // max(G) value


        // create gray-image with array of size w*h
        for (let i = 0; i < this.w * this.h; i++) {
            this.grayData[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
        }

        // Laplacian Zero-Crossing

        let gaussianKernel = [
            1 / 16, 2 / 16, 1 / 16,
            2 / 16, 4 / 16, 2 / 16,
            1 / 16, 2 / 16, 1 / 16
        ];

        // Convolve with gaussian kernel
        // Use a bigger gaussian kernel for better results
        gaussian = this.convolve(this.grayData, this.w, this.h, gaussianKernel);

        let laplacianKernel = [
            0, -1, 0,
            -1, 4, -1,
            0, -1, 0
        ];

        // Convolve with laplacian kernel
        laplace = this.convolve(gaussian, this.w, this.h, laplacianKernel);

        // Look for Zero-Crossings:
        for (let x = 0; x < this.w; x++) {
            for (let y = 0; y < this.h; y++) {
                // Set every Pixel to 1
                this.zeroCrossings[(y * this.w) + x] = 1;
                if (x == 0 || y == 0 || x == this.w - 1 || y == this.h - 1) {
                    // skip boarder Pixel
                    continue;
                }
                let pixel = laplace[(y * this.w) + x];

                // get neighbours
                let neighbours = [
                    laplace[((y - 1) * this.w) + x],
                    laplace[((y + 1) * this.w) + x],
                    laplace[(y * this.w) + x - 1],
                    laplace[(y * this.w) + x + 1]];

                for (let n of neighbours) {
                    if ((pixel < 0 && n > 0) || (pixel > 0 && n < 0)) {
                        // Zero crossing
                        if (Math.abs(pixel) < Math.abs(n)) {
                            // If the considered pixel is closer to Zero:
                            this.zeroCrossings[(y * this.w) + x] = 0;
                            continue;
                        }
                    }
                }
            }
        }

        // Gradient Magnitude

        let Sx = [
            -1, 0, 1,
            -2, 0, 2,
            -1, 0, 1
        ]

        let Sy = [
            -1, -2, -1,
            0, 0, 0,
            1, 2, 1
        ]

        // Convolve with Sobel kernel for x and y direction
        this.sobelX = this.convolve(this.grayData, this.w, this.h, Sx);
        this.sobelY = this.convolve(this.grayData, this.w, this.h, Sy);

        for (let i = 0; i < this.w * this.h; i++) {
            let g = Math.round(Math.sqrt(Math.pow(this.sobelX[i], 2) + Math.pow(this.sobelY[i], 2)));
            maxG = g > maxG ? g : maxG;
            this.gradientMagnitude[i] = g;
        }

        for (let i = 0; i < this.w * this.h; i++) {
            this.gradientMagnitude[i] = 1 - (this.gradientMagnitude[i] / maxG);
        }
    };

    /**
     * Calculate the third cost function for two given points
     * @param px
     * @param py
     * @param qx
     * @param qy
     * @returns {number}
     */
    getGradientDirection = function(px, py, qx, qy) {
         let Dp = [this.sobelY[py * this.w + px], -this.sobelX[py * this.w + px]];
         let Dq = [this.sobelY[qy * this.w + qx], -this.sobelX[qy * this.w + qx]];

         if (isNaN(Dp) || isNaN (Dq)){
             return 0;
         }

         let Lpq = [qx - px, qy - py];
         if (Lpq[0] != 0 && Lpq[1] != 0) {
             // Calculate unit vector
             Lpq[0] = Lpq[0] * Math.sqrt(0.5);
             Lpq[1] = Lpq[1] * Math.sqrt(0.5);
         }

         if (dot(Dp, Lpq) < 0) {
             Lpq = [px - qx, py - qy];
             if (Lpq[0] != 0 && Lpq[1] != 0) {
                 // Calculate unit vector
                 Lpq[0] = Lpq[0] * Math.sqrt(0.5);
                 Lpq[1] = Lpq[1] * Math.sqrt(0.5);
             }
         }

         let DpLpq = dot(Dp, Lpq);
         let LpqDq = dot(Lpq, Dq);

         let gradientDirection = (1/Math.PI) * (Math.acos(DpLpq) + Math.acos(LpqDq));
         return isNaN(gradientDirection) ? 0 : gradientDirection;
    }

    /**
     * Calculate the combined, weighted costs for two neighbouring pixels
     * Consider the Euclidean Distance (Described in 3.1 and 3.2 of the paper)
     * @param px
     * @param py
     * @param qx
     * @param qy
     */
    getLocalCost = function (px, py, qx, qy) {
        // if the two points are diagonal to each other scale the cost by 1,
        // if they are direct neighbours scale them by 1/sqrt(2).
        let scale = (px == qx || py == qy) ? 1/Math.sqrt(2) : 1;
        let intQ = this.coordsToInt([qx, qy]);

        return scale * ((this.wz * this.zeroCrossings[intQ]) +
            (this.wd * this.getGradientDirection(px, py, qx, qy)) +
            (this.wg * this.gradientMagnitude[intQ]));
    }

    /**
     * Live-Wire 2-D DP graph search
     * @param px
     * @param py
     */
    calculatePathMatrix = function (px, py) {
        // save Pixel by y * width + x
        let seed = this.coordsToInt([px,py]);  // Seed point as int
        let activePixel = new Set();                // List of active pixel
        let costFunction = new Map();               // Total cost function
        let neighbours = [];                        // Neighborhood set of q (contains 8 pixel)
        let expanded = new Set();                   // Set that holds all expanded pixel

        let index = 0;

        let start = new Date().getTime(); // TIME MEASUREMENT

        activePixel.add(seed);
        costFunction.set(seed, 0);
        while (activePixel.size > 0) {
            let q = this.getMinCost(activePixel, costFunction);
            if (q == null) continue;
            activePixel.delete(q);                  // Remove minimum cost pixel from active list
            neighbours = this.getNeighbours(q);
            expanded.add(q);

            for (let r of neighbours) {
                if (!expanded.has(r)){

                    let qx = this.intToCoords(q)[0];
                    let qy = this.intToCoords(q)[1];
                    let rx = this.intToCoords(r)[0];
                    let ry = this.intToCoords(r)[1];
                    let tempCost = costFunction.get(q) +
                        this.getLocalCost(qx, qy, rx, ry); // compute total cost to neighbour

                    if (activePixel.has(r) && tempCost < costFunction.get(r)) {
                        activePixel.delete(r); // Remove higher cost neighbours from list
                    }
                    if (!activePixel.has(r)) {
                        costFunction.set(r, tempCost);      // assign Neighbours total cost
                        this.pointers.set(r, q);            // Set back pointer
                        activePixel.add(r);
                    }
                }
            }


            index++;
            if (index % 100000 == 0) {
                let time = new Date().getTime() - start;
                console.log("Time in ms: " + time);
                console.log(index);
                console.log(activePixel.size);
                console.log(this.pointers.size);
                console.log(expanded.size);
            }
        }
    }

    /**
     * Helper Function which returns the point with the smallest costs of the active List
     * @param pixelSet int of pixels
     * @returns Point with smallest costs
     */
    getMinCost = function (pixelSet, costMap) {
        let minCost = Infinity;
        let minPoint = null;
        for (let point of pixelSet) { // point: y * w + x
            if (costMap.get(point) < minCost) {
                minCost = costMap.get(point);
                minPoint = point;
            }
        }
        return minPoint;
    }

    /**
     * Returns neighbours of point
     * @param point [x, y]
     */
    getNeighbours = function (point) {
        let neighbours = [];
        let x = this.intToCoords(point)[0];
        let y = this.intToCoords(point)[1];

        // Check if its not a boarder pixel
        if (x != 0)             neighbours.push(this.coordsToInt([x-1,y  ]));
        if (x != this.w-1)      neighbours.push(this.coordsToInt([x+1,y  ]));
        if (y != 0)             neighbours.push(this.coordsToInt([x  ,y-1]));
        if (y != this.h-1)      neighbours.push(this.coordsToInt([x  ,y+1]));
        if (x != 0 && y != 0)               neighbours.push(this.coordsToInt([x-1,y-1]));
        if (x != 0 && y != this.h-1)        neighbours.push(this.coordsToInt([x-1,y+1]));
        if (x != this.w-1 && y != 0)        neighbours.push(this.coordsToInt([x+1,y-1]));
        if (x != this.w-1 && y != this.h-1) neighbours.push(this.coordsToInt([x+1,y+1]));

        return neighbours;
    }

    /**
     * Helper function which calculates an coordinate array to an int.
     * @param array
     */
    coordsToInt = function(array) {
        return array[1] * this.w + array[0];
    }

    /**
     * Helper function which calculates an int to an coordinate array.
     * @param int
     * @returns {[number, number]}
     */
    intToCoords = function(int) {
        let x = int % this.w;
        let y = (int-x) / this.w;
        return [x, y];
    }

    convolve = function (input, width, height, kernel) {

        let output = []; // Output after convolution

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (x == 0 || y == 0 || x == width - 1 || y == height - 1) {
                    // skip boarder Pixel
                    output[(y * width) + x] = input[(y * height) + x];
                    continue;
                }
                output[(y * width) + x] =
                    input[(y - 1) * width + (x - 1)] * kernel[0] +
                    input[(y) * width + (x - 1)] * kernel[1] +
                    input[(y + 1) * width + (x - 1)] * kernel[2] +
                    input[(y - 1) * width + (x)] * kernel[3] +
                    input[(y) * width + (x)] * kernel[4] +
                    input[(y + 1) * width + (x)] * kernel[5] +
                    input[(y - 1) * width + (x + 1)] * kernel[6] +
                    input[(y) * width + (x + 1)] * kernel[7] +
                    input[(y + 1) * width + (x + 1)] * kernel[8];
            }
        }
        return output;
    }

}