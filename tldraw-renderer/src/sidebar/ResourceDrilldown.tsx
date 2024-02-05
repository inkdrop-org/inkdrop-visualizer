import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";

interface ResourceDrilldownProps {
    text: string;
    handleShowUnknownChange: (showHidden: boolean) => void;
}

const ResourceDrilldown = ({
    text,
    handleShowUnknownChange,
}: ResourceDrilldownProps) => {
    return (
        <>
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
        </ >
    )
}

export default ResourceDrilldown;