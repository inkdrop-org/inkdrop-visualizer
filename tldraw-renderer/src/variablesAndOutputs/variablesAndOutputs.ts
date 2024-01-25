import { NodeGroup, TFOutput, TFVariable } from "../TLDWrapper";
import { getResourceNameAndType } from "../utils/resources";

export const getVariablesAndOutputs = (nodeGroups: Map<string, NodeGroup>, planJson: any) => {
    const variables: {
        [moduleName: string]: TFVariable[]
    } = {}
    const outputs: {
        [moduleName: string]: TFOutput[]
    } = {}

    if (planJson) {
        variables["root_module"] = Object.keys(planJson?.configuration?.root_module?.variables || {}).map((key) => {
            return {
                name: key,
                expressionReferences: []
            }
        })
        outputs["root_module"] = Object.keys(planJson?.configuration?.root_module?.outputs || {}).map((key) => {
            const thisModule = "root_module"
            return {
                name: key,
                outputReferences: planJson?.configuration?.root_module?.outputs?.[key]?.expression?.references?.map((r: any) => {
                    const type = r.startsWith("var.") ? "variable" : r.startsWith("module.") ? "output" : "resource"
                    const module = type === "variable" || type === "resource" ? thisModule : type === "output" ? r.split(".")[1] : ""
                    return {
                        type,
                        module,
                        name: type === "variable" ? r.split(".")[1] : type === "output" ? r.split(".")[2] : r,
                    }
                }).filter((e: any) => e.name && !e.name.includes("[")) || [],
            }
        })
    }

    nodeGroups.forEach((nodeGroup) => {
        const moduleName = nodeGroup.moduleName
        const nodeVariableRefs: string[] = []
        nodeGroup.nodes.forEach((node) => {

            const address = node.nodeModel.id.split(" ")[1]
            const { resourceType, resourceName } = getResourceNameAndType(address)

            const basePath = moduleName ?
                planJson?.configuration?.root_module?.module_calls?.[moduleName!].module :
                planJson?.configuration?.root_module

            Object.entries(basePath?.resources.filter((r: any) => {
                return r.type === resourceType && r.name === resourceName
            })[0].expressions).forEach(([key, value]) => {
                if ((value as any).references) {
                    (value as any).references.forEach((ref: string) => {
                        if (ref.startsWith("var.") && !nodeVariableRefs.includes(ref.split(".")[1])) {
                            nodeVariableRefs.push(ref.split(".")[1])
                        }
                    })
                }
            })
        })

        nodeGroup.variableRefs = nodeVariableRefs


        if (moduleName) {
            if (!variables[moduleName]) {
                const parentModule = "root_module"
                variables[moduleName] = Object.keys(planJson?.configuration?.root_module?.module_calls?.[moduleName]?.module?.variables || {}).map((key) => {
                    return {
                        name: key,
                        expressionReferences: planJson?.configuration?.root_module?.module_calls?.[moduleName]?.expressions?.[key]?.references?.map((r: any) => {
                            const type = r.startsWith("var.") ? "variable" : r.startsWith("module.") ? "output" : "unknown"
                            const module = type === "variable" ? parentModule : type === "output" ? r.split(".")[1] : ""
                            return {
                                type,
                                module,
                                name: type === "variable" ? r.split(".")[1] : r.split(".")[2],
                            }
                        }).filter((e: any) => e.name && !e.name.includes("[")) || [],
                    }
                })
            }
            if (!outputs[moduleName]) {
                outputs[moduleName] = Object.keys(planJson?.configuration?.root_module?.module_calls?.[moduleName]?.module?.outputs || {}).map((key) => {
                    const thisModule = moduleName
                    return {
                        name: key,
                        outputReferences: planJson?.configuration?.root_module?.module_calls?.[moduleName]?.module?.outputs?.[key]?.expression?.references?.map((r: any) => {
                            const type = r.startsWith("var.") ? "variable" : r.startsWith("module.") ? "output" : "resource"
                            const module = type === "variable" || type === "resource" ? thisModule : type === "output" ? r.split(".")[1] : ""
                            return {
                                type,
                                module,
                                name: type === "variable" ? r.split(".")[1] : type === "output" ? r.split(".")[2] : r,
                            }
                        }).filter((e: any) => e.name && !e.name.includes("[")) || [],
                    }
                })
            }
        }
    })
    nodeGroups.forEach((nodeGroup) => {
        const nodeOutputRefs: string[] = []
        nodeGroup.nodes.forEach((node) => {
            const address = node.nodeModel.id.split(" ")[1]
            const { resourceType, resourceName } = getResourceNameAndType(address)

            outputs[nodeGroup.moduleName || "root_module"].forEach((output) => {
                if (output.outputReferences.some((ref) => ref.type === "resource" && ref.name === resourceType + "." + resourceName)) {
                    if (!nodeOutputRefs.includes(output.name))
                        nodeOutputRefs.push(output.name)
                }
            })
        })
        nodeGroup.outputRefs = nodeOutputRefs
    })

    return { variables, outputs }
}