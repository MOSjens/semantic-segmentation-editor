import SseTool from "./SseTool";
import Paper from "paper";
import simplify from "simplify-js";

export default class SseIntelligentScissors extends SseTool {
    constructor(editor) {
        super(editor);
        this.cursor = "crosshair";
        this.bindCallbacks();
    }

    onMouseDrag(event) {
        // If the mouse is moved.
        if (!this.isLeftButton(event) || event.modifiers.space)
            return super.viewDrag(event);
    }

    onMouseDown(event) {
        if (!this.isLeftButton(event) || event.modifiers.space)
            return super.viewDown(event);
        alert("Hello World");
    }
}