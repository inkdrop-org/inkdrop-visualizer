import {
    BaseBoxShapeTool,
    BaseBoxShapeUtil,
    DefaultColorStyle,
    HTMLContainer,
    T,
    TLBaseShape,
} from '@tldraw/tldraw'
import { truncateText } from './shapeUtils'

// Define a style that can be used across multiple shapes.
// The ID (myApp:filter) must be globally unique, so we recommend prefixing it with a namespace.

export type NodeShape = TLBaseShape<
    'node',
    {
        w: number
        h: number
        borderColor: string
        backgroundColor: string
        name: string
        iconPath: string
        state: string
        numberOfChanges: number
        resourceType: string
    }
>

// Utility function to fetch an image and convert to data URL
function convertImageToDataURL(imagePath: string) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'Anonymous'; // Attempt to address CORS issues
        image.onload = () => {
            let canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            let ctx = canvas.getContext('2d');
            ctx!.drawImage(image, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        image.onerror = () => {
            reject('Could not load image');
        };
        image.src = imagePath;
    });
}

export class NodeShapeUtil extends BaseBoxShapeUtil<NodeShape> {
    static override type = 'node' as const

    static override props = {
        w: T.number,
        h: T.number,
        borderColor: T.string,
        backgroundColor: T.string,
        numberOfChanges: T.number,
        name: T.string,
        iconPath: T.string,
        state: T.string,
        resourceType: T.string,
    }

    override isAspectRatioLocked = (_shape: NodeShape) => false
    override canResize = (_shape: NodeShape) => false
    override canBind = (_shape: NodeShape) => true
    override hideRotateHandle = (_shape: NodeShape) => true


    override getDefaultProps(): NodeShape['props'] {
        return {
            w: 120,
            h: 120,
            borderColor: "black",
            backgroundColor: "white",
            numberOfChanges: 0,
            name: "AWS Service",
            iconPath: "",
            state: "no-op",
            resourceType: "AWS Service"
        }
    }


    component(shape: NodeShape) {

        return (
            <>
                <HTMLContainer
                    id={shape.id}
                    style={{
                        border: `2px solid ${shape.props.borderColor}`,
                        borderRadius: "0.25rem",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'all',
                        backgroundColor: shape.props.backgroundColor,
                    }}
                >

                    <div className={`absolute top-[14px] left-0 text-center max-w-full p-1 text-[10px] text-[#504758] truncate rounded-br`}
                    >
                        {shape.props.resourceType}
                    </div>
                    <img src={shape.props.iconPath} className='absolute bottom-4 h-16 w-16 rounded pointer-events-none select-none' />
                    <div className={`flex absolute top-0 left-0 w-full`}>
                        <div className={`grow p-1 pt-[2px] text-sm text-black truncate rounded-br text-left`}
                        >
                            {shape.props.name}
                        </div>
                        {
                            !["no-op", "read"].includes(shape.props.state) &&
                            <div
                                style={{
                                    backgroundColor: shape.props.state === "create" ? "#37BB65" :
                                        shape.props.state === "delete" ? "#E22134" : "#F2960D",
                                    fontSize: "12px"
                                }}
                                className='mt-1 mr-1 rounded-full h-4 min-w-6 text-center leading-[15px]'>
                                {shape.props.numberOfChanges}
                            </div>
                        }
                    </div>
                </HTMLContainer>

            </>

        )
    }


