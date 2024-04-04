import { useState } from "react";
import Sidebar from "../sidebar/Sidebar";
import { Dependency, moduleDependencies, resourceDependencies } from "../dependencies/dependencies";
import { NodeGroup, TFVariableOutput } from "../TLDWrapper";
import DependencyUI from "../dependencies/DependenciesUI";
import { Editor } from "@tldraw/tldraw";
import { computeShading, resetShading } from "../editorHandler/shading";
import { ChangesBreakdown, getChangesBreakdown, nodeChangesToString } from "../jsonPlanManager/jsonPlanManager";
import EditorHandler from "../editorHandler/EditorHandler";
import { getMacroCategory } from "../utils/awsCategories";

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
    const [selectedModule, setSelectedModule] = useState<string>("")
    const [currentShapeId, setCurrentShapeId] = useState<string>("")
    const [moduleDrilldownData, setModuleDrilldownData] = useState<{ category: string, textToShow: string, changesBreakdown: ChangesBreakdown }[]>([])
    const [diffText, setDiffText] = useState<string>("")
    const [dependencies, setDependencies] = useState<Dependency[]>([])
    const [affected, setAffected] = useState<Dependency[]>([])
    const [selectedResourceId, setSelectedResourceId] = useState<string>("")
    const [showUnknown, setShowUnknown] = useState<boolean>(false)
    const [showUnchangedAttributes, setShowUnchangedAttributes] = useState<boolean>(false)

    const closeSidebar = () => {
        handleShapeSelectionChange("")
        editor.selectNone()
    }

    const processModuleChanges = (moduleChanges: { category: string, resourceChanges: any[] }[], newShowUnknownValue?: boolean, newShowUnchangedValue?: boolean) => {
        const categories = Array.from(new Set(moduleChanges.map((moduleChange) => moduleChange.category)))
        return categories.map((category) => {
            const resourceChanges = moduleChanges.filter((moduleChange) => moduleChange.category === getMacroCategory(category)).map((moduleChange) => moduleChange.resourceChanges).flat()
            const changesBreakdown = getChangesBreakdown(resourceChanges)
            const { textToShow } = nodeChangesToString(resourceChanges,
                newShowUnknownValue !== undefined ? newShowUnknownValue : showUnknown,
                newShowUnchangedValue !== undefined ? newShowUnchangedValue : showUnchangedAttributes)
            return {
                category,
                textToShow,
                changesBreakdown
            }
        })
    }

    const handleFrameSelection = (frameId: string, storedNodeGroups: NodeGroup[], newShowUnknownValue?: boolean, newShowUnchangedValue?: boolean) => {
        setSelectedNode(undefined)
        const childrenNodes = storedNodeGroups.filter((nodeGroup) => {
            return nodeGroup.frameShapeId === frameId
        })
        setSelectedModule(childrenNodes[0]?.moduleName || "")
        const moduleChanges = childrenNodes.map((nodeGroup) => {
            return {
                category: getMacroCategory(nodeGroup.category),
                resourceChanges: nodeGroup.nodes.map((node) => node.resourceChanges || undefined).flat().filter((s) => s !== undefined)
            }
        })
        const moduleDrilldownData = processModuleChanges(moduleChanges, newShowUnknownValue, newShowUnchangedValue)
        const { dependencies, affected } = moduleDependencies(storedNodeGroups, childrenNodes[0]?.moduleName || "root_module", variables, outputs)
        setDependencies(dependencies)
        setAffected(affected)
        setModuleDrilldownData(moduleDrilldownData)

        setShowSidebar(true)
    }

    const handleShapeSelectionChange = (shapeId: string, newShowUnknownValue?: boolean, newShowUnchangedValue?: boolean) => {
        setCurrentShapeId(shapeId)
        const element = document.querySelector(".tlui-navigation-zone") as HTMLElement
        if (!hasPlanJson || shapeId === "") {
            setSelectedNode(undefined)
            setShowSidebar(false)
            setDependencies([])
            setAffected([])
            setSelectedModule("")
            setDiffText("")
            resetShading(editor!, shapesSnapshot)
            if (element)
                element.style.display = ""
        } else if (nodeGroups && editor) {
            const shape = editor.getShape(shapeId as any)
            resetShading(editor!, shapesSnapshot)
            if (shape?.type === "frame") {
                handleFrameSelection(shapeId, nodeGroups, newShowUnknownValue, newShowUnchangedValue)
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

                computeShading(selectedNodeGroup, nodeGroups, editor!, dependencies, affected)

                const { textToShow, resourceId } = nodeChangesToString(selectedNodeGroup.nodes.map((node) => {
                    return node.resourceChanges || undefined
                }).filter((s) => s !== undefined).flat(),
                    newShowUnknownValue !== undefined ? newShowUnknownValue : showUnknown,
                    newShowUnchangedValue !== undefined ? newShowUnchangedValue : showUnchangedAttributes)

                setShowSidebar(true)

                setDiffText(textToShow || "No changes detected")
                setSelectedResourceId(resourceId || "")
            }
        }
    }

    const handleShowUnknownChange = (showUnknown: boolean) => {
        setShowUnknown(showUnknown)
        handleShapeSelectionChange(currentShapeId, showUnknown, showUnchangedAttributes)
    }

    const handleShowUnchangedAttributesChange = (showUnchangedAttributes: boolean) => {
        setShowUnchangedAttributes(showUnchangedAttributes)
        handleShapeSelectionChange(currentShapeId, showUnknown, showUnchangedAttributes)
    }

    return (
        <>
            {(selectedNode || selectedModule) && nodeGroups && editor &&
                <DependencyUI dependencies={dependencies}
                    affected={affected}
                    sidebarWidth={sidebarWidth}
                    nodeGroups={nodeGroups}
                    moduleName={selectedNode?.moduleName || selectedModule}
                    type={selectedNode ? "resource" : "module"}
                    editor={editor} />}
            {sidebarWidth > 0 &&
                <Sidebar width={sidebarWidth}
                    showUnknown={showUnknown}
                    moduleDrilldownData={moduleDrilldownData}
                    showUnchanged={showUnchangedAttributes}
                    title={selectedNode?.name || selectedModule || ""}
                    text={diffText}
                    resourceId={selectedResourceId}
                    subtitle={selectedNode?.type || ""}
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