import { Checkbox, Drawer, FormControlLabel, FormGroup } from "@mui/material"
import "./Sidebar.css"

interface SidebarProps {
    width: number;
    text: string;
    handleShowUnknownChange: (showHidden: boolean) => void;
}
const Sidebar = ({ width, text, handleShowUnknownChange }: SidebarProps) => {
    return (
        <Drawer
            anchor={"right"}
            variant="persistent"
            open={true}
        >
            <div
                className="overflow-hidden h-full flex flex-col"

                style={{
                    width: width + "rem",
                    padding: "1rem",
                }}>
                <div className="bg-slate-900 text-white overflow-scroll h-full p-2 grow"
                    style={{ fontFamily: '"Cascadia Code", sans-serif', }}
                    dangerouslySetInnerHTML={{ __html: text }}
                />
                <div className=" mb-5 mt-3">
                    <FormGroup>
                        <FormControlLabel onChange={(e, checked) => handleShowUnknownChange(checked)} control={<Checkbox />} label="Show unknown attributes" />
                    </FormGroup>
                </div>
            </div>
        </Drawer >
    )
}

export default Sidebar;