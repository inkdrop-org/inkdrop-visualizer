import { Accordion, AccordionDetails, AccordionSummary, Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { ChangesBreakdown } from "../jsonPlanManager/jsonPlanManager";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChangesBadge from "./ChangesBadge";

interface ModuleDrilldownProps {
    moduleDrilldownData: { category: string, textToShow: string, changesBreakdown: ChangesBreakdown }[];
    handleShowUnknownChange: (showHidden: boolean) => void;
    handleShowUnchangedChange: (showHidden: boolean) => void;
    showUnknown: boolean;
    showUnchanged: boolean;
}

const ModuleDrilldown = ({
    moduleDrilldownData,
    handleShowUnknownChange,
    handleShowUnchangedChange,
    showUnknown,
    showUnchanged
}: ModuleDrilldownProps) => {
    return (
        <>
            <div className="bg-[#302B35] p-5 text-white overflow-scroll h-full grow rounded text-xs">
                {moduleDrilldownData.sort((a, b) => {
                    const arg1 = a.category === "Other" ? "Z" : a.category
                    const arg2 = b.category === "Other" ? "Z" : b.category
                    return arg1.localeCompare(arg2)
                }).map((data, index) => {
                    return (
                        <Accordion key={index} disableGutters sx={{
                            "&.MuiPaper-root": {
                                backgroundColor: "transparent",
                                boxShadow: "none",
                                border: "none",
                            }
                        }}>
                            <AccordionSummary
                                sx={{
                                    borderBottom: "1px solid white",
                                    padding: "0",
                                }}
                                expandIcon={<ExpandMoreIcon sx={{
                                    color: "white"
                                }} />}>
                                <div className="flex items-center">
                                    <div className="text-base text-white truncate max-w-[250px]">{data.category}</div>
                                    <div className="flex ml-3">
                                        {
                                            Object.entries(data.changesBreakdown).map(([action, number]) => (
                                                <ChangesBadge key={index + "-" + action} action={action} number={number} />
                                            ))
                                        }
                                    </div>
                                </div>
                            </AccordionSummary>
                            <AccordionDetails
                                sx={{
                                    borderBottom: "1px solid white",
                                }}
                            >
                                <div className="bg-[#302B35] text-white overflow-y-scroll overflow-x-hidden h-full p-4 grow rounded text-xs max-h-[50vh]"
                                    style={{ fontFamily: '"Cascadia Code", sans-serif', scrollbarWidth: "none" }}
                                    dangerouslySetInnerHTML={{ __html: data.textToShow }}
                                />
                            </AccordionDetails>
                        </Accordion>
                    )
                })}
            </div>
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
            </div>
        </ >
    )
}

export default ModuleDrilldown;