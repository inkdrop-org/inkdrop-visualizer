import { Checkbox, Drawer, FormControlLabel, FormGroup, IconButton, Tooltip, Typography } from "@mui/material"
import "./Sidebar.css"
import CloseIcon from '@mui/icons-material/Close';
import ResourceDrilldown from "./ResourceDrilldown";
import { ChangesBreakdown } from "../jsonPlanManager/jsonPlanManager";
import ModuleDrilldown from "./ModuleDrilldown";
import ChangesBadge from "./ChangesBadge";

interface SidebarProps {
    width: number;
    text: string;
    handleShowUnknownChange: (showHidden: boolean) => void;
    handleShowUnchangedChange: (showHidden: boolean) => void;
    moduleDrilldownData: { category: string, textToShow: string, changesBreakdown: ChangesBreakdown }[];
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
    moduleDrilldownData,
    showUnknown,
    resourceId,
    showUnchanged,
    title,
    subtitle,
    closeSidebar,

}: SidebarProps) => {

    const formatActionText = (action: string) => {
        switch (action) {
            case "create":
                return "Created"
            case "update":
                return "Updated"
            case "delete":
                return "Deleted"
            case "unchanged":
                return "Unchanged"
            default:
                return ""
        }
    }

    const moduleChanges = () => {
        const moduleChanges: ChangesBreakdown = {
            create: 0,
            update: 0,
            delete: 0,
            unchanged: 0,
        }
        moduleDrilldownData.map((moduleChange) => moduleChange.changesBreakdown)
            .forEach((changesBreakdown) => {
                moduleChanges.create += changesBreakdown.create
                moduleChanges.update += changesBreakdown.update
                moduleChanges.delete += changesBreakdown.delete
                moduleChanges.unchanged += changesBreakdown.unchanged
            })
        return (
            <div className="flex items-center">
                {
                    Object.entries(moduleChanges).map(([action, number]) => (
                        <>
                            <ChangesBadge key={"module-change-" + action} action={action} number={number} />
                            <div className=" text-sm mr-4">
                                {formatActionText(action)}
                            </div>
                        </>
                    ))
                }
            </div>
        )
    }

    return (
        <Drawer
            anchor={"right"}
            variant="persistent"
            open={true}
            sx={{
                "& .MuiPaper-root": {
                    backgroundColor: "#F7F7F8",
                    borderLeft: "1px solid",
                    zIndex: 2001
                },
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
                {title &&
                    <div className={"mb-1 max-w-full text-2xl truncate"}>
                        {title}
                    </div>
                }
                {subtitle &&
                    <div className="max-w-full text-xs truncate text-[#666666]">
                        {subtitle}
                    </div>
                }
                {
                    moduleDrilldownData.length > 0 &&
                    moduleChanges()
                }
                <div className="w-[28rem] my-4 h-[1px] bg-[#B2AEB6]" />
            </div>
            <div
                className="overflow-hidden h-full flex flex-col px-4"
                style={{
                    width: width + "rem",
                }}>
                {moduleDrilldownData.length > 0 ?
                    <ModuleDrilldown
                        moduleDrilldownData={moduleDrilldownData}
                        handleShowUnknownChange={handleShowUnknownChange}
                        handleShowUnchangedChange={handleShowUnchangedChange}
                        showUnknown={showUnknown}
                        showUnchanged={showUnchanged}
                    /> :
                    <ResourceDrilldown
                        showUnchanged={showUnchanged}
                        showUnknown={showUnknown}
                        text={text}
                        resourceId={resourceId}
                        handleShowUnknownChange={handleShowUnknownChange}
                        handleShowUnchangedChange={handleShowUnchangedChange}
                    />
                }
            </div>

        </Drawer >
    )
}

export default Sidebar;