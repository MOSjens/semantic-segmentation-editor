// Intelligent Scissors implementation
//
// This implementation is based on the paper:
// "Intelligent Scissors for Image Composition", Eric N. Mortensen and
//  William A. Barrett, Brigham Young University.
//
// by Jens Reinhart


export default class IntelligentScissors {

    constructor(image) {
        this.w = null; // Image width
        this.h = null; // Image height
        this.grayData = []; // Image as Gray Image
        this.zeroCrossings = []; // Binary matrix with zero crossing
        this.sobelX = []; // Image after sobel filter in x direction
        this.sobelY = []; // Image after sobel filter in y direction
        this.gradientMagnitude = [];
        this.costMatrix = [];

        this.initCosts(image);
    }

    initCosts = function (image) {
        var data = image.data, // Image Data as array in form [Red, Green, Blue, Alpha]
            gaussian = [], // Image after Gaussian convolution
            laplace = [], // Image after Laplace convolution
            maxG = null; // max(G) value
        this.w = image.width;
        this.h = image.height;


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
        // TODO use bigger gaussian kernel for better results
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


        // For debugging
        for (let i = 0; i < this.w * this.h; i++) {
            var val = this.gradientMagnitude[i] * 255;
            data[i * 4] = val;
            data[i * 4 + 1] = val;
            data[i * 4 + 2] = val;
        }

        this.costMatrix = data;
    };

    getGradientDirection = function(px, py, qx, qy) {
         let Dp = [this.sobelY[py * this.w + px], -this.sobelX[py * this.w + px]];
         let Dq = [this.sobelY[qy * this.w + qx], -this.sobelX[qy * this.w + qx]];

         let Lpq = [qx - px, qy - py];
         if (Lpq[0] != 0 && Lpq[1] != 0) {
             // Calculate unit vector
             Lpq[0] = Lpq[0] * Math.sqrt(0.5);
             Lpq[1] = Lpq[1] * Math.sqrt(0.5);
         }

         if (Math.dot(Dp, Lpq) < 0) {
             Lpq = [px - qx, py - qy];
             if (Lpq[0] != 0 && Lpq[1] != 0) {
                 // Calculate unit vector
                 Lpq[0] = Lpq[0] * Math.sqrt(0.5);
                 Lpq[1] = Lpq[1] * Math.sqrt(0.5);
             }
         }

         let DpLpq = Math.dot(Dp, Lpq);
         let LpqDq = Math.dot(Lpq, Dq);

         return (1/Math.PI) * (Math.acos(DpLpq) + Math.acos(LpqDq));
    }

    setSeedPoint = function (image, px, py) {


        return null;
    };

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

    getCostMatrix() {
        return this.costMatrix;
    }
}