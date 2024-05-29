import dagre from "dagre";
import { NodeGroup } from "../TLDWrapper";
import { Editor, TLShape, TLShapeId } from "@tldraw/tldraw";
import { getExtendedModuleName } from "../dependencies/dependencies";

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
                    g.setNode("module." + nodeGroup.parentModules[0], { label: "module." + nodeGroup.parentModules[0] })
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
                const parentId = nodeGroup.parentModules.filter((p, i) => i <= index).map((p, i) => {
                    return "module." + p
                }).join(".")
                if (!g.hasNode(parentId)) {
                    g.setNode(parentId, { label: "module." + parentModule })
                }
                if (index !== 0) {
                    g.setParent(parentId, parentId.split(".").slice(0, -2).join("."))
                }
            })
            const moduleId = nodeGroup.parentModules.length > 0 ?
                nodeGroup.parentModules.map((p) => {
                    return "module." + p
                }).join(".") + ".module." + nodeGroup.moduleName : "module." + nodeGroup.moduleName
            if (!g.hasNode(moduleId)) {
                g.setNode(moduleId, { label: "module." + nodeGroup.moduleName })
                if (nodeGroup.parentModules.length > 0)
                    g.setParent(moduleId, moduleId.split(".").slice(0, -2).join("."))
            }
            g.setParent(key, moduleId)
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
                    name: node.label,
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
    if (Array.from(nodeGroups.values()).some((nodeGroup) => nodeGroup.moduleConnectionsIn.length > 0 || nodeGroup.moduleConnectionsOut.length > 0)) {
        const f = new dagre.graphlib.Graph({ compound: true });
        f.setGraph({ rankdir: "TB", ranksep: 120 });
        f.setDefaultEdgeLabel(function () { return {}; });
        const frames = editor?.getCurrentPageShapes().filter((shape) => shape.type === "frame" &&
            shape.parentId === editor.getCurrentPageId()) || []
        frames.forEach((shape) => {
            f.setNode(shape.id.split(":")[1], {
                label: (shape.props as any).name,
                width: (shape.props as any).w,
                height: (shape.props as any).h
            })
        })
        Array.from(nodeGroups.values()).filter((nodeGroup) => !nodeGroup.moduleName)
            .forEach((nodeGroup, key) => {
                f.setNode(nodeGroup.id, {
                    label: nodeGroup.name,
                    width: defaultWidth,
                    height: defaultHeight
                })
            })
        nodeGroups.forEach((nodeGroup, key) => {
            nodeGroup.moduleConnectionsOut.forEach((connection) => {

                if (!nodeGroup.moduleName) {
                    f.setEdge(key, connection)
                }
                else if (nodeGroup.moduleName && getExtendedModuleName(nodeGroup) !== connection &&
                    !getExtendedModuleName(nodeGroup).startsWith(connection)
                ) {
                    f.setEdge(getExtendedModuleName(nodeGroup), connection)
                }
            })
            nodeGroup.moduleConnectionsIn.forEach((connection) => {
                if (!nodeGroup.moduleName) {
                    f.setEdge(connection, key)
                }
                else if (nodeGroup.moduleName && getExtendedModuleName(nodeGroup) !== connection &&
                    !getExtendedModuleName(nodeGroup).startsWith(connection)) {
                    f.setEdge(connection, getExtendedModuleName(nodeGroup))
                }
            })
        })

        dagre.layout(f);
        editor?.updateShapes(frames.map((frame) => {
            return {
                id: frame.id,
                type: "frame",
                x: f.node(frame.id.split(":")[1]).x - f.node(frame.id.split(":")[1]).width / 2,
                y: f.node(frame.id.split(":")[1]).y - f.node(frame.id.split(":")[1]).height / 2
            }
        }))
        editor?.updateShapes(
            Array.from(nodeGroups.values()).filter((nodeGroup) => !nodeGroup.moduleName).map((nodeGroup) => {
                return {
                    id: nodeGroup.shapeId as TLShapeId,
                    type: "node",
                    x: f.node(nodeGroup.id).x - f.node(nodeGroup.id).width / 2,
                    y: f.node(nodeGroup.id).y - f.node(nodeGroup.id).height / 2
                }
            })
        )
        const newArrowShapes: any[] = []
        f.edges().forEach((edge) => {
            newArrowShapes.push(
                {
                    id: "shape:" + edge.v + "-" + edge.w + ":" + date as TLShapeId,
                    type: "arrow",
                    props: {
                        size: "s",
                        start: {
                            type: "binding",
                            boundShapeId: "shape:" + edge.v + ":" + date as TLShapeId,
                            normalizedAnchor: {
                                x: 0.5,
                                y: 0.5
                            },
                            isExact: false,
                        },
                        end: {
                            type: "binding",
                            boundShapeId: "shape:" + edge.w + ":" + date as TLShapeId,
                            normalizedAnchor: {
                                x: 0.5,
                                y: 0.5
                            },
                            isExact: false,
                        }
                    }
                }
            )
        })
        editor?.createShapes(newArrowShapes)
        editor?.zoomToFit()
    }
}