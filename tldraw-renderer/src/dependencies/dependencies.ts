import { NodeGroup, TFVariableOutput } from "../TLDWrapper";
import { getResourceNameAndType } from "../utils/resources";

export const getVariablesAndOutputs = (nodeGroups: Map<string, NodeGroup>, planJson: any) => {
    const variables: TFVariableOutput[] = []
    const outputs: TFVariableOutput[] = []

    if (planJson) {
        variables.push(...Object.keys(planJson?.configuration?.root_module?.variables || {}).map((key) => {
            return {
                name: key,
                type: "variable" as any,
                module: "root_module",
                expressionReferences: []
            }
        }))
        outputs.push(...Object.keys(planJson?.configuration?.root_module?.outputs || {}).map((key) => {
            const thisModule = "root_module"
            return {
                name: key,
                module: "root_module",
                type: "output" as any,
                expressionReferences: makeUnique(planJson?.configuration?.root_module?.outputs?.[key]?.expression?.references?.map((r: any) => {
                    const type = r.startsWith("var.") ? "variable" : r.startsWith("module.") ? "output" : "resource"
                    const module = type === "variable" || type === "resource" ? thisModule : type === "output" ? r.split(".").filter((token: string, index: number) => {
                        return (index % 2 === 0 && token === "module") || index % 2 === 1 && r.split(".")[index - 1] === "module"
                    }).join(".") : ""
                    return {
                        type,
                        module,
                        name: type === "variable" ? r.split(".")[1] : type === "output" ?
                            r.split(".")[r.split(".").length - 3] === "module" ? r.split(".")[r.split(".").length - 1] : undefined :
                            getNodeGroupName(r, thisModule, nodeGroups),
                    }
                }).filter((e: any) => e.name && !e.name.includes("[")) || []),
            }
        }))
    }

    nodeGroups.forEach((nodeGroup) => {
        const moduleName = nodeGroup.moduleName
        const parentModules = nodeGroup.parentModules
        const extendedModuleName = getExtendedModuleName(nodeGroup)

        const nodeVariableRefs: string[] = []
        const nodeOutputRefs: string[] = []
        nodeGroup.nodes.forEach((node) => {

            const address = node.nodeModel.id.split(" ")[1]
            const { resourceType, resourceName } = getResourceNameAndType(address)

            const basePath = moduleName ?
                getRecursiveBasePath(planJson?.configuration?.root_module?.module_calls, parentModules, moduleName)?.module :
                planJson?.configuration?.root_module

            if (basePath)
                Object.entries(basePath?.resources?.filter((r: any) => {
                    return r.type === resourceType && r.name === resourceName
                })[0]?.expressions || []).forEach(([key, value]) => {
                    if ((value as any).references) {
                        (value as any).references.forEach((ref: string) => {
                            if (ref.startsWith("var.") && !nodeVariableRefs.includes(ref.split(".")[1])) {
                                nodeVariableRefs.push(ref.split(".")[1])
                            } else if (ref.startsWith("module.") && !nodeOutputRefs.includes(ref.split("[")[0]) && ref.split(".").length > 2) {
                                nodeOutputRefs.push(ref.split("[")[0])
                            }
                        })
                    }
                })
        })

        nodeGroup.variableRefs = nodeVariableRefs
        nodeGroup.outputRefs = nodeOutputRefs

        if (moduleName) {
            if (variables.filter((v) => v.module === extendedModuleName).length === 0) {
                const parentModule = parentModules.length > 0 ? "module." + parentModules.join(".module.") : "root_module"
                variables.push(...Object.keys(
                    getRecursiveBasePath(planJson?.configuration?.root_module?.module_calls, parentModules, moduleName)?.module?.variables
                    || {}).map((key) => {
                        return {
                            name: key,
                            module: extendedModuleName,
                            type: "variable" as any,
                            expressionReferences: makeUnique(
                                getRecursiveBasePath(planJson?.configuration?.root_module?.module_calls, parentModules, moduleName)?.expressions?.[key]?.references?.map((r: any) => {
                                    const type = r.startsWith("var.") ? "variable" : r.startsWith("module.") ? "output" : "unknown"
                                    const module = type === "variable" ? parentModule : type === "output" ? r.split(".").filter((token: string, index: number) => {
                                        return (index % 2 === 0 && token === "module") || index % 2 === 1 && r.split(".")[index - 1] === "module"
                                    }).join(".") : ""
                                    return {
                                        type,
                                        module,
                                        name: type === "variable" ? r.split(".")[1] :
                                            r.split(".")[r.split(".").length - 3] === "module" ? r.split(".")[r.split(".").length - 1] : undefined
                                    }
                                }).filter((e: any) => e.name && !e.name.includes("[")) || [])
                        }
                    }))
            }
            if (outputs.filter((v) => v.module === moduleName).length === 0) {
                outputs.push(...Object.keys(planJson?.configuration?.root_module?.module_calls?.[moduleName]?.module?.outputs || {}).map((key) => {
                    return {
                        name: key,
                        module: extendedModuleName,
                        type: "output" as any,
                        expressionReferences: makeUnique(getRecursiveBasePath(planJson?.configuration?.root_module?.module_calls, parentModules, moduleName)?.module?.outputs?.[key]?.expression?.references?.map((r: any) => {
                            const type = r.startsWith("var.") ? "variable" : r.startsWith("module.") ? "output" : "resource"
                            const module = type === "variable" || type === "resource" ? extendedModuleName : type === "output" ? r.split(".").filter((token: string, index: number) => {
                                return (index % 2 === 0 && token === "module") || index % 2 === 1 && r.split(".")[index - 1] === "module"
                            }).join(".") : ""
                            return {
                                type,
                                module,
                                name: type === "variable" ? r.split(".")[1] : type === "output" ?
                                    r.split(".")[r.split(".").length - 3] === "module" ? r.split(".")[r.split(".").length - 1] : undefined :
                                    getNodeGroupName(r, extendedModuleName, nodeGroups),
                            }
                        }).filter((e: any) => e.name && !e.name.includes("[")) || []),
                    }
                }))
            }
        }
    })
    nodeGroups.forEach((nodeGroup) => {
        const nodeOutputRefs: string[] = []
        const extendedModuleName = getExtendedModuleName(nodeGroup)

        nodeGroup.nodes.forEach((node) => {
            const address = node.nodeModel.id.split(" ")[1]
            const { resourceType, resourceName } = getResourceNameAndType(address)

            outputs.filter((o) => {
                return extendedModuleName ? o.module === extendedModuleName : o.module === "root_module"
            }).forEach((output) => {
                if (output.expressionReferences.some((ref) => ref.type === "resource" && ref.name === resourceType + "." + resourceName)) {
                    if (!nodeOutputRefs.includes(output.name))
                        nodeOutputRefs.push(output.name)
                }
            })
        })
        nodeGroup.affectedOutputs = nodeOutputRefs
    })

    return { variables, outputs }
}

