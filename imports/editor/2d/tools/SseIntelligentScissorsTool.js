import SseTool from "./SseTool";
import IntelligentScissors from "./intelligentScissors";
import Paper from "paper";
import simplify from "simplify-js";

export default class SseIntelligentScissors extends SseTool {
    constructor(editor) {
        super(editor);
        this.imageInfo = null;
        this.mask = null;
        this.costMatrix = null;
        this.cursor = "crosshair";
        this.bindCallbacks();
    }

    initCanvas(img) {
        const cvs = document.getElementById("filterCanvas"); // Canvas which holds the image?
        const cvs2 = document.getElementById("rasterCanvas"); // Canvas in which we render the polygon line?
        this.imageInfo = {
            width: img.width,
            height: img.height,
            context: cvs.getContext("2d"),
            context2: cvs2.getContext("2d")
        };
        this.mask = null;

        const tempCtx = document.createElement("canvas").getContext("2d"); // To draw on the canvas
        tempCtx.canvas.width = this.imageInfo.width;
        tempCtx.canvas.height = this.imageInfo.height;
        tempCtx.drawImage(img, 0, 0);
        this.imageInfo.data = tempCtx.getImageData(0, 0, this.imageInfo.width, this.imageInfo.height);

        // When the Image is loaded, calculate the cost function
        this.costMatrix = IntelligentScissors.calculateCosts(this.imageInfo.data);
    }

    baseLayer() {
        return (this.editor.mainLayer.children.length == 0 || this.editor.mainLayer.children.filter(x => x.visible).length == 0) ? this.editor.mainLayer : this.editor.frontLayer;
    }

    // When Filters are applied to the image
    setImageData(imageData) {
        if (this.polygon)
            this.polygon.remove();
        this.imageInfo.data = imageData;
        //this.process();
        this.costMatrix = IntelligentScissors.calculateCosts(this.imageInfo.data);
    }


    onMouseDrag(event) {
        if (!this.isLeftButton(event) || event.modifiers.space)
            return super.viewDrag(event);
    }

    onMouseDown(event) {
        if (!this.isLeftButton(event) || event.modifiers.space)
            return super.viewDown(event);
        const pt = this.baseLayer().globalToLocal(event.point); // get position of the mouse
        // For debugging:
        console.log("gray image: " + this.costMatrix[ Math.round(pt.y) * this.imageInfo.width + Math.round(pt.x)])
        //IntelligentScissors.setSeedPoint(this.imageInfo, Math.round(pt.x), Math.round(pt.y));
    }
}