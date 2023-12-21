import { Button, Tooltip } from '@mui/material'
import {
    BaseBoxShapeTool,
    BaseBoxShapeUtil,
    DefaultColorStyle,
    HTMLContainer,
    StyleProp,
    T,
    TLBaseShape,
} from '@tldraw/tldraw'
import { useEffect, useRef } from 'react'
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
    }
>

export class NodeShapeUtil extends BaseBoxShapeUtil<NodeShape> {
    static override type = 'node' as const

    static override props = {
        w: T.number,
        h: T.number,
        borderColor: T.string,
        backgroundColor: T.string,
        name: T.string,
        iconPath: T.string,
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
            name: "AWS Service",
            iconPath: "",
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
                    <div className={`absolute top-0 left-0 text-center max-w-full p-1 text-sm text-black truncate rounded-br`}
                    >
                        {shape.props.name}
                    </div>
                    <img src={shape.props.iconPath} className='absolute bottom-4 h-16 w-16 rounded pointer-events-none select-none' />

                </HTMLContainer>

            </>

        )
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
        // You can re-use tldraw built-in styles...
        color: DefaultColorStyle,
        // ...or your own custom styles.
    }
}