import { Editor, useValue } from "@tldraw/tldraw";
import { useEffect } from "react";

interface EditorHandlerProps {
    editor: Editor | null;
    handleShapeSelectionChange: (shapeId: string) => void;
}

const EditorHandler = ({
    editor, handleShapeSelectionChange
}: EditorHandlerProps) => {
    const selectedShapeId = useValue("shape selection", () => {
        if (!editor) return "";
        const selectedShapes = editor.getSelectedShapes()
        if (selectedShapes.length === 1 && selectedShapes[0].type === "node") {
            return selectedShapes[0].id
        }
        else return ""
    }, [editor])

    useEffect(() => {
        handleShapeSelectionChange(selectedShapeId)
    }, [selectedShapeId])

    return (
        <>
        </>
    )
}

export default EditorHandler;