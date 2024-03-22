import { Editor, useValue } from "@tldraw/tldraw";
import { useEffect, useState } from "react";
import { NodeGroup } from "../TLDWrapper";
import { Button } from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';

interface EditorHandlerProps {
    editor: Editor | null;
    handleShapeSelectionChange: (shapeId: string) => void;
}

const EditorHandler = ({
    editor, handleShapeSelectionChange
}: EditorHandlerProps) => {

    const buttonMargin = 5

    const [buttonCoordinates, setButtonCoordinates] = useState<{
        x: number;
        y: number;
    } | undefined>()

    const selectedShapeId = useValue("shape selection", () => {
        if (!editor) return "";
        const selectedShapes = editor.getSelectedShapes()
        if (selectedShapes.length === 1 && selectedShapes[0].type === "node") {
            return selectedShapes[0].id
        }
        else return ""
    }, [editor])

    const camera = useValue("camera", () => {
        if (!editor) return undefined
        return { ...editor.getCamera() }
    }, [editor])

    const selectionFrameChange = useValue("selection change", () => {
        if (!editor) return undefined;
        if (editor.root.getPath() === "root.select.idle" && editor.getSelectedShapes().length > 1) {
            return editor.getSelectionPageBounds()
        }
        return undefined
    }, [editor])

    useEffect(() => {
        handleShapeSelectionChange(selectedShapeId)
    }, [selectedShapeId])

    useEffect(() => {
        if (!selectionFrameChange) setButtonCoordinates(undefined)
        else {
            setButtonCoordinates(editor?.pageToScreen({
                x: selectionFrameChange.x + selectionFrameChange.w,
                y: selectionFrameChange.y + selectionFrameChange.h
            }))
        }
    }, [selectionFrameChange, camera])

    return (
        <>
            {buttonCoordinates &&
                <Button
                    onClick={() => editor?.getSvg(editor.getSelectedShapeIds()).then((svg) => {
                        if (!svg) return
                        const svgData = new XMLSerializer().serializeToString(svg)
                        const blob = new Blob([svgData], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'diagram-selection.svg';
                        a.click();
                    })}
                    variant={"contained"}
                    endIcon={<DownloadIcon />}
                    sx={{
                        "& .MuiButton-endIcon ": {
                            marginLeft: "5px",
                            marginRight: "0px",
                        },
                        position: "absolute",
                        padding: "5px 7px",
                        zIndex: 1000,
                        bottom: window.innerHeight - buttonCoordinates.y + buttonMargin,
                        right: window.innerWidth - buttonCoordinates.x + buttonMargin,
                        color: 'black',
                        borderColor: 'black',
                        border: "1px solid",
                        fontSize: "13px",
                        backgroundColor: 'white',
                        '&:hover': {
                            color: 'rgba(0, 0, 0, 0.7)',
                            borderColor: 'rgba(0, 0, 0, 0.7)',
                            backgroundColor: '#f2f2f2',
                        },
                    }
                    }
                >
                    Download SVG</Button >
            }
        </>
    )
}

export default EditorHandler;