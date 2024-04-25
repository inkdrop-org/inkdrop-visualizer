import dagre from "dagre";
import { NodeGroup } from "../TLDWrapper";
import { Editor, TLShapeId } from "@tldraw/tldraw";

const defaultWidth = 120, defaultHeight = 120

export const computeLayout = (nodeGroups: Map<string, NodeGroup>, computeTerraformPlan: boolean, editor: Editor | null, opacityFull: boolean) => {
    const g = new dagre.graphlib.Graph({ compound: true });
    g.setGraph({ rankdir: "TB", ranksep: 120 });
    g.setDefaultEdgeLabel(function () { return {}; });
    nodeGroups.forEach((nodeGroup, key) => {

        g.setNode(key, { label: nodeGroup.name, width: defaultWidth, height: defaultHeight })
        nodeGroup.connectionsOut.forEach((connection) => {
            g.setEdge(key, connection)
        })
        if (nodeGroup.stateFile) {
            if (!g.hasNode("State " + nodeGroup.stateFile)) {
                g.setNode("State " + nodeGroup.stateFile, { label: nodeGroup.stateFile })
            }
            if (nodeGroup.parentModules.length > 0) {
                if (!g.hasNode("module." + nodeGroup.parentModules[0])) {
                    g.setNode("module." + nodeGroup.parentModules[0], { label: nodeGroup.parentModules[0] })
                }
                g.setParent("module." + nodeGroup.parentModules[0], "State " + nodeGroup.stateFile)
            } else if (nodeGroup.moduleName) {
                if (!g.hasNode("module." + nodeGroup.moduleName)) {
                    g.setNode("module." + nodeGroup.moduleName, { label: nodeGroup.moduleName })
                }
                g.setParent("module." + nodeGroup.moduleName, "State " + nodeGroup.stateFile)
            } else {
                g.setParent(key, "State " + nodeGroup.stateFile)
            }
        }
        if (nodeGroup.moduleName) {
            nodeGroup.parentModules.forEach((parentModule, index) => {
                if (!g.hasNode("module." + parentModule)) {
                    g.setNode("module." + parentModule, { label: parentModule })
                }
                if (index !== 0) {
                    g.setParent("module." + parentModule, "module." + nodeGroup.parentModules[index - 1])
                }
            })
            if (!g.hasNode("module." + nodeGroup.moduleName)) {
                g.setNode("module." + nodeGroup.moduleName, { label: nodeGroup.moduleName })
                if (nodeGroup.parentModules.length > 0)
                    g.setParent("module." + nodeGroup.moduleName, "module." + nodeGroup.parentModules[nodeGroup.parentModules.length - 1])
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
            return {
                id: "shape:" + id + ":" + date as TLShapeId,
                type: "frame",
                x: node.x - node.width / 2,
                y: node.y - node.height / 2,
                props: {
                    name: id,
                    w: node.width,
                    h: node.height,
                }
            }
        }))

    g.nodes().filter((id) => {
        return g.parent(id)
    }).forEach((id) => {
        editor?.reparentShapes(["shape:" + id + ":" + date as TLShapeId], "shape:" + g.parent(id) + ":" + date as TLShapeId)
    })

    g.nodes().filter((id) => {
        return !g.children(id) || g.children(id)!.length === 0
    }).forEach((id) => {
        const frameId = g.parent(id)
        if (frameId) {
            nodeGroups.get(id)!.frameShapeId = "shape:" + frameId + ":" + date
        }
    })

    editor?.createShapes(
        g.nodes().filter((id) => {
            return !g.children(id) || g.children(id)!.length === 0
        }).map((id) => {
            const node = g.node(id);
            const shapeId = "shape:" + id + ":" + date as TLShapeId
            nodeGroups.get(id)!.shapeId = shapeId
            const inExternalState = nodeGroups.get(id)!.stateFile ? true : false

            return {
                id: shapeId,
                type: "node",
                x: node.x - node.width / 2,
                y: node.y - node.height / 2,
                props: {
                    name: node.label,
                    iconPath: nodeGroups.get(id)?.iconPath,
                    resourceType: nodeGroups.get(id)?.type.split("_").slice(1).map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(" "),
                    numberOfChanges: nodeGroups.get(id)?.numberOfChanges,
                    state: nodeGroups.get(id)?.state,
                },
                opacity: !opacityFull && !inExternalState && computeTerraformPlan && (["no-op", "read"].includes(nodeGroups.get(id)?.state || "no-op") &&
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
                                    isExact: false,
                                },
                                end: {
                                    type: "binding",
                                    boundShapeId: toShape.id,
                                    normalizedAnchor: {
                                        x: 0.5,
                                        y: 0.5
                                    },
                                    isExact: false,
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