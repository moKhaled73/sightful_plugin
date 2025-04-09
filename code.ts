// Check if a frame is selected before opening the plugin
if (figma.currentPage.selection.length === 0 || figma.currentPage.selection[0].type !== "FRAME") {
    figma.notify("You must select a frame before running the plugin.");
    figma.closePlugin();
} else {
    figma.showUI(__html__, { width: 1100, height: 700 });
}

// Function to extract layer structure
function extractLayerStructure(node: SceneNode): any {
    let layer: any = {
        id: node.id,
        name: node.name,
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
    };

    // Extract fills (color, gradient)
    if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
        layer.fills = node.fills.map((fill: Paint) => {
            if (fill.type === "SOLID" && "color" in fill) {
                return {
                    type: "SOLID",
                    color: {
                        r: fill.color.r,
                        g: fill.color.g,
                        b: fill.color.b
                    },
                    opacity: "opacity" in fill ? fill.opacity : 1
                };
            }
            return fill; // Keep other fill types as they are
        });
    }

    // Extract stroke details
    if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
        layer.strokes = node.strokes.map((stroke: Paint) => ({
            type: stroke.type,
            color: "color" in stroke ? stroke.color : null,
            thickness: "strokeWeight" in node ? (node as any).strokeWeight : null
        }));
    }

    // Extract text properties if it's a text node
    if (node.type === "TEXT") {
        const textNode = node as TextNode;
        layer.text = textNode.characters;
        layer.fontSize = textNode.fontSize;

        if (typeof textNode.fontName !== "symbol") {
            layer.fontFamily = (textNode.fontName as FontName).family;
        }

        layer.textAlign = textNode.textAlignHorizontal;
    }

    // Extract child layers if it's a frame or group
    if ("children" in node) {
        layer.children = node.children.map(extractLayerStructure);
    }

    return layer;
}

// Listen to messages from the UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === "getSelectedFrame") {
        const selection = figma.currentPage.selection[0];

        if (selection && selection.type === "FRAME") {
            // Export frame as image
            const image = await selection.exportAsync({ format: "PNG" });
            const base64Image = `data:image/png;base64,${figma.base64Encode(image)}`;

            // Extract layer structure
            const layerStructure = extractLayerStructure(selection);

            // Send both image and layer structure to UI
            figma.ui.postMessage({ 
                type: "selectedFrameData", 
                image: base64Image, 
                layerStructure 
            });
        } 
         else {
            figma.ui.postMessage({ type: "selectedFrameData", image: null, layerStructure: null });
        }
    } else if(msg.type === 'close') {
        if(msg.status === 'info') {
            figma.notify("select another desing another design to evaluate it");
            figma.closePlugin();
        } else if (msg.status === 'error') {
            figma.notify("Some thing went wrong please, try again later")
            figma.closePlugin();
        }
    }
};
