import { NodeGroup } from "../TLDWrapper";
import { Dependency } from "./dependencies";

interface DependencyUIProps {
    dependencies: Dependency[];
    affected: Dependency[];
    sidebarWidth: number;
    nodeGroups: NodeGroup[];
    selectedNode: NodeGroup;
}

const DependencyUI = ({
    dependencies,
    affected,
    sidebarWidth,
    nodeGroups,
    selectedNode
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

    const dependenciesMap = (dep: Dependency[]) => {
        return (
            <>
                {
                    dep.filter((dep) => dep.type === "resource").map((dep, index) => (
                        <div
                            key={index + "-res-dep"}
                            className="inline-flex items-center border border-black text-black py-1 px-2 mr-1 text-[10px] rounded truncate min-w-max h-[25px]"
                            style={{
                                backgroundColor: "white",
                                opacity: nodeGroups.find(n =>
                                    n.type === dep.name.split(".")[0] && n.name === dep.name.split(".")[1] && (dep.module === "root_module" ?
                                        !n.moduleName : dep.module === n.moduleName))?.numberOfChanges === 0 ? 0.2 : 1
                            }}
                        >
                            <>
                                {getResourceIcon(dep)}
                                <div className="ml-1">{dep.name.split(".")[1]}</div>
                            </>
                        </div>
                    ))

                }
                {
                    dep.filter((dep) => dep.type === "module").map((dep, index) => (
                        <div
                            key={index + "-mod-dep"}
                            className="inline-flex items-center border border-black text-black py-1 px-2 mr-1 h-[25px] text-[10px] rounded truncate min-w-max"
                            style={{ backgroundColor: "white" }}
                        >
                            <div className="h-4" />
                            <div className=" relative font-bold text-[0.9rem]">
                                {(dep.module === "root_module" ? !selectedNode.moduleName : dep.module === selectedNode.moduleName) ? "M" : "!M"}
                            </div>
                            <div className="ml-1">
                                {dep.name}
                            </div>
                        </div>
                    ))
                }
                {
                    dep.filter((dep) => dep.type === "variable").map((dep, index) => (
                        <div
                            key={index + "-var-dep"}
                            className="inline-flex items-center border border-black text-black py-1 px-2 mr-1 h-[25px] text-[10px] rounded truncate min-w-max"
                            style={{ backgroundColor: "white" }}
                        >
                            <div className="h-4" />
                            <div className=" relative font-bold text-[0.9rem]">
                                {(dep.module === "root_module" ? !selectedNode.moduleName : dep.module === selectedNode.moduleName) ? "V" : "!V"}
                            </div>
                            <div className="ml-1">
                                {dep.name}
                            </div>
                        </div>
                    ))}
                {
                    dep.filter((dep) => dep.type === "output").map((dep, index) => (
                        <div
                            key={index + "-out-dep"}
                            className="inline-flex items-center border border-black text-black py-1 px-2 mr-1 h-[25px] text-[10px] rounded truncate min-w-max"
                            style={{ backgroundColor: "white" }}
                        >
                            <div className="h-4" />
                            <div className=" relative font-bold text-[0.9rem]">
                                {(dep.module === "root_module" ? !selectedNode.moduleName : dep.module === selectedNode.moduleName) ? "O" : "!O"}
                            </div>
                            <div className="ml-1">
                                {dep.name}
                            </div>
                        </div>
                    ))
                }
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