import { MutableRefObject, useEffect, useState } from "react";
import Sidebar from "../sidebar/Sidebar";
import { Dependency, moduleDependencies, resourceDependencies } from "../dependencies/dependencies";
import { NodeGroup, RenderInput, TFVariableOutput, Tag } from "../TLDWrapper";
import DependencyUI from "../dependencies/DependenciesUI";
import { Box2d, Editor, TLShapeId } from "@tldraw/tldraw";
import { computeShading, resetShading } from "../editorHandler/shading";
import { ChangesBreakdown, getChangesBreakdown, nodeChangesToString } from "../jsonPlanManager/jsonPlanManager";
import EditorHandler from "../editorHandler/EditorHandler";
import { getMacroCategory } from "../utils/awsCategories";
import NavigationBar from "../navigation/NavigationBar";
import { IconButton, TextField } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import { getResourceCode } from "../utils/storage";
import { promptBuild } from "../prompt/promptBuild";

interface SelectionHandlerProps {
    editor: Editor | null,
    nodeGroups: NodeGroup[] | undefined
    sidebarWidth: number
    setShowSidebar: (showSidebar: boolean) => void
    shapesSnapshot: string
    hasPlanJson: boolean
    variables: TFVariableOutput[]
    outputs: TFVariableOutput[]
    renderInput: RenderInput | undefined
    tagsRef: MutableRefObject<Tag[]>
    selectedTagsRef: MutableRefObject<string[]>
    categoriesRef: MutableRefObject<string[]>
    deselectedCategoriesRef: MutableRefObject<string[]>
    refreshWhiteboard: () => void
}