const getRecursiveBasePath = (moduleCalls: any, parentModules: string[], moduleName: string): any => {
    if (!moduleCalls) {
        return null
    }
    if (parentModules.length === 0) {
        return moduleCalls[moduleName]
    }
    return getRecursiveBasePath(moduleCalls[parentModules[0]]?.module?.module_calls, parentModules.slice(1), moduleName)
}

export const getExtendedModuleName = (nodeGroup: NodeGroup) => {
    if (!nodeGroup.moduleName) {
        return ""
    }
    const modulesArray = [...nodeGroup.parentModules, nodeGroup.moduleName]
    return modulesArray.length > 0 ? "module." + modulesArray.join(".module.") : ""
}

const getNodeGroupName = (nameType: string, nodeModule: string, nodeGroups: Map<string, NodeGroup>) => {
    const nodeGroup = Array.from(nodeGroups).find(([key, value]) => {
        return (nodeModule === "root_module" ? !value.moduleName : getExtendedModuleName(value) === nodeModule) && value.nodes.some((node) => {
            return node.name === nameType.split(".")[1] && node.type === nameType.split(".")[0]
        })
    })
    return nodeGroup ? nodeGroup[1].type + "." + nodeGroup[1].name : ""
}

const makeUnique = (arr: {
    type: any;
    module: string;
    name: string;
}[]) => {
    return arr.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.module === v.module && t.type === v.type)) === i)

}

export type Dependency = {
    type: "output" | "variable" | "resource" | "module";
    module: string;
    name: string;
}

