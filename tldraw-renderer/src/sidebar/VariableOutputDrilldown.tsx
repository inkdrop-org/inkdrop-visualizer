import { get } from "core-js/core/dict";
import { NodeGroup, TFOutput, TFVariable } from "../TLDWrapper";
import { unique } from "../utils/array";
import { getVarOutDependencies } from "../utils/varOut";

interface VariableOutputDrilldownProps {
    selectedVarOutput: TFVariable | TFOutput;
    handleVarOutputSelectionChange: (varOutput: string, module: string, type: "variable" | "output") => void;
    handleNodeSelectionChange: (node: NodeGroup) => void;
    nodeGroups: NodeGroup[];
    variables: { [moduleName: string]: TFVariable[] };
    outputs: { [moduleName: string]: TFOutput[] };
}

const VariableOutputDrilldown = ({
    selectedVarOutput,
    handleVarOutputSelectionChange,
    handleNodeSelectionChange,
    nodeGroups,
    variables,
    outputs
}: VariableOutputDrilldownProps) => {

    const type = selectedVarOutput.hasOwnProperty("outputReferences") ? "output" : "variable"
    const selectedModule = selectedVarOutput.module

    const getAllModules = () => {
        return unique(Object.keys(variables).concat(Object.keys(outputs)).concat(nodeGroups.map((node) => node.moduleName || "root_module")))
    }

    const referenceModules = unique(type === "variable" ? (selectedVarOutput as TFVariable).expressionReferences.map((dep) => dep.module) :
        (selectedVarOutput as TFOutput).outputReferences.map((dep) => dep.module))

    const getFilteredNodes = (dep: {
        module: string;
        name: string;
    }) => {
        return nodeGroups.filter((node) => {
            return ((!node.moduleName && dep.module === "root_module") ||
                node.moduleName === dep.module) &&
                node.nodes.some((n) => {
                    const centralPart = n.nodeModel.id.split(" ")[1]
                    return dep.name === centralPart || centralPart.endsWith("." + dep.name)
                }
                )
        })
    }

    const getReferences = () => {
        const modules = referenceModules.map((module, index) => (
            <div className="inline-block border border-black py-1 px-2 mr-2 mb-[10px] rounded max-w-full">
                {module}
                {
                    <div className="mt-[10px]">
                        {getReferencesButtons(index, module, type === "variable" ?
                            (selectedVarOutput as TFVariable).expressionReferences :
                            (selectedVarOutput as TFOutput).outputReferences)
                        }
                    </div>
                }
            </div>
        ))
        return <>
            {modules.length > 0 && <>
                <div>
                    {"Resources that define this " + type}
                </div>
                <div className="overflow-y-auto overflow-x-hidden mt-[10px]">
                    {modules}
                </div>
            </>
            }
        </>
    }

    const getReferencesButtons = (moduleIndex: number, module: string, references: {
        module: string;
        name: string;
        type: "variable" | "output" | "resource" | "unknown";
    }[]) => {
        console.log("references", references)
        return <>
            {
                references.filter((dep) => {
                    return dep.module === module &&
                        (dep.type !== "resource" || getFilteredNodes(dep).length > 0) &&
                        getFilteredNodes(dep).some((node) => !["no-op", "read"].includes(node.state))
                }).map((dep, index) => (
                    <button
                        key={moduleIndex + index + "reference"}
                        className="flex border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate bg-white"
                        type="button"
                        onClick={() => {
                            dep.type === "variable" || dep.type === "output" ?
                                handleVarOutputSelectionChange(dep.name, dep.module, dep.type)
                                : handleNodeSelectionChange(getFilteredNodes(dep)[0])
                        }}
                    >
                        <strong>{dep.type === "variable" ? "(V) " : dep.type === "output" && "(O) "}</strong>
                        {dep.name}
                        {
                            dep.type === "resource" && !["no-op", "read"].includes(getFilteredNodes(dep)[0].state) &&
                            <span className=" ml-1 pt-[1px]"><div
                                style={{
                                    backgroundColor: getFilteredNodes(dep)[0].state === "create" ? "#dcfce7" :
                                        getFilteredNodes(dep)[0].state === "delete" ? "#fee2e2" : "#fef9c3",
                                    borderColor: getFilteredNodes(dep)[0].state === "create" ? "#22c55e" :
                                        getFilteredNodes(dep)[0].state === "delete" ? "#ef4444" : "#eab208",
                                    fontSize: "10px"
                                }}
                                className='rounded-full border h-3 w-3 text-center leading-[14px]'>
                            </div>
                            </span>
                        }
                    </button>
                ))
            }
            {
                references.filter((dep) => {
                    return dep.module === module &&
                        (dep.type !== "resource" || getFilteredNodes(dep).length > 0) &&
                        getFilteredNodes(dep).some((node) => ["no-op", "read"].includes(node.state))
                }).map((dep, index) => (
                    <button
                        key={moduleIndex + index + "reference-shaded"}
                        className="flex border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate bg-white opacity-20"
                        type="button"
                        onClick={() => {
                            handleNodeSelectionChange(getFilteredNodes(dep)[0])
                        }}
                    >
                        <strong>{dep.type === "variable" ? "(V) " : dep.type === "output" && "(O) "}</strong>
                        {dep.name}
                        {
                            dep.type === "resource" && !["no-op", "read"].includes(getFilteredNodes(dep)[0].state) &&
                            <span className=" ml-1 pt-[1px]"><div
                                style={{
                                    backgroundColor: getFilteredNodes(dep)[0].state === "create" ? "#dcfce7" :
                                        getFilteredNodes(dep)[0].state === "delete" ? "#fee2e2" : "#fef9c3",
                                    borderColor: getFilteredNodes(dep)[0].state === "create" ? "#22c55e" :
                                        getFilteredNodes(dep)[0].state === "delete" ? "#ef4444" : "#eab208",
                                    fontSize: "10px"
                                }}
                                className='rounded-full border h-3 w-3 text-center leading-[14px]'>
                            </div>
                            </span>
                        }
                    </button>
                ))
            }
        </>
    }

    const getAffected = () => {
        const resources = Object.entries(getAffectedResources()).filter(([module, affectedResources]) =>
            affectedResources.resources.length > 0 ||
            affectedResources.variables.length > 0 ||
            affectedResources.outputs.length > 0
        ).map(([module, affectedResources], i) => (
            <div key={i + "-affected-resources"} className="inline-block border border-black py-1 px-2 mr-2 mb-[10px] rounded max-w-full">
                {module}
                {
                    <div className="mt-[10px]">
                        {
                            affectedResources.resources.filter((resource) => {
                                return !["no-op", "read"].includes(resource.node.state)
                            }).map((resource, j) => (
                                <button
                                    key={i + "-" + j + "-resource"}
                                    className="inline-block border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate bg-white"
                                    type="button"
                                    onClick={() => {
                                        handleNodeSelectionChange(getFilteredNodes({ module, name: resource.id })[0])
                                    }}
                                >
                                    <div className="flex">
                                        {resource.id}
                                        {
                                            !["no-op", "read"].includes(resource.node.state) &&
                                            <span className=" ml-1 pt-[1px]"><div
                                                style={{
                                                    backgroundColor: resource.node.state === "create" ? "#dcfce7" :
                                                        resource.node.state === "delete" ? "#fee2e2" : "#fef9c3",
                                                    borderColor: resource.node.state === "create" ? "#22c55e" :
                                                        resource.node.state === "delete" ? "#ef4444" : "#eab208",
                                                    fontSize: "10px"
                                                }}
                                                className='rounded-full border h-3 w-3 text-center leading-[14px]'>
                                            </div>
                                            </span>
                                        }
                                    </div>
                                </button>
                            ))}
                        {
                            affectedResources.variables.map((variable, j) => (
                                <button
                                    key={i + "-" + j + "-variable"}
                                    className="inline-block border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate bg-white"
                                    type="button"
                                    onClick={() => {
                                        handleVarOutputSelectionChange(variable, module, "variable")
                                    }}
                                >
                                    <strong>(V) </strong>{variable}
                                </button>
                            ))}
                        {affectedResources.outputs.map((output, j) => (
                            <button
                                key={i + "-" + j + "-output"}
                                className="inline-block border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate bg-white"
                                type="button"
                                onClick={() => {
                                    handleVarOutputSelectionChange(output, module, "output")
                                }}
                            >
                                <strong>(O) </strong>{output}
                            </button>
                        ))}
                        {
                            affectedResources.resources.filter((resource) => {
                                return ["no-op", "read"].includes(resource.node.state)
                            }).map((resource, j) => (
                                <button
                                    key={i + "-" + j + "-resource"}
                                    className="inline-block border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate bg-white
                        opacity-20"
                                    type="button"
                                    onClick={() => {
                                        handleNodeSelectionChange(getFilteredNodes({ module, name: resource.id })[0])
                                    }}
                                >
                                    <div className="flex">
                                        {resource.id}
                                        {
                                            !["no-op", "read"].includes(resource.node.state) &&
                                            <span className=" ml-1 pt-[1px]"><div
                                                style={{
                                                    backgroundColor: resource.node.state === "create" ? "#dcfce7" :
                                                        resource.node.state === "delete" ? "#fee2e2" : "#fef9c3",
                                                    borderColor: resource.node.state === "create" ? "#22c55e" :
                                                        resource.node.state === "delete" ? "#ef4444" : "#eab208",
                                                    fontSize: "10px"
                                                }}
                                                className='rounded-full border h-3 w-3 text-center leading-[14px]'>
                                            </div>
                                            </span>
                                        }
                                    </div>
                                </button>
                            ))}
                    </div>
                }
            </div>
        )
        )
        return <>
            {resources.length > 0 &&
                <>
                    <div>
                        {"Affected resources"}
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden mt-[10px]">
                        {
                            resources
                        }
                    </div>
                </>
            }
        </>
    }

    const getAffectedResources = () => {
        const modules = getAllModules()
        // create an object having modules as keys, and an array of affected resources, variables and outputs as values
        const affectedResources: {
            [module: string]: {
                resources: {
                    id: string;
                    node: NodeGroup;
                }[], variables: string[], outputs: string[]
            }
        } = {}
        modules.forEach((module) => {
            affectedResources[module] = {
                resources:
                    (type === "variable" ?
                        nodeGroups.filter(
                            (node) => node.moduleName === module &&
                                (type === "variable" ? node.variableRefs?.includes(selectedVarOutput.name) :
                                    node.outputRefs?.includes(selectedVarOutput.name))
                        ) :
                        nodeGroups.filter((node) =>
                            node.moduleName === module &&
                            getVarOutDependencies(node, variables).some((dep) => dep.name === selectedVarOutput.name && dep.module === selectedModule)))
                        .map((node) => {
                            return {
                                id: node.type + "." + node.name,
                                node: node
                            }
                        }),

                variables: variables[module]?.filter((variable) => variable.expressionReferences.some((ref) =>
                    ref.name === selectedVarOutput.name && ref.type === type && ref.module === selectedModule
                )).map((variable) => variable.name) || [],
                outputs: outputs[module]?.filter((output) => output.outputReferences.some((ref) =>
                    ref.name === selectedVarOutput.name && ref.type === type && ref.module === selectedModule
                )).map((output) => output.name) || []
            }
        })
        console.log("affectedResources", affectedResources)
        return affectedResources
    }

    return (
        <>
            {
                getReferences()
            }
            {
                getAffected()
            }
        </>
    )
}

export default VariableOutputDrilldown;