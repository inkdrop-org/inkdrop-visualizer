import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeShapeUtil } from './board/NodeShape';
import { Editor, TLShapeId, Tldraw } from '@tldraw/tldraw';
import dagre from "dagre"
import Papa from "papaparse"
import { NodeModel, RootGraphModel, SubgraphModel, fromDot } from "ts-graphviz"
import { terraformResourcesCsv } from './terraformResourcesCsv';


const customShapeUtils = [NodeShapeUtil]

type NodeGroup = {
    nodes: NodeModel[],
    mainNode: NodeModel,
    connectionsOut: string[],
    connectionsIn: string[],
    name: string,
    type: string,
    iconPath: string,
    serviceName: string
    moduleName?: string
    state: "no-op" | "create" | "read" | "update" | "delete" | "delete-create" | "create-delete"
}

const TLDWrapper = () => {

    const [editor, setEditor] = useState<Editor | null>(null)

    const setAppToState = useCallback((editor: Editor) => {
        setEditor(editor)
    }, [])

    const defaultWidth = 120, defaultHeight = 120

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

    const parseModel = (model: RootGraphModel, planJson?: string) => {
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
                            let resourceChange: any
                            if (computeTerraformPlan) {
                                resourceChange = planJsonObj.resource_changes.filter((resource: any) => {
                                    return resource.address === node.id.split(" ")[1]
                                })[0]
                            }
                            jsonArray.data.forEach((row: any) => {
                                if (row["Main Diagram Blocks"].split(",").some((s: string) => s === resourceType)) {
                                    nodeGroups.set(node.id.split(" ")[1], {
                                        nodes: [node],
                                        mainNode: node,
                                        name: resourceName,
                                        state: resourceChange ? resourceChange.change.actions.join("-") : "no-op",
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

        // Compute connections between groups
        model.subgraphs[0].edges.forEach((edge) => {
            const edgeFromId = (edge.targets[0] as any).id
            const edgeToId = (edge.targets[1] as any).id

            const fromGroup = Array.from(nodeGroups).filter(([id, group]) => {
                return group.nodes.some((n) => {
                    return n.id === edgeFromId
                })
            })[0]
            const toGroup = Array.from(nodeGroups).filter(([id, group]) => {
                return group.nodes.some((n) => {
                    return n.id === edgeToId
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
                    id: "shape:" + id + date as TLShapeId,
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
                    id: "shape:" + id + date as TLShapeId,
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
                    const fromShape = editor?.getShape("shape:" + id + date as TLShapeId)
                    const toShape = editor?.getShape("shape:" + connection + date as TLShapeId)
                    if (fromShape && toShape) {
                        arrowShapes.push(
                            {
                                id: "shape:" + id + "-" + connection + date as TLShapeId,
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
                            return n.id === (edge.targets[start ? 1 : 0] as any).id
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
                            nodeGroup.nodes.push(newNode)
                            let resourceChange: any
                            if (planJsonObj) {
                                resourceChange = planJsonObj.resource_changes.filter((resource: any) => {
                                    return resource.address === newNode.id.split(" ")[1]
                                })[0]
                            }
                            const newState = resourceChange ? resourceChange.change.actions.join("-") : "no-op"
                            nodeGroup.state = nodeGroup.state !== "no-op" || !planJsonObj ? nodeGroup.state :
                                newState !== "no-op" ? "update" : newState
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


    const handleRenderButtonClick = () => {
        if (graphTextAreaRef.current && graphTextAreaRef.current.value) {
            const model = fromDot(graphTextAreaRef.current.value)
            parseModel(model, planTextAreaRef.current?.value)
        }
    }


    return (
        <div style={{
            position: "fixed",
            inset: 0,
        }}>
            <div style={{
                height: "100%",
                transitionProperty: "all",
                transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDuration: "150ms",
            }}>
                <Tldraw
                    shapeUtils={customShapeUtils}
                    onMount={setAppToState}
                    persistenceKey="tldraw_basic"
                />
                <textarea
                    ref={graphTextAreaRef}
                    id='inkdrop-graphviz-textarea'
                />
                <textarea
                    ref={planTextAreaRef}
                    id='inkdrop-plan-textarea'
                />
                <button
                    onClick={handleRenderButtonClick}
                    id="render-button">
                    Render
                </button>
            </div>
        </div>
    );
};

export default TLDWrapper;