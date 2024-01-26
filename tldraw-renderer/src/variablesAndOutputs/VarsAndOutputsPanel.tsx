import { Grid, Typography } from "@mui/material"
import { NodeGroup, TFVariable } from "../TLDWrapper"
import { useEffect, useState } from "react"

interface VarsAndOutputsPanelProps {
    selectedNode: NodeGroup
    sidebarWidth: number
    variables: { [moduleName: string]: TFVariable[] } | undefined
}

const VarsAndOutputsPanel = ({
    selectedNode, sidebarWidth, variables
}: VarsAndOutputsPanelProps) => {

    const [dependencies, setDependencies] = useState<{
        type: "output" | "variable" | "unknown";
        module: string;
        name: string;
    }[]>([])

    useEffect(() => {
        const deps: {
            type: "output" | "variable" | "unknown";
            module: string;
            name: string;
        }[] = []
        selectedNode.variableRefs?.forEach((variableRef) => {
            const moduleName = selectedNode.moduleName || "root_module"
            const variable = variables?.[moduleName]?.find((variable) => variable.name === variableRef)
            if (variable) {
                variable.expressionReferences.forEach((dep) => {
                    if (!deps.some((d) => d.name === dep.name && d.type === dep.type && d.module === dep.module)) {
                        deps.push(dep)
                    }
                })
            }
        })
        setDependencies(deps)
    }, [selectedNode])

    return (
        <div className="absolute bottom-0 left-0 bg-white z-200 w-full border-t border-dashed border-black"
            style={{ paddingRight: sidebarWidth + "rem" }}
        >
            <Grid container>
                <Grid item xs={4} className="p-2 border-r border-dashed border-black">
                    <div className={"mb-3 max-w-full text-xl truncate"}>
                        External dependencies
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden h-40">
                        {
                            dependencies.map((dep, index) => (
                                <span key={index} className="inline-block border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate"
                                    style={{ backgroundColor: dep.type === "output" ? "#F9F4FB" : "#FEF5E7" }}
                                >
                                    {"(" + dep.module + ") " + dep.name}
                                </span>
                            ))
                        }
                    </div>
                </Grid>
                <Grid item xs={4} className="p-2">
                    <div className={"mb-3 max-w-full text-xl truncate"}>
                        Variables
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden h-40">
                        {
                            selectedNode.variableRefs?.map((variableRef, index) => (
                                <span key={index} className="inline-block bg-[#FEF5E7] border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate">
                                    {variableRef}
                                </span>
                            ))
                        }
                    </div>
                </Grid>
                <Grid item xs={4} className="border-l border-dashed border-black p-2">
                    <div className={"mb-3 max-w-full text-xl truncate"}>
                        Outputs
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden h-40">

                        {
                            selectedNode.outputRefs?.map((outputRef, index) => (
                                <span key={index} className="inline-block bg-[#F9F4FB] border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate">
                                    {outputRef}
                                </span>
                            ))
                        }
                    </div>
                </Grid>
            </Grid>
        </div>
    )
}
export default VarsAndOutputsPanel