const removeDuplicates = (arr: Dependency[], selectedNode: NodeGroup) => {
    arr = arr.filter((dep) => {
        return dep.type === "resource" ?
            dep.name !== selectedNode.type + "." + selectedNode.name
            : dep.type === "module" ?
                dep.name !== (selectedNode.moduleName || "root_module")
                : true
    })
    return arr.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.module === v.module && t.type === v.type)) === i)
}

const getVarOutDependencies = (node: NodeGroup, varOut: TFVariableOutput[]) => {
    const deps: Dependency[] = []
    node.variableRefs?.forEach((variableRef) => {
        const moduleName = node.moduleName ? getExtendedModuleName(node) : "root_module"
        const variable = varOut?.find((variable) => variable.name === variableRef && variable.module === moduleName && variable.type === "variable")
        if (variable) {
            if (variable.expressionReferences.length === 1) {
                const lastSingleDependency = findLastSingleDependency(variable.expressionReferences[0], varOut, moduleName)
                deps.push(lastSingleDependency)
            } else {
                if (variable.expressionReferences.length > 1) {
                    // If the references all come from the same module, then push the module
                    const refModule = variable.expressionReferences ? variable.expressionReferences[0].module : ""
                    if (variable.expressionReferences.every((ref) => ref.module === refModule)) {
                        refModule !== moduleName && deps.push({
                            type: "module",
                            module: refModule,
                            name: refModule
                        })
                    } else {
                        deps.push({
                            type: "variable",
                            module: moduleName,
                            name: variableRef
                        })
                    }
                } else
                    deps.push({
                        type: "variable",
                        module: moduleName,
                        name: variableRef
                    })
            }
        }
    })
    node.outputRefs?.forEach((outputRef) => {
        const moduleName = outputRef.startsWith("module.") ? outputRef.split(".").slice(0, -1).join(".") : getExtendedModuleName(node) || "root_module"
        const output = varOut?.find((output) => output.name === (outputRef.startsWith("module.") ? outputRef.split(".")[2] : outputRef) &&
            output.module === moduleName)
        if (output) {
            if (output.expressionReferences.length === 1) {
                const lastSingleDependency = findLastSingleDependency(output.expressionReferences[0], varOut, moduleName)
                deps.push(lastSingleDependency)
            } else {
                if (output.expressionReferences.length > 1) {
                    const refModule = output.expressionReferences ? output.expressionReferences[0].module : ""
                    if (output.expressionReferences.every((ref) => ref.module === refModule)) {
                        refModule !== moduleName && deps.push({
                            type: "module",
                            module: refModule,
                            name: refModule
                        })
                    } else {
                        deps.push({
                            type: "output",
                            module: moduleName,
                            name: output.name
                        })
                    }
                } else
                    deps.push({
                        type: "output",
                        module: moduleName,
                        name: output.name
                    })
            }
        }
    })
    return deps
}

const getAffectedVarOut = (node: NodeGroup, varOut: TFVariableOutput[], nodes: NodeGroup[]) => {
    const deps: Dependency[] = []
    node.affectedOutputs?.forEach((outputRef) => {
        const moduleName = node.moduleName ? getExtendedModuleName(node) : "root_module"
        const output = varOut?.find((output) => output.name === outputRef && output.module === moduleName && output.type === "output")
        if (output) {
            const affected = [...varOut.filter((v) => v.expressionReferences.some((ref) => ref.type === "output" && ref.name === outputRef && ref.module === moduleName)),
            ...nodes.filter((n) => n.outputRefs?.includes(outputRef))]
            if (affected.length === 1) {
                const lastSingleAffected = findLastSingleAffected(affected[0], varOut, deps, nodes, moduleName)
                deps.push(lastSingleAffected)
            } else {
                if (affected.length > 1) {
                    const refModule = output.expressionReferences ? output.expressionReferences[0].module : ""
                    if (output.expressionReferences.every((ref) => ref.module === refModule)) {
                        refModule !== moduleName && deps.push({
                            type: "module",
                            module: refModule,
                            name: refModule
                        })
                    } else {
                        deps.push({
                            type: "output",
                            module: moduleName,
                            name: outputRef
                        })
                    }
                } else
                    deps.push({
                        type: "output",
                        module: moduleName,
                        name: outputRef
                    })
            }
        }
    })
    return deps

}