    async toSvg(shape: NodeShape) {
        const xmlns = 'http://www.w3.org/2000/svg';
        const padding = 5; // Padding around text
        const titleSize = 14; // Font size for text elements
        const typeSize = 10; // Font size for text elements

        // Create the main SVG group
        const g = document.createElementNS(xmlns, 'g');

        // Create the background rectangle
        const rect = document.createElementNS(xmlns, 'rect');
        rect.setAttributeNS(null, 'width', shape.props.w.toString());
        rect.setAttributeNS(null, 'height', shape.props.h.toString());
        rect.setAttributeNS(null, 'rx', '4'); // match the borderRadius from the component style
        rect.setAttributeNS(null, 'fill', shape.props.backgroundColor);
        rect.setAttributeNS(null, 'stroke', shape.props.borderColor);
        rect.setAttributeNS(null, 'stroke-width', '2');

        // Append the rectangle to the main group
        g.appendChild(rect);

        // Create the text element for the shape's name
        const nameText = document.createElementNS(xmlns, 'text');
        nameText.textContent = shape.props.name;
        nameText.setAttributeNS(null, 'x', padding.toString());
        nameText.setAttributeNS(null, 'y', "14");
        nameText.setAttributeNS(null, 'style', `font-family: sans-serif; font-size: ${titleSize}px; fill: ${shape.props.borderColor};`);
        nameText.setAttributeNS(null, 'dominant-baseline', 'middle');
        // Create the text element for the shape's resource type
        const typeText = document.createElementNS(xmlns, 'text');
        typeText.textContent = shape.props.resourceType;
        typeText.setAttributeNS(null, 'x', padding.toString());
        typeText.setAttributeNS(null, 'y', "28");
        typeText.setAttributeNS(null, 'style', `font-family: sans-serif; font-size: ${typeSize}px; fill: #504758;`);
        typeText.setAttributeNS(null, 'dominant-baseline', 'middle');

        // Truncate the text if it's too long
        truncateText(typeText, shape.props.w - 10); // Assume 5 padding on each side

        // Append the text element to the main group
        g.appendChild(typeText);

        const iconWidth = 58; // The width of the SVG icon
        const iconHeight = 58; // The height of the SVG icon
        const rectCenterX = shape.props.w / 2;
        const iconX = rectCenterX - (iconWidth / 2); // Center the icon
        const iconY = shape.props.h - iconHeight - 14; // Position the icon with a bottom margin

        // Fetch and embed the SVG icon
        try {
            const response = await fetch(shape.props.iconPath.replace(".png", ".svg")); //Use svg icons
            const svgText = await response.text();

            const iconHolder = document.createElement('div');
            iconHolder.innerHTML = svgText;
            const iconSVG = iconHolder.querySelector('svg');
            if (!iconSVG) {
                throw new Error('SVG icon not found in fetched content');
            }

            // Configure SVG to fit the specified area
            iconSVG.setAttribute('x', iconX.toString());
            iconSVG.setAttribute('y', iconY.toString());
            iconSVG.setAttribute('width', iconWidth.toString());
            iconSVG.setAttribute('height', iconHeight.toString());

            // Defining a clipPath for rounded corners
            const clipPathId = `clip-round-corners-${Math.random().toString(36).substr(2, 9)}`;
            const clipPath = document.createElementNS(xmlns, 'clipPath');
            clipPath.setAttributeNS(null, 'id', clipPathId);
            const clipRect = document.createElementNS(xmlns, 'rect');
            clipRect.setAttributeNS(null, 'x', "0");
            clipRect.setAttributeNS(null, 'y', "0");
            clipRect.setAttributeNS(null, 'width', "64");
            clipRect.setAttributeNS(null, 'height', "64");
            clipRect.setAttributeNS(null, 'rx', '4');
            clipRect.setAttributeNS(null, 'ry', '4');
            clipPath.appendChild(clipRect);
            g.appendChild(clipPath);

            // Apply the clipPath to the icon
            iconSVG.setAttributeNS(null, 'clip-path', 'url(#' + clipPathId + ')');

            g.appendChild(iconSVG);

        } catch (err) {
            console.error('Error fetching or embedding SVG icon', err);
        }

        if (!["no-op", "read"].includes(shape.props.state)) {
            const textContent = shape.props.numberOfChanges.toString();
            const fontSize = 12;
            const padding = 5; // Horizontal padding around the text
            const minimumWidth = 24;
            const height = 16; // height for the pill-shaped rectangle

            // Dynamically calculate the text width (for simplicity, this is an approximation)
            let estimatedTextWidth = textContent.length * (fontSize * 0.6);

            let totalWidth = Math.max(minimumWidth, estimatedTextWidth + (2 * padding));

            truncateText(nameText, shape.props.w - 25 - totalWidth);

            const margin = 5; // Margin from the right edge
            let rectX = shape.props.w - totalWidth - margin;

            const changesRect = document.createElementNS(xmlns, 'rect');
            changesRect.setAttributeNS(null, 'x', rectX.toString());
            changesRect.setAttributeNS(null, 'y', margin.toString());
            changesRect.setAttributeNS(null, 'width', totalWidth.toString());
            changesRect.setAttributeNS(null, 'height', height.toString());

            // rx and ry are half of the rectangle's height
            changesRect.setAttributeNS(null, 'rx', (height / 2).toString());
            changesRect.setAttributeNS(null, 'ry', (height / 2).toString());

            changesRect.setAttributeNS(null, 'fill', shape.props.state === "create" ? "#37bb65" :
                shape.props.state === "delete" ? "#e22134" : "#f2960d");


            g.appendChild(changesRect);

            // Create and add the text for the number of changes
            const changesText = document.createElementNS(xmlns, 'text');
            changesText.textContent = textContent;
            changesText.setAttributeNS(null, 'x', (rectX + totalWidth / 2).toString()); // Center the text in the rectangle
            changesText.setAttributeNS(null, 'y', (margin + height / 2 + 1).toString());
            changesText.setAttributeNS(null, 'style', `font-family: sans-serif; font-size: ${fontSize}px; fill: black; text-anchor: middle; dominant-baseline: middle;`);

            g.appendChild(changesText);
        } else {
            truncateText(nameText, shape.props.w - 25);
        }

        // Append the text element to the main group
        g.appendChild(nameText);

        // Return the SVG element <g>
        return g;
    }

    // Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here
    indicator(shape: NodeShape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

}

// Extending the base box shape tool gives us a lot of functionality for free.
export class NodeShapeTool extends BaseBoxShapeTool {
    static override id = 'node'
    static override initial = 'idle'
    override shapeType = 'node'
    props = {
        w: T.number,
        h: T.number,
        color: DefaultColorStyle,
    }
}