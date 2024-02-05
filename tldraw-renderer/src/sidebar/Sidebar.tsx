import { Checkbox, Drawer, FormControlLabel, FormGroup, IconButton, Tooltip, Typography } from "@mui/material"
import "./Sidebar.css"
import CloseIcon from '@mui/icons-material/Close';
import ResourceDrilldown from "./ResourceDrilldown";
import VariableOutputDrilldown from "./VariableOutputDrilldown";
import { NodeGroup, TFOutput, TFVariable } from "../TLDWrapper";

interface SidebarProps {
    width: number;
    text: string;
    selectedVarOutput: TFVariable | TFOutput | undefined;
    handleShowUnknownChange: (showHidden: boolean) => void;
    handleVarOutputSelectionChange: (varOutput: string, module: string, type: "variable" | "output") => void;
    nodeGroups: NodeGroup[];
    handleNodeSelectionChange: (node: NodeGroup) => void;
    closeSidebar: () => void;
    title: string
    subtitle: string
    variables: { [moduleName: string]: TFVariable[] };
    outputs: { [moduleName: string]: TFOutput[] };
}
const Sidebar = ({ width,
    text,
    handleShowUnknownChange,
    title,
    subtitle,
    closeSidebar,
    selectedVarOutput,
    handleVarOutputSelectionChange,
    nodeGroups,
    handleNodeSelectionChange,
    variables,
    outputs
}: SidebarProps) => {
    return (
        <Drawer
            anchor={"right"}
            variant="persistent"
            open={true}
            sx={{
                "& .MuiPaper-root": {
                    backgroundColor: "#F7F7F8",
                    borderLeft: "1px dashed"
                }
            }}
        >
            <div className="absolute top-4 right-4">
                <Tooltip title="Close sidebar" placement="bottom">
                    <IconButton onClick={() => closeSidebar()} >
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </div>
            <div className="top-5 pl-4 pt-4 max-w-[20rem]">
                <div className={"mb-1 max-w-full text-2xl truncate"}>
                    {title}
                </div>
                <div className="max-w-full text-xs truncate text-[#666666]">
                    {subtitle}
                </div>
                <div className="w-[28rem] my-4 h-[1px] bg-[#B2AEB6]" />
            </div>
            <div
                className="overflow-hidden h-full flex flex-col px-4"
                style={{
                    width: width + "rem",
                }}>
                {selectedVarOutput ?
                    <VariableOutputDrilldown
                        nodeGroups={nodeGroups}
                        handleNodeSelectionChange={handleNodeSelectionChange}
                        selectedVarOutput={selectedVarOutput}
                        handleVarOutputSelectionChange={handleVarOutputSelectionChange}
                        variables={variables}
                        outputs={outputs}
                    /> :
                    <ResourceDrilldown
                        text={text}
                        handleShowUnknownChange={handleShowUnknownChange}
                    />}
            </div>

        </Drawer >
    )
}

export default Sidebar;