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


const customShapeUtils = [NodeShapeUtil]

type ResourceState = "no-op" | "create" | "read" | "update" | "delete" | "delete-create" | "create-delete"

type NodeGroup = {
    nodes: {
        nodeModel: NodeModel,
        resourceChanges?: any[]
    }[],
    id: string,
    mainNode: NodeModel,
    connectionsOut: string[],
    connectionsIn: string[],
    name: string,
    type: string,
    iconPath: string,
    serviceName: string
    moduleName?: string
    state: ResourceState
}

const assetUrls = getAssetUrls()

const TLDWrapper = () => {

    const [editor, setEditor] = useState<Editor | null>(null)
    const [storedData, setStoredData] = useState<{ editor: Editor | null, planJson?: any }>()
    const [storedNodeGroups, setStoredNodeGroups] = useState<NodeGroup[]>()
    const [sidebarWidth, setSidebarWidth] = useState<number>(0)
    const [diffText, setDiffText] = useState<string>("")
    const [showUnknown, setShowUnknown] = useState<boolean>(false)

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
            } else {
                setLoadingState({ status: 'ready' }) // Nothing persisted, continue with the empty store
            }

            // Each time the store changes, run the (debounced) persist function
            const cleanupFn = store.listen(
                throttle(() => {
                    const snapshot = store.getSnapshot()
                    sendData({
                        editor: JSON.stringify(snapshot),
                    })
                }, 500)
            )

            return () => {
                cleanupFn()
            }
        }
        getAndUpdateState()

    }, [store])

    const defaultWidth = 120, defaultHeight = 120

    useEffect(() => {
        const getStoredData = async () => {
            const data = await getData()
            if (Object.keys(data.state).length > 0) {
                setStoredData(data.state)
            }
        }
        getStoredData()
    }, [])

    const checkHclBlockType = (blockId: string) => {
        let moduleName = ""
        if (blockId.startsWith("module.")) {
            moduleName = blockId.split(".")[1]
            blockId = blockId.split(".").slice(2).join(".")
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
        const splitBlockId = blockId.split(".")
        const isResourceWithName = isResource && splitBlockId.length > 1
        if (!isResource && !isModule) {
            blockId = splitBlockId.slice(1).join(".")
        }
        return { processedBlockId: blockId, isData, isVariable, isResource, isLocal, isOutput, isProvider, isModule, isResourceWithName, moduleName }
    }

    const getResourceNameAndType = (blockId: string) => {
        const resourceType = blockId.split(".") && blockId.split(".").filter(s => s.startsWith("aws_")).length > 0 ?
            blockId.split(".").filter(s => s.startsWith("aws_"))[0] : undefined
        const resourceName = resourceType && blockId.split(".").filter((s, index) => {
            return index > 0 && blockId.split(".")[index - 1] === resourceType
        })[0].split(" ")[0]
        return { resourceType, resourceName }
    }

    const parseModel = (model: RootGraphModel, detailed: boolean, planJson?: string) => {
        const computeTerraformPlan = (planJson && planJson !== "") ? true : false
        const planJsonObj = computeTerraformPlan ? JSON.parse(planJson!) : undefined
        const nodeGroups = new Map<string, NodeGroup>()
        const jsonArray = Papa.parse(terraformResourcesCsv, { delimiter: ",", header: true })
        model.subgraphs.forEach((subgraph) => {
            subgraph.nodes.forEach((node) => {
                let centralPart = node.id.split(" ")[1]
                if (centralPart) {
                    const { processedBlockId, isResourceWithName, moduleName } = checkHclBlockType(centralPart)
                    if (isResourceWithName) {
                        const { resourceType, resourceName } = getResourceNameAndType(processedBlockId)
                        if (resourceType && resourceName && jsonArray) {
                            let resourceChanges: any[] = []
                            if (computeTerraformPlan) {

                                resourceChanges = planJsonObj.resource_changes.filter((resource: any) => {
                                    return resource.address === node.id.split(" ")[1] || resource.address.startsWith(node.id.split(" ")[1] + "[")
                                })
                            }
                            // Determine a general state, given all the actions
                            let generalState = "no-op"
                            resourceChanges?.forEach((resourceChange) => {
                                const newState = resourceChange.change.actions.join("-")
                                generalState = newState !== generalState ?
                                    (["no-op", "read"].includes(newState) && ["no-op", "read"].includes(generalState)) ? "read" :
                                        ["no-op", "read"].includes(generalState) ? newState : "update" : newState
                            })

                            jsonArray.data.forEach((row: any) => {
                                if (row["Main Diagram Blocks"].split(",").some((s: string) => s === resourceType)) {
                                    nodeGroups.set(node.id.split(" ")[1], {
                                        nodes: [{
                                            nodeModel: node,
                                            resourceChanges: resourceChanges
                                        }],
                                        id: node.id.split(" ")[1],
                                        mainNode: node,
                                        name: resourceName,
                                        state: resourceChanges.length > 0 ? generalState as ResourceState : "no-op",
                                        type: resourceType,
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
            })
        })

        nodeGroups.forEach((nodeGroup) => {
            getConnectedNodes(nodeGroup.mainNode, nodeGroup, nodeGroups, model.subgraphs[0], true, jsonArray, planJsonObj)
            getConnectedNodes(nodeGroup.mainNode, nodeGroup, nodeGroups, model.subgraphs[0], false, jsonArray, planJsonObj)
        })

        if (detailed) {
            // Add a nodeGroup for each node that is not connected to any other node
            model.subgraphs[0].nodes.forEach((node) => {
                if (!Array.from(nodeGroups.values()).some((group) => {
                    return group.nodes.some((n) => {
                        return n.nodeModel.id === node.id
                    })
                })) {
                    let centralPart = node.id.split(" ")[1]
                    if (centralPart) {
                        const { processedBlockId, isResourceWithName, moduleName } = checkHclBlockType(centralPart)
                        if (isResourceWithName) {
                            const { resourceType, resourceName } = getResourceNameAndType(processedBlockId)
                            if (resourceType && resourceName && jsonArray) {
                                let resourceChanges: any[] = []
                                if (computeTerraformPlan) {

                                    resourceChanges = planJsonObj.resource_changes.filter((resource: any) => {
                                        return resource.address === node.id.split(" ")[1] || resource.address.startsWith(node.id.split(" ")[1] + "[")
                                    })
                                }
                                // Determine a general state, given all the actions
                                let generalState = "no-op"
                                resourceChanges?.forEach((resourceChange) => {
                                    const newState = resourceChange.change.actions.join("-")
                                    generalState = newState !== generalState ?
                                        (["no-op", "read"].includes(newState) && ["no-op", "read"].includes(generalState)) ? "read" :
                                            ["no-op", "read"].includes(generalState) ? newState : "update" : newState
                                })

                                jsonArray.data.forEach((row: any) => {
                                    if (row["Missing Resources"].split(",").some((s: string) => s === resourceType)) {
                                        nodeGroups.set(node.id.split(" ")[1], {
                                            nodes: [{
                                                nodeModel: node,
                                                resourceChanges: resourceChanges
                                            }],
                                            id: node.id.split(" ")[1],
                                            mainNode: node,
                                            name: resourceName,
                                            state: resourceChanges.length > 0 ? generalState as ResourceState : "no-op",
                                            type: resourceType,
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
            })
        }

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
        computeLayout(nodeGroups, computeTerraformPlan)
        editor?.zoomToContent()
        sendData({
            editor: JSON.stringify(store.getSnapshot()),
            nodeGroups: Array.from(nodeGroups.values()),
            planJson: planJsonObj
        })
    }

    const computeLayout = (nodeGroups: Map<string, NodeGroup>, computeTerraformPlan: boolean) => {
        const g = new dagre.graphlib.Graph({ compound: true });
        g.setGraph({ rankdir: "TB", ranksep: 120 });
        g.setDefaultEdgeLabel(function () { return {}; });
        nodeGroups.forEach((nodeGroup, key) => {

            g.setNode(key, { label: nodeGroup.name, width: defaultWidth, height: defaultHeight })
            nodeGroup.connectionsOut.forEach((connection) => {
                g.setEdge(key, connection)
            })
            if (nodeGroup.moduleName) {
                if (!g.hasNode("module." + nodeGroup.moduleName)) {
                    g.setNode("module." + nodeGroup.moduleName, { label: nodeGroup.moduleName })
                }
                g.setParent(key, "module." + nodeGroup.moduleName)
            }
        })
        dagre.layout(g);
        const date = Date.now()

        editor?.createShapes(
            g.nodes().filter((id) => {
                return g.children(id) && g.children(id)!.length > 0
            }).map((id) => {
                const node = g.node(id);
                const opacity = !computeTerraformPlan || (g.children(id) as any).some((childId: string) => {
                    const nodeGroup = nodeGroups.get(childId)
                    return nodeGroup && !["no-op", "read"].includes(nodeGroup.state)
                }) ? 1 : 0.2
                return {
                    id: "shape:" + id + ":" + date as TLShapeId,
                    type: "frame",
                    x: node.x - node.width / 2,
                    y: node.y - node.height / 2,
                    opacity: opacity,
                    props: {
                        name: id,
                        w: node.width,
                        h: node.height,
                    }
                }
            }))

        editor?.createShapes(
            g.nodes().filter((id) => {
                return !g.children(id) || g.children(id)!.length === 0
            }).map((id) => {
                const node = g.node(id);

                return {
                    id: "shape:" + id + ":" + date as TLShapeId,
                    type: "node",
                    x: node.x - node.width / 2,
                    y: node.y - node.height / 2,
                    props: {
                        name: node.label,
                        iconPath: nodeGroups.get(id)?.iconPath,
                        resourceType: nodeGroups.get(id)?.type.split("_").slice(1).map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(" "),
                        state: nodeGroups.get(id)?.state,
                    },
                    opacity: computeTerraformPlan && (["no-op", "read"].includes(nodeGroups.get(id)?.state || "no-op") &&
                        !g.nodes().some((nodeId) => {
                            g.children(nodeId) && g.children(nodeId)!.length > 0 && g.children(nodeId)!.includes(id)
                        })) ? 0.2 : 1
                }
            })
        )

        const arrowShapes: any[] = []

        nodeGroups.forEach((nodeGroup, id) => {
            nodeGroup.connectionsOut.forEach((connection) => {
                const connectionNode = nodeGroups.get(connection)
                if (connectionNode) {
                    const fromShape = editor?.getShape("shape:" + id + ":" + date as TLShapeId)
                    const toShape = editor?.getShape("shape:" + connection + ":" + date as TLShapeId)
                    if (fromShape && toShape) {
                        arrowShapes.push(
                            {
                                id: "shape:" + id + "-" + connection + ":" + date as TLShapeId,
                                type: "arrow",
                                opacity: computeTerraformPlan && fromShape.opacity * toShape.opacity < 1 ? 0.2 : 1,
                                props: {
                                    size: "s",
                                    start: {
                                        type: "binding",
                                        boundShapeId: fromShape.id,
                                        normalizedAnchor: {
                                            x: 0.5,
                                            y: 0.5
                                        },
                                        isExact: false
                                    },
                                    end: {
                                        type: "binding",
                                        boundShapeId: toShape.id,
                                        normalizedAnchor: {
                                            x: 0.5,
                                            y: 0.5
                                        },
                                        isExact: false
                                    }
                                }
                            }
                        )
                    }
                }
            })
        })
        editor?.createShapes(arrowShapes)
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
                            // Determine a general state, given all the actions
                            let generalState = "no-op"
                            resourceChanges?.forEach((resourceChange) => {
                                const newState = resourceChange.change.actions.join("-")
                                generalState = newState !== generalState ?
                                    (["no-op", "read"].includes(newState) && ["no-op", "read"].includes(generalState)) ? "read" : "update" : newState
                            })

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


    const handleRenderButtonClick = () => {
        if (graphTextAreaRef.current && graphTextAreaRef.current.value) {
            const detailed = detailedTextAreaRef.current?.value === "true"
            const model = fromDot(graphTextAreaRef.current.value)
            parseModel(model, detailed, planTextAreaRef.current?.value)
        }
    }

    const handleShapeSelectionChange = (shapeId: string) => {
        if (!storedData?.planJson || shapeId === "") {
            setSidebarWidth(0)
            setDiffText("")
        } else if (storedNodeGroups) {
            // remove shape: prefix, and date suffix
            const shapeIdWithoutPrefixAndSuffix = shapeId.split(":")[1]

            const textToShow = nodeChangesToString(storedNodeGroups?.filter((nodeGroup) => {
                return nodeGroup.id === shapeIdWithoutPrefixAndSuffix
            })[0].nodes.map((node) => {
                return node.resourceChanges || undefined
            }).filter((s) => s !== undefined).flat(), showUnknown)

            setSidebarWidth(30)
            setDiffText(textToShow || "No changes detected")
        }
    }

    const handleShowUnknownChange = (showUnknown: boolean) => {
        if (storedNodeGroups) {
            setShowUnknown(showUnknown)
            const shapeIdWithoutPrefixAndSuffix = editor?.getSelectedShapeIds()[0].split(":")[1]

            const textToShow = nodeChangesToString(storedNodeGroups?.filter((nodeGroup) => {
                return nodeGroup.id === shapeIdWithoutPrefixAndSuffix
            })[0].nodes.map((node) => {
                return node.resourceChanges || undefined
            }).filter((s) => s !== undefined).flat(), showUnknown)

            setDiffText(textToShow || "No changes detected")
        }
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
            <EditorHandler
                editor={editor}
                handleShapeSelectionChange={handleShapeSelectionChange} />

            {sidebarWidth > 0 &&
                <Sidebar width={sidebarWidth} text={diffText} handleShowUnknownChange={handleShowUnknownChange} />
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