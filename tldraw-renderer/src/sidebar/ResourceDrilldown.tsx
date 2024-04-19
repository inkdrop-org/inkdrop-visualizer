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
            <div className="bg-[#302B35] text-white overflow-y-scroll overflow-x-hidden break-words h-full p-4 grow rounded text-[0.7rem]"
                style={{ fontFamily: '"Cascadia Code", sans-serif', lineHeight: "1rem" }}
                dangerouslySetInnerHTML={{ __html: text }}
            />
            <div className="w-[21.5rem] mt-2 h-[1px] bg-[#B2AEB6]" />
            <div className="flex" style={{ display: 'flex', alignItems: 'center', height: '2.4rem' }}>
                <div className="grow" style={{ display: 'flex', alignItems: 'center' }}>
                    <FormGroup>
                        <FormControlLabel
                            checked={showAll}
                            sx={{
                                height: "2.4rem",
                                margin: 0,
                                "& .MuiCheckbox-root": {
                                    padding: 0,
                                    paddingRight: "0.25rem",
                                },
                                "& .MuiTypography-body1": {
                                    fontSize: "0.875rem"
                                },
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onChange={(e, checked) => handleShowAllChange(checked)}
                            control={<Checkbox />}
                            label="Show all attributes"
                        />
                    </FormGroup>
                </div>
                {resourceId &&
                    <div className="flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Typography sx={{ fontSize: '0.875rem', lineHeight: '2.4rem' }}>
                            {'Copy AWS ID'}
                        </Typography>
                        <Tooltip title={justCopied ? 'Copied!' : 'Copy'}
                            onClose={() => setTimeout(() => setJustCopied(false), 500)}
                            placement="top">
                            <IconButton
                                sx={{
                                    width: '25px',
                                    height: '25px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                size="small"
                                onClick={() => {
                                    setJustCopied(true);
                                    navigator.clipboard.writeText(resourceId);
                                }}
                            >
                                <ContentCopyIcon sx={{ width: '18px', height: '18px' }} />
                            </IconButton>
                        </Tooltip>
                    </div>
                }
            </div>
        </ >
    )
}

export default ResourceDrilldown;