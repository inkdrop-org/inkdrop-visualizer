import { Editor } from "@tldraw/tldraw";
import { NodeGroup } from "../TLDWrapper";

export const computeShading = (selectedNode: NodeGroup, nodeGroups: NodeGroup[], editor: Editor) => {
    const editorShapes = editor.getCurrentPageShapes()
    nodeGroups.forEach((node) => {
        const shape = editorShapes.find((shape) => shape.id.split(":").length === 3 && shape.id.split(":")[1] === node.id)
        if (shape) {
            if (node.id !== selectedNode.id &&
                !node.connectionsIn.some((connectedId) => connectedId === selectedNode.id) &&
                !node.connectionsOut.some((connectedId) => connectedId === selectedNode.id)) {
                editor.updateShape({ ...shape, opacity: 0.2 })
            } else {
                editor.updateShape({ ...shape, opacity: 1 })
            }
        }
    });
    editorShapes.filter((shape) => shape.type === "arrow").forEach((shape) => {
        const fromId = (shape.props as any).start?.boundShapeId
        const toId = (shape.props as any).end?.boundShapeId
        editor.updateShape({ id: shape.id, type: "arrow", opacity: Math.min(editor.getShape(fromId)?.opacity || 0, editor.getShape(toId)?.opacity || 0) })
    })
}

export const resetShading = (editor: Editor, shapesSnapshot: string) => {
    if (shapesSnapshot) {
        const oldShapes = JSON.parse(shapesSnapshot)
        const currentShapes = editor.getCurrentPageShapes()
        currentShapes.forEach((shape: any) => {
            const oldShape = oldShapes.find((oldShape: any) => oldShape.id === shape.id)
            if (oldShape) {
                editor.updateShape({ id: shape.id, type: shape.type, opacity: oldShape.opacity })
            }
        })
    }
}