const SelectionHandler = ({
    editor,
    nodeGroups,
    sidebarWidth,
    setShowSidebar,
    shapesSnapshot,
    hasPlanJson,
    variables,
    outputs,
    renderInput,
    tagsRef,
    selectedTagsRef,
    categoriesRef,
    deselectedCategoriesRef,
    refreshWhiteboard
}: SelectionHandlerProps) => {
    const [selectedNode, setSelectedNode] = useState<NodeGroup | undefined>()
    const [selectedModule, setSelectedModule] = useState<string>("")
    const [textFieldCoordinates, setTextFieldCoordinates] = useState<any | undefined>()
    const [request, setRequest] = useState<string>("")
    const [modulesTree, setModulesTree] = useState<any>()
    const [filtersTree, setFiltersTree] = useState<any>()
    const [currentShapeId, setCurrentShapeId] = useState<string>("")
    const [moduleDrilldownData, setModuleDrilldownData] = useState<{ category: string, textToShow: string, changesBreakdown: ChangesBreakdown }[]>([])
    const [diffText, setDiffText] = useState<string>("")
    const [dependencies, setDependencies] = useState<Dependency[]>([])
    const [affected, setAffected] = useState<Dependency[]>([])
    const [selectedResourceId, setSelectedResourceId] = useState<string>("")
    const [showAll, setShowAll] = useState<boolean>(false)

    useEffect(() => {
        setFiltersTree(generateFiltersTree())
        setModulesTree(generateModulesTree())
    }, [nodeGroups])

    const closeSidebar = () => {
        handleShapeSelectionChange("")
        editor!.selectNone()
    }

    const generateModulesTree = () => {
        const modulesTree: any = {
            root: null
        }
        nodeGroups?.forEach((nodeGroup) => {
            if (nodeGroup.moduleName) {
                if (nodeGroup.parentModules.length === 0) {
                    if (!modulesTree.root) {
                        modulesTree.root = {}
                    }
                    if (!modulesTree.root[nodeGroup.moduleName]) {
                        modulesTree.root[nodeGroup.moduleName] = {}
                    }
                    modulesTree.root[nodeGroup.moduleName][nodeGroup.type + "." + nodeGroup.name] = null
                }
                else {
                    let currentModule = modulesTree.root
                    nodeGroup.parentModules.forEach((parentModule) => {
                        if (!currentModule[parentModule]) {
                            currentModule[parentModule] = {}
                        }
                        currentModule = currentModule[parentModule]
                    })
                    if (!currentModule[nodeGroup.moduleName]) {
                        currentModule[nodeGroup.moduleName] = {}
                    }
                    currentModule[nodeGroup.moduleName][nodeGroup.type + "." + nodeGroup.name] = null
                }
            }
        })
        return modulesTree
    }

    const generateFiltersTree = () => {
        const filtersTree: any = {
            root: {
                "Select Filters": {
                    "Categories": {},
                    "Tags": {}
                }
            }
        }
        categoriesRef.current.forEach((category) => {
            filtersTree.root["Select Filters"]["Categories"][category] = null
        })
        tagsRef.current.forEach((tag) => {
            filtersTree.root["Select Filters"]["Tags"][tag.name] = null
        })
        return filtersTree
    }

    const processModuleChanges = (moduleChanges: { category: string, resourceChanges: any[] }[], newShowAllValue?: boolean) => {
        const categories = Array.from(new Set(moduleChanges.map((moduleChange) => moduleChange.category)))
        return categories.map((category) => {
            const resourceChanges = moduleChanges.filter((moduleChange) => moduleChange.category === getMacroCategory(category)).map((moduleChange) => moduleChange.resourceChanges).flat()
            const changesBreakdown = getChangesBreakdown(resourceChanges)
            const { textToShow } = nodeChangesToString(resourceChanges,
                newShowAllValue !== undefined ? newShowAllValue : showAll)
            return {
                category,
                textToShow,
                changesBreakdown
            }
        })
    }

    const isNestedChildOfFrame = (nodeFrameId: string, frameId: string): boolean => {
        if (!nodeFrameId) return false
        if (nodeFrameId === frameId) {
            return true
        }
        const parentFrame = editor!.getShapeParent(nodeFrameId as TLShapeId)
        if (parentFrame) {
            return isNestedChildOfFrame(parentFrame.id, frameId)
        }
        return false
    }

    const handleFrameSelection = (frameId: string, storedNodeGroups: NodeGroup[], newShowAllValue?: boolean) => {
        setSelectedNode(undefined)
        const childrenNodes = storedNodeGroups.filter((nodeGroup) => {
            return nodeGroup.frameShapeId && isNestedChildOfFrame(nodeGroup.frameShapeId, frameId)
        })
        const moduleName = (editor!.getShape(frameId as TLShapeId)?.props as any).name || ""
        setSelectedModule(moduleName)
        const moduleChanges = childrenNodes.map((nodeGroup) => {
            return {
                category: getMacroCategory(nodeGroup.category),
                resourceChanges: nodeGroup.nodes.map((node) => node.resourceChanges || undefined).flat().filter((s) => s !== undefined)
            }
        })
        const moduleDrilldownData = processModuleChanges(moduleChanges, newShowAllValue)
        const { dependencies, affected } = moduleDependencies(storedNodeGroups, moduleName || "root_module", variables, outputs)
        setDependencies(dependencies)
        setAffected(affected)
        setModuleDrilldownData(moduleDrilldownData)

        setShowSidebar(true)
    }

    const submitRequest = async () => {
        const selectedResourceCode = await getResourceCode([selectedNode?.id || ""])

        const dependencyIds = [...dependencies, ...affected].filter((dep) => {
            return dep.type === "resource"
        }).map((dep) => {
            return dep.module && dep.module !== "root_module" ? "module." + dep.module + "." + dep.name : dep.name
        })

        const dependenciesCode = await getResourceCode(dependencyIds)
        const dependenciesIdAndCode = dependencyIds.map((id, index) => {
            return {
                id,
                code: dependenciesCode[index]
            }
        })
        console.log(promptBuild(request, {
            id: selectedNode?.id || "",
            code: selectedResourceCode
        }, dependenciesIdAndCode))
    }

    const handleShapeSelectionChange = (shapeId: string, newShowAllValue?: boolean) => {
        setCurrentShapeId(shapeId)
        const element = document.querySelector(".tlui-navigation-zone") as HTMLElement
        setTextFieldCoordinates(undefined)
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
            if (element)
                element.style.display = "none"
            const shape = editor.getShape(shapeId as any)
            resetShading(editor!, shapesSnapshot)
            if (shape?.type === "frame") {
                handleFrameSelection(shapeId, nodeGroups, newShowAllValue)
            } else {
                // remove shape: prefix, and date suffix
                const shapeIdWithoutPrefixAndSuffix = shapeId.split(":")[1]
                const selectedNodeGroup = nodeGroups?.filter((nodeGroup) => {
                    return nodeGroup.id === shapeIdWithoutPrefixAndSuffix
                })[0]
                const selectedShapeBounds = editor.getShapePageBounds(shapeId as TLShapeId)!
                setTextFieldCoordinates(editor?.pageToScreen({
                    x: selectedShapeBounds.x + selectedShapeBounds.w / 2,
                    y: selectedShapeBounds.y + selectedShapeBounds.h
                }))
                setModuleDrilldownData([])
                setSelectedNode(selectedNodeGroup)

                const { dependencies, affected } = resourceDependencies(nodeGroups, selectedNodeGroup, variables, outputs)
                setDependencies(dependencies)
                setAffected(affected)

                computeShading(selectedNodeGroup, nodeGroups, editor!, dependencies, affected)

                const { textToShow, resourceId } = nodeChangesToString(selectedNodeGroup.nodes.map((node) => {
                    return node.resourceChanges || undefined
                }).filter((s) => s !== undefined).flat(),
                    newShowAllValue !== undefined ? newShowAllValue : showAll)

                setShowSidebar(true)

                setDiffText(textToShow || "No changes detected")
                setSelectedResourceId(resourceId || "")
            }
        }
    }

    const handleShowAllChange = (showAll: boolean) => {
        setShowAll(showAll)
        handleShapeSelectionChange(currentShapeId, showAll)
    }

    const centerEditor = (shapeId: string) => {
        editor!.centerOnPoint({
            x: editor!.getShapePageBounds(shapeId as TLShapeId)!.x + (editor!.getShape(shapeId as TLShapeId)!.props as any).w / 2,
            y: editor!.getShapePageBounds(shapeId as TLShapeId)!.y + (editor!.getShape(shapeId as TLShapeId)!.props as any).h / 2
        }, { duration: 300 })
    }

    const selectModule = (moduleName: string) => {
        const frameId = nodeGroups?.find((nodeGroup) => nodeGroup.moduleName === moduleName)?.frameShapeId
        if (frameId) {
            editor!.select(frameId as TLShapeId)
            centerEditor(frameId)
        }
    }

    const selectResource = (resourceType: string, resourceName: string) => {
        const node = nodeGroups?.find((nodeGroup) => nodeGroup.type === resourceType && nodeGroup.name === resourceName)
        if (node) {
            editor!.select((node.shapeId || "") as TLShapeId)
            centerEditor(node.shapeId || "")
        }
    }

    return (
        <>
            {
                textFieldCoordinates &&
                <div className="bg-white absolute z-[2000] translate-x-[-50%] flex"
                    style={
                        {
                            top: textFieldCoordinates.y,
                            left: textFieldCoordinates.x,
                        }
                    }
                >
                    <TextField size="small" value={request} onChange={(e) => setRequest(e.target.value)} />
                    <IconButton onClick={() => submitRequest()}>
                        <SendIcon />
                    </IconButton>
                </div>
            }
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
                    showAll={showAll}
                    moduleDrilldownData={moduleDrilldownData}
                    title={selectedNode?.name || selectedModule || ""}
                    text={diffText}
                    resourceId={selectedResourceId}
                    subtitle={selectedNode?.type || ""}
                    closeSidebar={() => closeSidebar()}
                    handleShowAllChange={handleShowAllChange}
                />
            }
            <NavigationBar
                modulesTree={modulesTree}
                filtersTree={filtersTree}
                selectModule={selectModule}
                selectResource={selectResource}
                selectedModule={selectedModule}
                nodeGroups={nodeGroups}
                selectedTagsRef={selectedTagsRef}
                deselectedCategoriesRef={deselectedCategoriesRef}
                refreshWhiteboard={refreshWhiteboard}
                renderInput={renderInput}
            />
            {editor &&
                <EditorHandler
                    editor={editor}
                    handleShapeSelectionChange={handleShapeSelectionChange} />
            }
        </>
    )
}

export default SelectionHandler;