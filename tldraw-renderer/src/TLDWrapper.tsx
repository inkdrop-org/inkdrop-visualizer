import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeShapeUtil } from './board/NodeShape';
import { Editor, TLShapeId, TLStoreOptions, Tldraw, createTLStore, defaultShapeUtils, throttle } from '@tldraw/tldraw';
import dagre from "dagre"
import Papa from "papaparse"
import { getAssetUrls } from '@tldraw/assets/selfHosted';
import { NodeModel, RootGraphModel, SubgraphModel, fromDot } from "ts-graphviz"
import { terraformResourcesCsv } from './terraformResourcesCsv';
import '@tldraw/tldraw/tldraw.css'
import { getData, sendData } from './utils/storage';
import EditorHandler from './editorHandler/EditorHandler';
import { nodeChangesToString } from './jsonPlanManager/jsonPlanManager';
import Sidebar from './sidebar/Sidebar';
import ToggleLayers from './layers/ToggleLayers';
import { computeLayout } from './layout/computeLayout';
import { getVariablesAndOutputs } from './variablesAndOutputs/variablesAndOutputs';
import { getResourceNameAndType } from './utils/resources';
import VarsAndOutputsPanel from './variablesAndOutputs/VarsAndOutputsPanel';


const customShapeUtils = [NodeShapeUtil]

type ResourceState = "no-op" | "create" | "read" | "update" | "delete" | "delete-create" | "create-delete"

export type NodeGroup = {
    nodes: {
        nodeModel: NodeModel,
        resourceChanges?: any[]
    }[],
    id: string,
    mainNode: NodeModel,
    connectionsOut: string[],
    connectionsIn: string[],
    variableRefs?: string[],
    outputRefs?: string[],
    numberOfChanges: number,
    name: string,
    type: string,
    category: string,
    iconPath: string,
    serviceName: string
    moduleName?: string
    parentModules: string[]
    state: ResourceState
}

export type TFVariable = {
    name: string,
    module: string,
    expressionReferences: {
        type: "variable" | "output" | "unknown",
        module: string,
        name: string
    }[]
}

export type TFOutput = {
    name: string,
    module: string,
    outputReferences: {
        type: "variable" | "output" | "resource",
        module: string,
        name: string
    }[]
}

type Tag = {
    name: string,
    value: string
}

const assetUrls = getAssetUrls()

