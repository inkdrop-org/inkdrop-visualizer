import { NodeGroup, TFVariable } from "../TLDWrapper";

export const getVarOutDependencies = (node: NodeGroup, variables: { [moduleName: string]: TFVariable[] }) => {
    const deps: {
        type: "output" | "variable" | "unknown";
        module: string;
        name: string;
    }[] = []
    node.variableRefs?.forEach((variableRef) => {
        const moduleName = node.moduleName || "root_module"
        const variable = variables?.[moduleName]?.find((variable) => variable.name === variableRef)
        if (variable) {
            variable.expressionReferences.forEach((dep) => {
                if (!deps.some((d) => d.name === dep.name && d.type === dep.type && d.module === dep.module)) {
                    deps.push(dep)
                }
            })
        }
    })
    return deps
}
