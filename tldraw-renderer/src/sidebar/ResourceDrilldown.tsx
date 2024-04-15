import { Checkbox, FormControlLabel, FormGroup, Icon, IconButton, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState } from "react";

interface ResourceDrilldownProps {
    text: string;
    handleShowAllChange: (showHidden: boolean) => void;
    showAll: boolean;
    resourceId: string;
}

const ResourceDrilldown = ({
    text,
    handleShowAllChange,
    resourceId,
    showAll,
}: ResourceDrilldownProps) => {

    const [justCopied, setJustCopied] = useState(false);
    return (
        <>
            <div className="bg-[#302B35] text-white overflow-scroll h-full p-4 grow rounded text-[0.7rem]"
                style={{ fontFamily: '"Cascadia Code", sans-serif', lineHeight: "1rem" }}
                dangerouslySetInnerHTML={{ __html: text }}
            />
            <div className="w-[22rem] my-4 h-[1px] bg-[#B2AEB6]" />
            <div className="mb-4 flex">
                <div className="grow">
                    <FormGroup>
                        <FormControlLabel
                            checked={showAll}
                            sx={{
                                margin: 0,
                                "& .MuiCheckbox-root": {
                                    padding: 0,
                                    paddingRight: "0.25rem",
                                },
                                "& .MuiTypography-body1": {
                                    fontSize: "0.875rem"
                                }
                            }} onChange={(e, checked) => handleShowAllChange(checked)} control={<Checkbox />} label="Show all attributes" />
                    </FormGroup>
                </div>
                {resourceId &&
                    <div className="flex text-right">
                        <Typography sx={{ fontSize: "0.875rem" }}>{"Copy AWS ID"}</Typography>
                        <Tooltip title={justCopied ? "Copied!" : "Copy"}
                            onClose={() => setTimeout(() => setJustCopied(false), 500)}
                            placement="top">
                            <IconButton
                                sx={{
                                    width: "25px",
                                    height: "25px",
                                }}
                                size="small"
                                onClick={() => {
                                    setJustCopied(true);
                                    navigator.clipboard.writeText(resourceId);
                                }}
                            >
                                <ContentCopyIcon sx={{
                                    width: "18px",
                                    height: "18px"
                                }} />
                            </IconButton>
                        </Tooltip>
                    </div>
                }
            </div>
        </ >
    )
}

export default ResourceDrilldown;