const TLDWrapper = () => {

    const [editor, setEditor] = useState<Editor | null>(null)
    const [storedData, setStoredData] = useState<{
        editor: Editor | null,
        planJson?: any,
        graph?: string,
        detailed?: boolean,
        showInactive?: boolean,
        showUnchanged?: boolean
    }>()
    const [storedNodeGroups, setStoredNodeGroups] = useState<NodeGroup[]>()
    const [selectedNode, setSelectedNode] = useState<NodeGroup | undefined>()
    const [variables, setVariables] = useState<{
        [moduleName: string]: TFVariable[]
    }>()
    const [outputs, setOutputs] = useState<{
        [moduleName: string]: TFOutput[]
    }>()
    const [sidebarWidth, setSidebarWidth] = useState<number>(0)
    const [diffText, setDiffText] = useState<string>("")
    const tagsRef = useRef<Tag[]>([])
    const selectedTagsRef = useRef<string[]>([])
    const [initialized, setInitialized] = useState<boolean>(false)
    const categoriesRef = useRef<string[]>([])
    const showDebugRef = useRef<boolean>(false)
    const deselectedCategoriesRef = useRef<string[]>([])
    const [showUnknown, setShowUnknown] = useState<boolean>(false)
    const [showUnchanged, setShowUnchanged] = useState<boolean>(false)
    const [selectedVarOutput, setSelectedVarOutput] = useState<TFVariable | TFOutput | undefined>()
    const [selectedResourceId, setSelectedResourceId] = useState<string>("")

    useEffect(() => {
        if (!storedData || initialized) return
        refreshWhiteboard()
    }, [storedData])

    const setAppToState = useCallback((editor: Editor) => {
        setEditor(editor)
        editor?.zoomToContent()
    }, [])

    const [store] = useState(() => createTLStore({
        shapeUtils: [...customShapeUtils, ...defaultShapeUtils],
        history: undefined
    } as TLStoreOptions))
    const [loadingState, setLoadingState] = useState<
        { status: 'loading' } | { status: 'ready' } | { status: 'error'; error: string }
    >({
        status: 'loading',
    })

    useEffect(() => {
        const getAndUpdateState = async () => {
            setLoadingState({ status: 'loading' })
            const storedData = await getData()
            const state = storedData.state
            setStoredNodeGroups(storedData.state ? storedData.state.nodeGroups : [])
            const editorValue = state ? state.editor : undefined
            if (editorValue) {
                try {
                    const snapshot = JSON.parse(editorValue)
                    store.loadSnapshot(snapshot)

                    setLoadingState({ status: 'ready' })
                } catch (error: any) {
                    setLoadingState({ status: 'error', error: error.message }) // Something went wrong
                }
                editor?.zoomToContent()
            } else {
                setLoadingState({ status: 'ready' }) // Nothing persisted, continue with the empty store
            }
        }
        getAndUpdateState()
    }, [store])

    useEffect(() => {
        const getStoredData = async () => {
            const data = await getData()
            if (Object.keys(data.state).length > 0) {
                setStoredData(data.state)
            }
        }
        getStoredData()
    }, [])

    const debugLog = (message: string) => {
        if (!showDebugRef.current) return
        console.log(message)
    }

    const checkHclBlockType = (blockId: string) => {
        let parentModules: string[] = []
        let moduleName = ""

        let splitBlockId = blockId.split(".")
        for (let i = 0; i < splitBlockId.length; i++) {
            if (splitBlockId[i] === "module") {
                if (moduleName !== "") {
                    parentModules.push(moduleName)
                }
                moduleName = splitBlockId[i + 1]
                blockId = splitBlockId.slice(i + 2).join(".")
            }
        }
        const isModule = !blockId && moduleName


        const isData = blockId.startsWith("data.")
        const isVariable = blockId.startsWith("var.")
        const isLocal = blockId.startsWith("local.")
        const isOutput = blockId.startsWith("output.")
        const isProvider = blockId.startsWith("provider[")

        const isResource = blockId.startsWith("aws_")

        if (!isData && !isVariable && !isLocal && !isOutput && !isProvider && !isResource && !isModule) {
            console.warn("Unknown block type", blockId)
        }

        splitBlockId = blockId.split(".")
        const isResourceWithName = isResource && splitBlockId.length > 1
        if (!isResource && !isModule) {
            blockId = splitBlockId.slice(1).join(".")
        }
        return { processedBlockId: blockId, isData, isVariable, isResource, isLocal, isOutput, isProvider, isModule, isResourceWithName, moduleName, parentModules }
    }

    const addNodeToGroup = (node: NodeModel, nodeGroups: Map<string, NodeGroup>, mainBlock: boolean, jsonArray?: Papa.ParseResult<unknown>, planJsonObj?: any, computeTerraformPlan?: boolean) => {
        let centralPart = node.id.split(" ")[1]
        if (centralPart) {
            const { processedBlockId, isResourceWithName, moduleName, parentModules } = checkHclBlockType(centralPart)

            if (isResourceWithName) {
                const { resourceType, resourceName } = getResourceNameAndType(processedBlockId)
                if (resourceType && resourceName && jsonArray) {
                    let resourceChanges: any[] = []
                    if (computeTerraformPlan) {

                        resourceChanges = planJsonObj.resource_changes.filter((resource: any) => {
                            return resource.address === node.id.split(" ")[1] || resource.address.startsWith(node.id.split(" ")[1] + "[")
                        })
                    }

                    let numberOfChanges = 0

                    // Determine a general state, given all the actions
                    let generalState = "no-op"
                    resourceChanges?.forEach((resourceChange) => {
                        const newState = resourceChange.change.actions.join("-")
                        numberOfChanges += ["no-op", "read"].includes(newState) ? 0 : 1
                        generalState = newState !== generalState ?
                            (["no-op", "read"].includes(newState) && ["no-op", "read"].includes(generalState)) ? "read" :
                                ["no-op", "read"].includes(generalState) ? newState : "update" : newState
                    })


                    jsonArray.data.forEach((row: any) => {
                        if (row[mainBlock ? "Main Diagram Blocks" : "Missing Resources"].split(",").some((s: string) => s === resourceType)) {
                            debugLog("Adding main resource: " + node.id.split(" ")[1])
                            nodeGroups.set(node.id.split(" ")[1], {
                                nodes: [{
                                    nodeModel: node,
                                    resourceChanges: resourceChanges
                                }],
                                id: node.id.split(" ")[1],
                                mainNode: node,
                                category: row["Simplified Category"],
                                name: resourceName,
                                state: resourceChanges.length > 0 ? generalState as ResourceState : "no-op",
                                type: resourceType,
                                parentModules: parentModules,
                                numberOfChanges: numberOfChanges,
                                serviceName: row["Service Name"],
                                iconPath: row["Icon Path"].trim(),
                                connectionsIn: [],
                                connectionsOut: [],
                                moduleName: moduleName
                            })
                        }
                    })

                }
            }
        }

    }

    const findAndSetCategories = (nodeGroups: Map<string, NodeGroup>) => {
        const catList: string[] = []
        nodeGroups.forEach((nodeGroup, key) => {
            const category = nodeGroup.category
            if (!catList.includes(category)) {
                catList.push(category)
            }
        })

        //sort alphabetically
        catList.sort((a, b) => {
            if (a < b) return -1
            if (a > b) return 1
            return 0
        })

        categoriesRef.current = catList
    }

    const findAndSetTags = (nodeGroups: Map<string, NodeGroup>) => {
        const tags: Tag[] = []
        nodeGroups.forEach((nodeGroup, key) => {
            nodeGroup.nodes.forEach((node) => {
                if (node.resourceChanges && node.resourceChanges.length > 0) {
                    const resourceChanges = node.resourceChanges
                    resourceChanges.forEach((resourceChange) => {
                        const tagsToAdd = Object.entries(resourceChange.change?.after?.tags_all || {}).map(([key, value]) => {
                            return { name: key as string, value: value as string }
                        })
                        if (tagsToAdd) {
                            tags.push(...tagsToAdd)
                        }
                    })
                }
            })
        })
        tagsRef.current = tags
    }

    const parseModel = (model: RootGraphModel, firstRender: boolean, planJson?: string | Object, detailed?: boolean, showInactive?: boolean, showUnchanged?: boolean) => {
        const computeTerraformPlan = (planJson && planJson !== "") ? true : false
        debugLog(computeTerraformPlan ? "Terraform plan detected." : "No Terraform plan detected. Using static data.")
        const planJsonObj = computeTerraformPlan ?
            typeof planJson === "string" ? JSON.parse(planJson!) : planJson : undefined
        const nodeGroups = new Map<string, NodeGroup>()
        const jsonArray = Papa.parse(terraformResourcesCsv, { delimiter: ",", header: true })
        debugLog("Adding main resources...")
        model.subgraphs.forEach((subgraph) => {
            subgraph.nodes.forEach((node) => {
                addNodeToGroup(node, nodeGroups, true, jsonArray, planJsonObj, computeTerraformPlan)
            })
        })
        debugLog("Adding main resources... Done.")

        debugLog("Aggregating secondary resources...")
        nodeGroups.forEach((nodeGroup) => {
            getConnectedNodes(nodeGroup.mainNode, nodeGroup, nodeGroups, model.subgraphs[0], true, jsonArray, planJsonObj)
            getConnectedNodes(nodeGroup.mainNode, nodeGroup, nodeGroups, model.subgraphs[0], false, jsonArray, planJsonObj)
        })
        debugLog("Aggregating secondary resources... Done.")

        if (storedData?.detailed || detailed) {
            debugLog("Adding unconnected resources (detailed view)...")
            // Add a nodeGroup for each node that is not connected to any other node
            model.subgraphs[0].nodes.forEach((node) => {
                if (!Array.from(nodeGroups.values()).some((group) => {
                    return group.nodes.some((n) => {
                        return n.nodeModel.id === node.id
                    })
                })) {
                    addNodeToGroup(node, nodeGroups, false, jsonArray, planJsonObj, computeTerraformPlan)
                }
            })
            debugLog("Adding unconnected resources (detailed view)... Done.")
        }

        if ((!storedData?.showInactive && !showInactive) && computeTerraformPlan) {
            debugLog("Removing inactive resources...")
            // Remove nodeGroups whose first node has no resourceChanges
            Array.from(nodeGroups.keys()).forEach((key) => {
                const nodeGroup = nodeGroups.get(key)
                if (nodeGroup && nodeGroup.nodes[0].resourceChanges && nodeGroup.nodes[0].resourceChanges.length === 0) {
                    debugLog("Removing inactive main resource: " + nodeGroup.id)
                    nodeGroups.delete(key)
                }
            })
            // Remove nodes whose resourceChanges are empty
            nodeGroups.forEach((nodeGroup) => {
                nodeGroup.nodes = nodeGroup.nodes.filter((node) => {
                    const keep = node.resourceChanges && node.resourceChanges.length > 0
                    if (!keep) {
                        debugLog("Removing inactive secondary resource: " + node.nodeModel.id.split(" ")[1])
                    }
                    return keep
                })
            })
            debugLog("Removing inactive resources... Done.")
        }

        if (!storedData?.showUnchanged && !showUnchanged && computeTerraformPlan) {
            debugLog("Removing unchanged resources...")
            // Remove nodeGroups whose first node has no resourceChanges
            Array.from(nodeGroups.keys()).forEach((key) => {
                const nodeGroup = nodeGroups.get(key)
                if (nodeGroup && nodeGroup.numberOfChanges === 0) {
                    debugLog("Removing unchanged main resource: " + nodeGroup.id)
                    nodeGroups.delete(key)
                }
            })
            // Remove nodes whose resourceChanges are empty
            nodeGroups.forEach((nodeGroup) => {
                nodeGroup.nodes = nodeGroup.nodes.filter((node) => {
                    const keep = node.resourceChanges && node.resourceChanges.some((resourceChange) => {
                        const actions = resourceChange.change.actions
                        return actions.length > 0 && actions.some((action: string) => action !== "no-op" && action !== "read")
                    })
                    if (!keep) {
                        debugLog("Removing unchanged secondary resource: " + node.nodeModel.id.split(" ")[1])
                    }
                    return keep
                })
            })
            debugLog("Removing unchanged resources... Done.")
        }

        findAndSetCategories(nodeGroups)
        // Remove nodeGroups whose category is not selected
        Array.from(nodeGroups.keys()).forEach((key) => {
            const nodeGroup = nodeGroups.get(key)
            if (nodeGroup && deselectedCategoriesRef.current!.includes(nodeGroup.category)) {
                nodeGroups.delete(key)
            }
        })

        findAndSetTags(nodeGroups)
        if (selectedTagsRef.current.length > 0) {
            // Remove nodeGroups whose tags are not selected
            Array.from(nodeGroups.keys()).forEach((key) => {
                const nodeGroup = nodeGroups.get(key)
                if (nodeGroup && !nodeGroup.nodes.some((node) => {
                    return node.resourceChanges && node.resourceChanges.some((resourceChange) => {
                        return resourceChange.change?.after?.tags_all && Object.entries(resourceChange.change?.after?.tags_all || {}).some(([key, value]) => {
                            return selectedTagsRef.current.includes(key)
                        })
                    })
                })) {
                    nodeGroups.delete(key)
                }
            })
        }

        setInitialized(true)


        debugLog("Computing connections...")
        // Compute connections between groups
        model.subgraphs[0].edges.forEach((edge) => {
            const edgeFromId = (edge.targets[0] as any).id
            const edgeToId = (edge.targets[1] as any).id

            const fromGroup = Array.from(nodeGroups).filter(([id, group]) => {
                return group.nodes.some((n) => {
                    return n.nodeModel.id === edgeFromId
                })
            })[0]
            const toGroup = Array.from(nodeGroups).filter(([id, group]) => {
                return group.nodes.some((n) => {
                    return n.nodeModel.id === edgeToId
                })
            })[0]
            if (fromGroup && toGroup && fromGroup !== toGroup) {
                const fromGroupKey = fromGroup[0]
                const toGroupKey = toGroup[0]
                if (!fromGroup[1].connectionsOut.includes(toGroupKey) && !toGroup[1].connectionsIn.includes(fromGroupKey)) {
                    fromGroup[1].connectionsOut.push(toGroupKey)
                    toGroup[1].connectionsIn.push(fromGroupKey)
                }
            }
        })
        debugLog("Computing connections... Done.")

        const { variables, outputs } = computeTerraformPlan ? getVariablesAndOutputs(nodeGroups, planJsonObj) :
            { variables: undefined, outputs: undefined }
        setVariables(variables)
        setOutputs(outputs)

        computeLayout(nodeGroups, computeTerraformPlan, editor)

        editor?.zoomToContent()
        if (firstRender)
            sendData({
                editor: JSON.stringify(store.getSnapshot()),
                nodeGroups: Array.from(nodeGroups.values()),
                planJson: planJsonObj,
                detailed: detailed,
                showInactive: showInactive,
                showUnchanged: showUnchanged,
                graph: graphTextAreaRef.current?.value,
            })
        setStoredNodeGroups(Array.from(nodeGroups.values()))
    }


    const getConnectedNodes = (node: NodeModel, nodeGroup: NodeGroup, nodeGroups: Map<string, NodeGroup>, subgraph: SubgraphModel, start: boolean, jsonArray: Papa.ParseResult<unknown>, planJsonObj: any) => {
        subgraph.edges.filter((e) => {
            return (e.targets[start ? 0 : 1] as any).id === node.id
        }).forEach((edge, index) => {

            const edgeToId = (edge.targets[start ? 1 : 0] as any).id
            let centralPart = edgeToId.split(" ")[1]
            if (centralPart) {
                const { isResourceWithName, processedBlockId, isData } = checkHclBlockType(centralPart)

                if (isResourceWithName || isData) {
                    const { resourceType, resourceName } = getResourceNameAndType(processedBlockId)
                    const isNodePresent = Array.from(nodeGroups.values()).some((group) => {
                        return group.nodes.some((n) => {
                            return n.nodeModel.id === (edge.targets[start ? 1 : 0] as any).id
                        })
                    })
                    if (resourceType && resourceName && jsonArray && !isNodePresent &&
                        jsonArray.data.some((row: any) => {
                            return row["Main Diagram Blocks"].split(",").some((s: string) => s === nodeGroup.type) &&
                                (row["Missing Resources"].split(",").some((s: string) => s === resourceType) ||
                                    row["Data Sources"].split(",").some((s: string) => s === resourceType))
                        })) {
                        const newNode = subgraph.nodes.filter((n) => { return n.id === (edge.targets[start ? 1 : 0] as any).id })[0]
                        if (newNode) {

                            let resourceChanges: any[] = []
                            if (planJsonObj) {

                                resourceChanges = planJsonObj.resource_changes.filter((resource: any) => {
                                    return resource.address === newNode.id.split(" ")[1] || resource.address.startsWith(newNode.id.split(" ")[1] + "[")
                                })
                            }

                            let numberOfChanges = 0

                            // Determine a general state, given all the actions
                            let generalState = "no-op"
                            resourceChanges?.forEach((resourceChange) => {
                                const newState = resourceChange.change.actions.join("-")
                                numberOfChanges += ["no-op", "read"].includes(newState) ? 0 : 1
                                generalState = newState !== generalState ?
                                    (["no-op", "read"].includes(newState) && ["no-op", "read"].includes(generalState)) ? "read" : "update" : newState
                            })

                            nodeGroup.numberOfChanges += numberOfChanges

                            debugLog("Aggregating resource: " + newNode.id.split(" ")[1] + "\t->\t" + nodeGroup.id)

                            nodeGroup.nodes.push({
                                nodeModel: newNode,
                                resourceChanges: resourceChanges
                            })

                            nodeGroup.state = nodeGroup.state !== "no-op" || !planJsonObj ? nodeGroup.state :
                                generalState !== "no-op" ? "update" : generalState
                            getConnectedNodes(newNode, nodeGroup, nodeGroups, subgraph, start, jsonArray, planJsonObj)
                            getConnectedNodes(newNode, nodeGroup, nodeGroups, subgraph, !start, jsonArray, planJsonObj)
                        }

                    }
                }
            }
        })
    }
    const graphTextAreaRef = useRef<
        HTMLTextAreaElement | null
    >(null)

    const planTextAreaRef = useRef<
        HTMLTextAreaElement | null
    >(null)

    const detailedTextAreaRef = useRef<
        HTMLTextAreaElement | null
    >(null)
    const inactiveTextAreaRef = useRef<
        HTMLTextAreaElement | null
    >(null)
    const unchangedTextAreaRef = useRef<
        HTMLTextAreaElement | null
    >(null)
    const debugTextAreaRef = useRef<
        HTMLTextAreaElement | null
    >(null)
    const contextTextAreaRef = useRef<
        HTMLTextAreaElement | null
    >(null)


    const handleRenderButtonClick = () => {
        if (graphTextAreaRef.current && graphTextAreaRef.current.value) {
            showDebugRef.current = debugTextAreaRef.current?.value === "true"
            const detailed = detailedTextAreaRef.current?.value === "true"
            debugLog("Detailed view is " + (detailed ? "on" : "off") + ".")
            const showInactive = inactiveTextAreaRef.current?.value === "true"
            const showUnchanged = unchangedTextAreaRef.current?.value === "true"
            planTextAreaRef.current?.value &&
                debugLog("Inactive resources are " + (showInactive ? "shown" : "hidden") + ".")
            planTextAreaRef.current?.value &&
                debugLog("Unchanged resources are " + (showUnchanged ? "shown" : "hidden") + ".")
            const model = fromDot(graphTextAreaRef.current.value)
            parseModel(model, true, planTextAreaRef.current?.value, detailed, showInactive, showUnchanged)
        }
    }

    const handleNodeSelectionChange = (node: NodeGroup) => {
        const shapeStartId = "shape:" + node.id
        editor?.getCurrentPageShapeIds().forEach((shapeId) => {
            if (shapeId.startsWith(shapeStartId + ":")) {
                handleShapeSelectionChange(shapeId)
            }
        })
    }

    const handleShapeSelectionChange = (shapeId: string) => {
        const element = document.querySelector(".tlui-navigation-zone") as HTMLElement
        setSelectedVarOutput(undefined)
        if (!storedData?.planJson || shapeId === "") {
            setSelectedNode(undefined)
            setSidebarWidth(0)
            setDiffText("")
            if (element)
                element.style.display = ""
        } else if (storedNodeGroups) {
            // remove shape: prefix, and date suffix
            const shapeIdWithoutPrefixAndSuffix = shapeId.split(":")[1]
            const selectedNodeGroup = storedNodeGroups?.filter((nodeGroup) => {
                return nodeGroup.id === shapeIdWithoutPrefixAndSuffix
            })[0]

            setSelectedNode(selectedNodeGroup)

            if (element)
                element.style.display = "none"

            const { textToShow, resourceId } = nodeChangesToString(selectedNodeGroup.nodes.map((node) => {
                return node.resourceChanges || undefined
            }).filter((s) => s !== undefined).flat(), showUnknown, showUnchanged)

            setSidebarWidth(30)

            setDiffText(textToShow || "No changes detected")
            setSelectedResourceId(resourceId || "")
        }
    }

    const refreshChangesDrilldown = (showUnknown: boolean, showUnchanged: boolean) => {
        if (storedNodeGroups) {
            const shapeIdWithoutPrefixAndSuffix = editor?.getSelectedShapeIds()[0].split(":")[1]

            const { textToShow, resourceId } = nodeChangesToString(storedNodeGroups?.filter((nodeGroup) => {
                return nodeGroup.id === shapeIdWithoutPrefixAndSuffix
            })[0].nodes.map((node) => {
                return node.resourceChanges || undefined
            }).filter((s) => s !== undefined).flat(), showUnknown, showUnchanged)

            setDiffText(textToShow || "No changes detected")
            setSelectedResourceId(resourceId || "")

        }
    }

    const handleShowUnknownChange = (showUnknown: boolean) => {
        setShowUnknown(showUnknown)
        refreshChangesDrilldown(showUnknown, showUnchanged)
    }

    const handleShowUnchangedChange = (showUnchanged: boolean) => {
        setShowUnchanged(showUnchanged)
        refreshChangesDrilldown(showUnknown, showUnchanged)
    }

    const refreshWhiteboard = () => {
        editor?.deleteShapes(Array.from(editor.getPageShapeIds(editor.getCurrentPageId())))
        const model = fromDot(storedData?.graph || "")
        parseModel(model, false, storedData?.planJson)
    }

    const toggleShowUnplanned = () => {
        storedData!.showInactive = !storedData?.showInactive
        refreshWhiteboard()
        sendData({
            showInactive: storedData?.showInactive
        })
    }

    const toggleDetailed = () => {
        storedData!.detailed = !storedData?.detailed
        refreshWhiteboard()
        sendData({
            detailed: storedData?.detailed
        })
    }

    const toggleShowUnchanged = () => {
        storedData!.showUnchanged = !storedData?.showUnchanged
        refreshWhiteboard()
        sendData({
            showUnchanged: storedData?.showUnchanged
        })
    }

    const toggleCategory = (category: string) => {
        if (deselectedCategoriesRef.current.includes(category)) {
            deselectedCategoriesRef.current = deselectedCategoriesRef.current.filter((cat) => {
                return cat !== category
            })
        } else {
            deselectedCategoriesRef.current.push(category)
        }
        refreshWhiteboard()
    }

    const toggleTag = (tag: string) => {
        if (selectedTagsRef.current.includes(tag)) {
            selectedTagsRef.current = selectedTagsRef.current.filter((t) => {
                return t !== tag
            })
        } else {
            selectedTagsRef.current.push(tag)
        }
        refreshWhiteboard()
    }

    const closeSidebar = () => {
        handleShapeSelectionChange("")
        editor?.selectNone()
    }

    const handleVarOutputSelectionChange = (varOutput: string, module: string, type: "variable" | "output") => {
        setSelectedVarOutput(type === "variable" ? variables?.[module]?.find((variable) => variable.name === varOutput) :
            outputs?.[module]?.find((output) => output.name === varOutput))
    }


    return (
        <div style={{
            position: "fixed",
            inset: 0,
        }}>
            <div className={'h-full transition-all'} style={{ marginRight: sidebarWidth + "rem" }}
            >
                <Tldraw
                    shapeUtils={customShapeUtils}
                    onMount={setAppToState}
                    store={store}
                    assetUrls={assetUrls}
                />
            </div>
            {
                selectedNode &&
                <VarsAndOutputsPanel
                    selectedNode={selectedNode}
                    sidebarWidth={sidebarWidth}
                    selectedVarOutput={selectedVarOutput?.name || ""}
                    setSelectedVar={(variable, module) => handleVarOutputSelectionChange(variable, module, "variable")}
                    setSelectedOutput={(output, module) => handleVarOutputSelectionChange(output, module, "output")}
                    variables={variables} />
            }

            {initialized &&
                <div className={'absolute top-2 z-200 left-2'}>
                    <ToggleLayers items={
                        [
                            {
                                name: "Debug",
                                items: [
                                    {
                                        name: "Unchanged resources",
                                        value: storedData?.showUnchanged || false,
                                        action: toggleShowUnchanged
                                    },
                                    {
                                        name: "Inactive resources",
                                        value: storedData?.showInactive || false,
                                        action: toggleShowUnplanned
                                    },
                                    {
                                        name: "Detailed diagram",
                                        value: storedData?.detailed || false,
                                        action: toggleDetailed
                                    },
                                ]
                            },
                            {
                                name: "Categories",
                                items:
                                    categoriesRef.current.map((category) => {
                                        return {
                                            name: category,
                                            value: deselectedCategoriesRef.current.includes(category) ? false : true,
                                            action: () => {
                                                toggleCategory(category)
                                            }
                                        }
                                    })
                            }, {
                                name: "Tags",
                                items:
                                    tagsRef.current.map((tag) => tag.name).filter((tag, index, self) => {
                                        return self.indexOf(tag) === index
                                    }).map((tag) => {
                                        return {
                                            name: tag,
                                            value: selectedTagsRef.current.includes(tag),
                                            action: () => {
                                                toggleTag(tag)
                                            }
                                        }
                                    })
                            }
                        ]
                    } />

                </div>
            }
            <EditorHandler
                editor={editor}
                handleShapeSelectionChange={handleShapeSelectionChange} />

            {sidebarWidth > 0 &&
                <Sidebar width={sidebarWidth}
                    nodeGroups={storedNodeGroups!}
                    handleNodeSelectionChange={handleNodeSelectionChange}
                    showUnknown={showUnknown}
                    showUnchanged={showUnchanged}
                    title={selectedVarOutput?.name || selectedNode?.name || ""}
                    text={diffText}
                    resourceId={selectedResourceId}
                    subtitle={selectedVarOutput ? selectedVarOutput.hasOwnProperty("outputReferences") ? "Output" : "Variable" : selectedNode?.type || ""}
                    closeSidebar={() => closeSidebar()}
                    handleShowUnknownChange={handleShowUnknownChange}
                    handleShowUnchangedChange={handleShowUnchangedChange}
                    selectedVarOutput={selectedVarOutput}
                    handleVarOutputSelectionChange={handleVarOutputSelectionChange}
                    variables={variables || {}}
                    outputs={outputs || {}}
                />
            }

            {!storedData &&
                <>
                    <textarea
                        ref={graphTextAreaRef}
                        id='inkdrop-graphviz-textarea'
                    />
                    <textarea
                        ref={planTextAreaRef}
                        id='inkdrop-plan-textarea'
                    />
                    <textarea
                        ref={detailedTextAreaRef}
                        id='detailed-textarea'
                    />
                    <textarea
                        ref={inactiveTextAreaRef}
                        id='show-inactive-textarea'
                    />
                    <textarea
                        ref={unchangedTextAreaRef}
                        id='show-unchanged-textarea'
                    />
                    <textarea
                        ref={debugTextAreaRef}
                        id='debug-textarea'
                    />
                    <textarea
                        ref={contextTextAreaRef}
                        id='context-textarea'
                    />
                    <button
                        onClick={handleRenderButtonClick}
                        id="render-button">
                        Render
                    </button>
                </>
            }
        </div>
    );
};

export default TLDWrapper;