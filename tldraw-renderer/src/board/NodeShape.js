"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeShapeTool = exports.NodeShapeUtil = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const tldraw_1 = require("@tldraw/tldraw");
class NodeShapeUtil extends tldraw_1.BaseBoxShapeUtil {
    constructor() {
        super(...arguments);
        this.isAspectRatioLocked = (_shape) => false;
        this.canResize = (_shape) => false;
        this.canBind = (_shape) => true;
        this.hideRotateHandle = (_shape) => true;
    }
    getDefaultProps() {
        return {
            w: 120,
            h: 120,
            borderColor: "black",
            backgroundColor: "white",
            name: "AWS Service",
            iconPath: "",
        };
    }
    component(shape) {
        return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)(tldraw_1.HTMLContainer, { id: shape.id, style: {
                    border: `2px solid ${shape.props.borderColor}`,
                    borderRadius: "0.25rem",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'all',
                    backgroundColor: shape.props.backgroundColor,
                }, children: [(0, jsx_runtime_1.jsx)("div", { className: `absolute top-0 left-0 text-center max-w-full p-1 text-sm text-black truncate rounded-br`, children: shape.props.name }), (0, jsx_runtime_1.jsx)("img", { src: shape.props.iconPath, className: 'absolute bottom-4 h-16 w-16 rounded pointer-events-none select-none' })] }) }));
    }
    // Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here
    indicator(shape) {
        return (0, jsx_runtime_1.jsx)("rect", { width: shape.props.w, height: shape.props.h });
    }
}
exports.NodeShapeUtil = NodeShapeUtil;
NodeShapeUtil.type = 'node';
NodeShapeUtil.props = {
    w: tldraw_1.T.number,
    h: tldraw_1.T.number,
    borderColor: tldraw_1.T.string,
    backgroundColor: tldraw_1.T.string,
    name: tldraw_1.T.string,
    iconPath: tldraw_1.T.string,
};
// Extending the base box shape tool gives us a lot of functionality for free.
class NodeShapeTool extends tldraw_1.BaseBoxShapeTool {
    constructor() {
        super(...arguments);
        this.shapeType = 'node';
        this.props = {
            w: tldraw_1.T.number,
            h: tldraw_1.T.number,
            // You can re-use tldraw built-in styles...
            color: tldraw_1.DefaultColorStyle,
            // ...or your own custom styles.
        };
    }
}
exports.NodeShapeTool = NodeShapeTool;
NodeShapeTool.id = 'node';
NodeShapeTool.initial = 'idle';
