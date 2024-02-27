import { Checkbox, FormControlLabel, FormGroup, Icon, IconButton } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface ResourceDrilldownProps {
    text: string;
    handleShowUnknownChange: (showHidden: boolean) => void;
    handleShowUnchangedChange: (showHidden: boolean) => void;
    showUnknown: boolean;
    resourceId: string;
    showUnchanged: boolean;
}

const ResourceDrilldown = ({
    text,
    handleShowUnknownChange,
    handleShowUnchangedChange,
    resourceId,
    showUnknown,
    showUnchanged
}: ResourceDrilldownProps) => {
    return (
        <>
            <div className="bg-[#302B35] text-white overflow-scroll h-full p-4 grow rounded text-xs"
                style={{ fontFamily: '"Cascadia Code", sans-serif', }}
                dangerouslySetInnerHTML={{ __html: text }}
            />
            <div className="w-[28rem] my-4 h-[1px] bg-[#B2AEB6]" />
            <div className="mb-6 flex">
                <div className="grow">
                    <FormGroup>
                        <FormControlLabel
                            checked={showUnknown}
                            sx={{
                                margin: 0,
                                "& .MuiCheckbox-root": {
                                    padding: 0,
                                    paddingRight: "0.25rem",
                                },
                                "& .MuiTypography-body1": {
                                    fontSize: "0.875rem"
                                }
                            }} onChange={(e, checked) => handleShowUnknownChange(checked)} control={<Checkbox />} label="Show unknown attributes" />
                        <FormControlLabel
                            checked={showUnchanged}
                            sx={{
                                margin: 0,
                                "& .MuiCheckbox-root": {
                                    padding: 0,
                                    paddingRight: "0.25rem",
                                },
                                "& .MuiTypography-body1": {
                                    fontSize: "0.875rem"
                                }
                            }} onChange={(e, checked) => handleShowUnchangedChange(checked)} control={<Checkbox />} label="Show unchanged attributes" />
                    </FormGroup>
                </div>
                {resourceId &&
                    <div className="w-[45%] flex text-right">
                        <div className="text-sm text-ellipsis overflow-hidden whitespace-nowrap">{"AWS ID: " + resourceId}</div>
                        <IconButton
                            sx={{
                                width: "25px",
                                height: "25px",
                            }}
                            size="small"
                            onClick={() => {
                                navigator.clipboard.writeText(resourceId);
                            }}
                        >
                            <ContentCopyIcon sx={{
                                width: "18px",
                                height: "18px"
                            }} />
                        </IconButton>
                    </div>
                }
            </div>
        </ >
    )
}

export default ResourceDrilldown;