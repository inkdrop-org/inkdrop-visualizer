import { Editor } from "@tldraw/tldraw";
import { NodeGroup } from "../TLDWrapper";
import { Dependency } from "./dependencies";

interface DependencyUIProps {
    dependencies: Dependency[];
    affected: Dependency[];
    sidebarWidth: number;
    nodeGroups: NodeGroup[];
    selectedNode: NodeGroup;
    editor: Editor;
}

const DependencyUI = ({
    dependencies,
    affected,
    sidebarWidth,
    nodeGroups,
    selectedNode,
    editor
}: DependencyUIProps) => {

    const getResourceIcon = (dep: Dependency) => {
        const iconPath = nodeGroups.find(n =>
            n.type === dep.name.split(".")[0] && n.name === dep.name.split(".")[1] && (dep.module === "root_module" ?
                !n.moduleName : dep.module === n.moduleName))?.iconPath || "";
        return (
            <img
                className="w-4 h-4 relative"
                src={iconPath}
                alt="icon"
            />
        )
    }

    const dependenciesByType = (dep: Dependency[], type: "resource" | "variable" | "output" | "module") => {
        return dep.filter((dep) => dep.type === type).map((dep, index) => (
            <div
                onClick={type === "resource" ? () => {
                    editor.select(...(Array.from(editor.getCurrentPageShapeIds()).filter((id) => {
                        const clickedNodeId = nodeGroups.find(n =>
                            n.type === dep.name.split(".")[0] && n.name === dep.name.split(".")[1] && (dep.module === "root_module" ?
                                !n.moduleName : dep.module === n.moduleName))?.id
                        return id.split(":")[1] === clickedNodeId
                    })))
                } : undefined}
                key={index + "-" + type + "-dep"}
                className="inline-flex items-center border border-black text-black py-1 px-2 mr-1 h-[25px] text-[10px] rounded truncate min-w-max cursor-pointer"
                style={type === "resource" ?
                    {
                        backgroundColor: "white",
                        opacity: nodeGroups.find(n =>
                            n.type === dep.name.split(".")[0] && n.name === dep.name.split(".")[1] && (dep.module === "root_module" ?
                                !n.moduleName : dep.module === n.moduleName))?.numberOfChanges === 0 ? 0.2 : 1
                    } :
                    { backgroundColor: "white" }}
            >
                {type === "resource" ?
                    <>
                        {getResourceIcon(dep)}
                        <div className="ml-1">{dep.name.split(".")[1]}</div>
                    </> :
                    <>
                        <div className="h-4" />
                        <div className=" relative font-bold text-[0.9rem]">
                            {(dep.module === "root_module" ? !selectedNode.moduleName : dep.module === selectedNode.moduleName) ? type.charAt(0).toUpperCase() : "!" + type.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-1">
                            {dep.name}
                        </div>
                    </>
                }

            </div>
        ))
    }

    const dependenciesMap = (dep: Dependency[]) => {
        return (
            <>
                {dependenciesByType(dep, "resource")}
                {dependenciesByType(dep, "module")}
                {dependenciesByType(dep, "variable")}
                {dependenciesByType(dep, "output")}
            </>
        )
    }

    return (
        <>
            <div className="absolute top-0 left-0 bg-[#F7F7F8] z-200 w-full border-b border-black"
                style={{ paddingRight: sidebarWidth + "rem" }}
            >
                <div className="flex items-center h-12 px-4">
                    <div className="text-sm min-w-max">{
                        dependencies.length === 0 ? "No dependencies found" :
                            "This resource depends on"

                    }</div>
                    <div className="overflow-x-auto px-4 whitespace-nowrap"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {dependenciesMap(dependencies)}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 bg-[#F7F7F8] z-200 w-full border-t border-black"
                style={{ paddingRight: sidebarWidth + "rem" }}
            >
                <div className="flex items-center h-12 px-4">
                    <div className="text-sm min-w-max">{
                        affected.length === 0 ? "No components depend on this" :
                            "Components that depend on this"
                    }
                    </div>
                    <div className="overflow-x-auto px-4 whitespace-nowrap"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {dependenciesMap(affected)}
                    </div>
                </div>
            </div>
        </>
    )
}

export default DependencyUI;