const findLastSingleAffected = (aff: TFVariableOutput | NodeGroup, varOut: TFVariableOutput[], deps: Dependency[], nodes: NodeGroup[], module: string) => {
    let lastSingleAffected = {
        type: (aff as any).id ? "resource" : aff.type as any,
        module: (aff as any).id ? getExtendedModuleName(aff as NodeGroup) || "root_module" : (aff as TFVariableOutput).module,
        name: (aff as any).id ? (aff as NodeGroup).type + "." + (aff as NodeGroup).name : (aff as TFVariableOutput).name
    }
    const affected = [...varOut.filter((v) => v.expressionReferences.some((ref) => ref.type === "output" && ref.name === aff.name && ref.module === lastSingleAffected.module)),
    ...nodes.filter((n) => lastSingleAffected.type === "variable" ? n.variableRefs?.includes(aff.name) : n.outputRefs?.includes(aff.name))]
    if (affected.length === 1) {
        lastSingleAffected = findLastSingleAffected(affected[0], varOut, deps, nodes, module)
    } else {
        if (affected.length > 1) {
            const refModule = (aff as TFVariableOutput).expressionReferences ? (aff as TFVariableOutput).expressionReferences[0].module : ""
            if ((aff as TFVariableOutput).expressionReferences.every((ref) => ref.module === refModule) && refModule !== module) {
                lastSingleAffected = {
                    type: "module",
                    module: refModule,
                    name: refModule
                }
            }
        }
    }
    return lastSingleAffected
}

const findLastSingleDependency = (levelOneDependency: Dependency, varOut: TFVariableOutput[], module: string) => {
    let lastSingleDependency = levelOneDependency
    const expressionReferences = varOut.filter((v) => v.module === lastSingleDependency.module && v.name === lastSingleDependency.name && v.type === lastSingleDependency.type)[0]?.expressionReferences
    if (expressionReferences && expressionReferences.length === 1) {
        lastSingleDependency = findLastSingleDependency(expressionReferences[0], varOut, module)
    } else {
        if (expressionReferences && expressionReferences.length > 1) {
            const refModule = expressionReferences[0].module
            if (expressionReferences.every((ref) => ref.module === refModule) && refModule !== module) {
                lastSingleDependency = {
                    type: "module",
                    module: refModule,
                    name: refModule
                }
            }
        }
    }
    return lastSingleDependency
}

//TODO: need to consider affected inputs of other modules

export const resourceDependencies = (nodes: NodeGroup[], selectedNode: NodeGroup, variables: TFVariableOutput[], outputs: TFVariableOutput[]) => {
    const dependencies = removeDuplicates([...getVarOutDependencies(selectedNode, [...variables, ...outputs]),
    ...nodes.filter((n) => n.connectionsOut?.includes(selectedNode.id)).map((n) => {
        return {
            type: "resource" as any,
            module: n.moduleName ? getExtendedModuleName(n) : "root_module",
            name: n.type + "." + n.name
        }
    })
    ], selectedNode)
    const affected = removeDuplicates([...getAffectedVarOut(selectedNode, [...variables, ...outputs], nodes),
    ...nodes.filter((n) => n.connectionsIn?.includes(selectedNode.id)).map((n) => {
        return {
            type: "resource" as any,
            module: n.moduleName ? getExtendedModuleName(n) : "root_module",
            name: n.type + "." + n.name
        }
    })], selectedNode)

    return {
        dependencies,
        affected
    }
}

export const moduleDependencies = (nodes: NodeGroup[], selectedModule: string, variables: TFVariableOutput[], outputs: TFVariableOutput[]) => {
    const moduleNodes = nodes.filter((n) => n.moduleName === selectedModule)
    const deps: Dependency[] = []
    const aff: Dependency[] = []
    moduleNodes.forEach((node) => {
        const { dependencies, affected } = resourceDependencies(nodes, node, variables, outputs)
        dependencies.forEach((d) => {
            if (!deps.some((dep) => dep.module === d.module) && d.module !== selectedModule)
                deps.push({
                    type: "module" as any,
                    module: d.module,
                    name: d.module
                })
        })
        affected.forEach((a) => {
            if (!aff.some((dep) => dep.module === a.module) && a.module !== selectedModule)
                aff.push({
                    type: "module" as any,
                    module: a.module,
                    name: a.module
                })
        })
    })
    return {
        dependencies: deps,
        affected: aff
    }
}
