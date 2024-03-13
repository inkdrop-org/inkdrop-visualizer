import { Grid, Typography } from "@mui/material"
import { NodeGroup, TFVariable } from "../TLDWrapper"
import { useEffect, useState } from "react"
import { getVarOutDependencies } from "../utils/varOut"

interface VarsAndOutputsPanelProps {
    selectedNode: NodeGroup
    sidebarWidth: number
    variables: { [moduleName: string]: TFVariable[] } | undefined
    selectedVarOutput: string
    setSelectedOutput: (output: string, module: string) => void
    setSelectedVar: (variable: string, module: string) => void
}

const VarsAndOutputsPanel = ({
    selectedNode, sidebarWidth, variables, setSelectedOutput, setSelectedVar
}: VarsAndOutputsPanelProps) => {

    const [dependencies, setDependencies] = useState<{
        type: "output" | "variable" | "unknown";
        module: string;
        name: string;
    }[]>([])

    useEffect(() => {
        if (!variables) return
        const deps = getVarOutDependencies(selectedNode, variables)
        setDependencies(deps)
    }, [selectedNode])

    return (
        <div className="absolute bottom-0 left-0 bg-[#F7F7F8] z-200 w-full border-t border-dashed border-black"
            style={{ paddingRight: sidebarWidth + "rem" }}
        >
            <Grid container>
                <Grid item xs={4} className="p-2 border-r border-dashed border-black">
                    <div className={"mb-3 max-w-full text-xl truncate"}>
                        External dependencies
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden h-24">
                        {
                            dependencies.map((dep, index) => (
                                <button
                                    key={index + "-dep"}
                                    className="inline-block border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate"
                                    type="button"
                                    style={{ backgroundColor: "white" }}
                                    onClick={() => {
                                        dep.type === "output" ? setSelectedOutput(dep.name, dep.module) : setSelectedVar(dep.name, dep.module)
                                    }}
                                >
                                    {"(" + dep.module + ") " + dep.name}
                                </button>
                            ))

                        }

                    </div>
                </Grid>
                <Grid item xs={4} className="p-2">
                    <div className={"mb-3 max-w-full text-xl truncate"}>
                        Variables
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden h-24">
                        {
                            selectedNode.variableRefs?.map((variableRef, index) => (
                                <button
                                    key={index + "-var"}
                                    className="inline-block bg-white border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate"
                                    type="button"
                                    onClick={() => {
                                        setSelectedVar(variableRef, selectedNode.moduleName || "root_module")
                                    }}
                                >
                                    {variableRef}
                                </button>
                            ))

                        }
                    </div>
                </Grid>
                <Grid item xs={4} className="border-l border-dashed border-black p-2">
                    <div className={"mb-3 max-w-full text-xl truncate"}>
                        Outputs
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden h-24">
                        {
                            selectedNode.outputRefs?.map((outputRef, index) => (
                                <button
                                    key={index + "-output"}
                                    className="inline-block bg-white border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate"
                                    type="button"
                                    onClick={() => {
                                        setSelectedOutput(outputRef, selectedNode.moduleName || "root_module")
                                    }}
                                >
                                    {outputRef}
                                </button>
                            ))
                        }
                    </div>
                </Grid>
            </Grid>
        </div>
    )
}
export default VarsAndOutputsPanel