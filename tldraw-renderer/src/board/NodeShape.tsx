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
                                className='mt-1 mr-1 rounded-full h-4 min-w-6 text-center leading-[14px]'>
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

        const iconWidth = 58; // The width of the image

        const rectCenterX = shape.props.w / 2;
        const iconX = rectCenterX - (iconWidth / 2); // The x coordinate for the centered image

        // Calculate the y coordinate to position the image with a 30px margin from the bottom
        const iconHeight = 58; // The height of the image
        const iconY = shape.props.h - iconHeight - 14; // The y coordinate for the positioned image with bottom margin


        // Check if the PNG image can be converted to a data URL in the browser
        const icon = document.createElementNS(xmlns, 'image');
        try {
            const dataURL = await convertImageToDataURL(shape.props.iconPath);
            icon.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataURL as string);
        } catch (err) {
            console.error('Error converting image to data URL', err);
        }
        icon.setAttributeNS(null, 'x', iconX.toString());
        icon.setAttributeNS(null, 'y', iconY.toString());
        icon.setAttributeNS(null, 'width', iconWidth.toString());
        icon.setAttributeNS(null, 'height', iconHeight.toString());

        // Create a <clipPath> element to apply rounded corners to the image
        const clipPath = document.createElementNS(xmlns, 'clipPath');
        clipPath.setAttributeNS(null, 'id', 'rounded-corners');
        const clipRect = document.createElementNS(xmlns, 'rect');
        clipRect.setAttributeNS(null, 'x', iconX.toString());
        clipRect.setAttributeNS(null, 'y', iconY.toString());
        clipRect.setAttributeNS(null, 'width', iconWidth.toString());
        clipRect.setAttributeNS(null, 'height', iconHeight.toString());
        clipRect.setAttributeNS(null, 'rx', '4'); // Set the desired radius for rounded corners
        clipRect.setAttributeNS(null, 'ry', '4');
        clipPath.appendChild(clipRect);
        g.appendChild(clipPath);

        // Apply the clipPath to the image
        icon.setAttributeNS(null, 'clip-path', 'url(#rounded-corners)');

        // Add an 'onerror' event to handle loading errors
        icon.onerror = (e) => {
            console.error('Failed to load image', e);
        };

        g.appendChild(icon);

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