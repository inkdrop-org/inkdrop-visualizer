import { useState } from "react";
import Sidebar from "../sidebar/Sidebar";
import { Dependency, resourceDependencies } from "../dependencies/dependencies";
import { NodeGroup, TFVariableOutput } from "../TLDWrapper";
import DependencyUI from "../dependencies/DependenciesUI";
import { Editor } from "@tldraw/tldraw";
import { computeShading, resetShading } from "../editorHandler/shading";
import { ChangesBreakdown, getChangesBreakdown, nodeChangesToString } from "../jsonPlanManager/jsonPlanManager";
import EditorHandler from "../editorHandler/EditorHandler";

interface SelectionHandlerProps {
    editor: Editor,
    nodeGroups: NodeGroup[] | undefined
    sidebarWidth: number
    setShowSidebar: (showSidebar: boolean) => void
    shapesSnapshot: string
    hasPlanJson: boolean
    variables: TFVariableOutput[]
    outputs: TFVariableOutput[]
}

const SelectionHandler = ({
    editor,
    nodeGroups,
    sidebarWidth,
    setShowSidebar,
    shapesSnapshot,
    hasPlanJson,
    variables,
    outputs
}: SelectionHandlerProps) => {
    const [selectedNode, setSelectedNode] = useState<NodeGroup | undefined>()
    const [moduleDrilldownData, setModuleDrilldownData] = useState<{ category: string, textToShow: string, changesBreakdown: ChangesBreakdown }[]>([])
    const [diffText, setDiffText] = useState<string>("")
    const [dependencies, setDependencies] = useState<Dependency[]>([])
    const [affected, setAffected] = useState<Dependency[]>([])
    const [selectedVarOutput, setSelectedVarOutput] = useState<TFVariableOutput | undefined>()
    const [selectedResourceId, setSelectedResourceId] = useState<string>("")
    const [showUnknown, setShowUnknown] = useState<boolean>(false)
    const [showUnchangedAttributes, setShowUnchangedAttributes] = useState<boolean>(false)

    const closeSidebar = () => {
        handleShapeSelectionChange("")
        editor.selectNone()
    }

    const processModuleChanges = (moduleChanges: { category: string, resourceChanges: any[] }[]) => {
        const categories = Array.from(new Set(moduleChanges.map((moduleChange) => moduleChange.category)))
        return categories.map((category) => {
            const resourceChanges = moduleChanges.filter((moduleChange) => moduleChange.category === category).map((moduleChange) => moduleChange.resourceChanges).flat()
            const changesBreakdown = getChangesBreakdown(resourceChanges)
            const { textToShow } = nodeChangesToString(resourceChanges, showUnknown, showUnchangedAttributes)
            return {
                category,
                textToShow,
                changesBreakdown
            }
        })
    }

    const handleFrameSelection = (frameId: string, storedNodeGroups: NodeGroup[]) => {
        setSelectedNode(undefined)
        const childrenNodes = storedNodeGroups.filter((nodeGroup) => {
            return nodeGroup.frameShapeId === frameId
        })
        const moduleChanges = childrenNodes.map((nodeGroup) => {
            return {
                category: nodeGroup.category,
                resourceChanges: nodeGroup.nodes.map((node) => node.resourceChanges || undefined).flat().filter((s) => s !== undefined)
            }
        })
        const moduleDrilldownData = processModuleChanges(moduleChanges)
        setModuleDrilldownData(moduleDrilldownData)

        setShowSidebar(true)
    }

    const handleShapeSelectionChange = (shapeId: string) => {
        const element = document.querySelector(".tlui-navigation-zone") as HTMLElement
        setSelectedVarOutput(undefined)
        if (!hasPlanJson || shapeId === "") {
            setSelectedNode(undefined)
            setShowSidebar(false)
            setDependencies([])
            setAffected([])
            setDiffText("")
            resetShading(editor!, shapesSnapshot)
            if (element)
                element.style.display = ""
        } else if (nodeGroups && editor) {
            const shape = editor.getShape(shapeId as any)
            if (shape?.type === "frame") {
                handleFrameSelection(shapeId, nodeGroups)
            } else {
                // remove shape: prefix, and date suffix
                const shapeIdWithoutPrefixAndSuffix = shapeId.split(":")[1]
                const selectedNodeGroup = nodeGroups?.filter((nodeGroup) => {
                    return nodeGroup.id === shapeIdWithoutPrefixAndSuffix
                })[0]
                setModuleDrilldownData([])
                setSelectedNode(selectedNodeGroup)

                if (element)
                    element.style.display = "none"

                const { dependencies, affected } = resourceDependencies(nodeGroups, selectedNodeGroup, variables, outputs)
                setDependencies(dependencies)
                setAffected(affected)

                resetShading(editor!, shapesSnapshot)
                computeShading(selectedNodeGroup, nodeGroups, editor!, dependencies, affected)

                const { textToShow, resourceId } = nodeChangesToString(selectedNodeGroup.nodes.map((node) => {
                    return node.resourceChanges || undefined
                }).filter((s) => s !== undefined).flat(), showUnknown, showUnchangedAttributes)

                setShowSidebar(true)

                setDiffText(textToShow || "No changes detected")
                setSelectedResourceId(resourceId || "")
            }
        }
    }

    const refreshChangesDrilldown = (showUnknown: boolean, showUnchangedAttributes: boolean) => {
        if (nodeGroups) {
            const shapeIdWithoutPrefixAndSuffix = editor?.getSelectedShapeIds()[0].split(":")[1]

            const { textToShow, resourceId } = nodeChangesToString(nodeGroups?.filter((nodeGroup) => {
                return nodeGroup.id === shapeIdWithoutPrefixAndSuffix
            })[0].nodes.map((node) => {
                return node.resourceChanges || undefined
            }).filter((s) => s !== undefined).flat(), showUnknown, showUnchangedAttributes)

            setDiffText(textToShow || "No changes detected")
            setSelectedResourceId(resourceId || "")

        }
    }

    const handleShowUnknownChange = (showUnknown: boolean) => {
        setShowUnknown(showUnknown)
        refreshChangesDrilldown(showUnknown, showUnchangedAttributes)
    }

    const handleShowUnchangedAttributesChange = (showUnchangedAttributes: boolean) => {
        setShowUnchangedAttributes(showUnchangedAttributes)
        refreshChangesDrilldown(showUnknown, showUnchangedAttributes)
    }

    return (
        <>
            {selectedNode && nodeGroups && editor &&
                <DependencyUI dependencies={dependencies}
                    affected={affected}
                    sidebarWidth={sidebarWidth}
                    nodeGroups={nodeGroups}
                    selectedNode={selectedNode}
                    editor={editor} />}
            {sidebarWidth > 0 &&
                <Sidebar width={sidebarWidth}
                    showUnknown={showUnknown}
                    moduleDrilldownData={moduleDrilldownData}
                    showUnchanged={showUnchangedAttributes}
                    title={selectedVarOutput?.name || selectedNode?.name || ""}
                    text={diffText}
                    resourceId={selectedResourceId}
                    subtitle={selectedVarOutput ? selectedVarOutput.hasOwnProperty("outputReferences") ? "Output" : "Variable" : selectedNode?.type || ""}
                    closeSidebar={() => closeSidebar()}
                    handleShowUnknownChange={handleShowUnknownChange}
                    handleShowUnchangedChange={handleShowUnchangedAttributesChange}
                />
            }
            <EditorHandler
                editor={editor}
                handleShapeSelectionChange={handleShapeSelectionChange} />
        </>
    )
}

export default SelectionHandler;