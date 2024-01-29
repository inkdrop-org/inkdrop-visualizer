import { Checkbox, Drawer, FormControlLabel, FormGroup, IconButton, Tooltip, Typography } from "@mui/material"
import "./Sidebar.css"
import CloseIcon from '@mui/icons-material/Close';

interface SidebarProps {
    width: number;
    text: string;
    handleShowUnknownChange: (showHidden: boolean) => void;
    closeSidebar: () => void;
    title: string
    subtitle: string
}
const Sidebar = ({ width, text, handleShowUnknownChange, title, subtitle, closeSidebar }: SidebarProps) => {
    return (
        <Drawer
            anchor={"right"}
            variant="persistent"
            open={true}
            sx={{
                "& .MuiPaper-root": {
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
                <div className="bg-[#302B35] text-white overflow-scroll h-full p-4 grow rounded text-xs"
                    style={{ fontFamily: '"Cascadia Code", sans-serif', }}
                    dangerouslySetInnerHTML={{ __html: text }}
                />
                <div className="w-[28rem] my-4 h-[1px] bg-[#B2AEB6]" />
                <div className="mb-6">
                    <FormGroup>
                        <FormControlLabel sx={{
                            margin: 0,
                            "& .MuiCheckbox-root": {
                                padding: 0,
                                paddingRight: "0.25rem",
                            }
                        }} onChange={(e, checked) => handleShowUnknownChange(checked)} control={<Checkbox />} label="Show unknown attributes" />
                    </FormGroup>
                </div>
            </div>
        </Drawer >
    )
}

export default Sidebar;