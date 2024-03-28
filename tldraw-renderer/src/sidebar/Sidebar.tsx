import { Checkbox, Drawer, FormControlLabel, FormGroup, IconButton, Tooltip, Typography } from "@mui/material"
import "./Sidebar.css"
import CloseIcon from '@mui/icons-material/Close';
import ResourceDrilldown from "./ResourceDrilldown";
import { NodeGroup } from "../TLDWrapper";

interface SidebarProps {
    width: number;
    text: string;
    handleShowUnknownChange: (showHidden: boolean) => void;
    handleShowUnchangedChange: (showHidden: boolean) => void;
    resourceId: string;
    showUnknown: boolean;
    showUnchanged: boolean;
    closeSidebar: () => void;
    title: string
    subtitle: string
}
const Sidebar = ({
    width,
    text,
    handleShowUnknownChange,
    handleShowUnchangedChange,
    showUnknown,
    resourceId,
    showUnchanged,
    title,
    subtitle,
    closeSidebar,

}: SidebarProps) => {
    return (
        <Drawer
            anchor={"right"}
            variant="persistent"
            open={true}
            sx={{
                "& .MuiPaper-root": {
                    backgroundColor: "#F7F7F8",
                    borderLeft: "1px solid"
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

                <ResourceDrilldown
                    showUnchanged={showUnchanged}
                    showUnknown={showUnknown}
                    text={text}
                    resourceId={resourceId}
                    handleShowUnknownChange={handleShowUnknownChange}
                    handleShowUnchangedChange={handleShowUnchangedChange}
                />
            </div>

        </Drawer >
    )
}

export default Sidebar;