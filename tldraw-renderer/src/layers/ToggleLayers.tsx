import { Accordion, AccordionDetails, AccordionSummary, Checkbox, FormControlLabel, FormGroup } from "@mui/material"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type FilterCheckBox = {
    name: string,
    value: boolean,
    action: () => void
}

type SubToggleList = {
    name: string,
    items: FilterCheckBox[]
}

interface ToggleLayersProps {
    items: (FilterCheckBox | SubToggleList)[]
}

const ToggleLayers = ({ items }: ToggleLayersProps) => {
    return (
        <Accordion
            disableGutters
            sx={{
                "&.MuiPaper-root": {
                    backgroundColor: "transparent",
                    boxShadow: "none",
                },
            }
            }
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1-content"
                id="panel1-header"
                sx={{
                    flexDirection: "row-reverse",
                    backgroundColor: "white",
                    borderRadius: "5px",
                    border: "1px solid black"
                }}
            >
                Show Layers
            </AccordionSummary>
            <AccordionDetails sx={{
                backgroundColor: "white",
                borderRadius: "5px",
                marginTop: "10px",
                border: "1px solid black",
                maxHeight: "65vh",
                overflowY: "scroll"
            }}>
                <FormGroup>
                    {
                        items.map((item, index) => (
                            item.hasOwnProperty('items') ?
                                <>
                                    <Accordion
                                        disableGutters
                                        sx={{

                                            "&.MuiAccordion-root:before": {
                                                backgroundColor: "transparent"
                                            },

                                            "&.MuiPaper-root": {
                                                backgroundColor: "transparent",
                                                boxShadow: "none",
                                                border: "none"
                                            },
                                            borderBottom: index !== items.length - 1 ? "1px solid #B3AEB6" :
                                                "none"
                                        }
                                        }>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="panel1-content"
                                            id="panel1-header"
                                            sx={{ flexDirection: "row-reverse" }}
                                        >
                                            {item.name}
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <FormGroup style={{ width: "250px" }}>
                                                {
                                                    (item as SubToggleList).items.map((item) => (
                                                        <>
                                                            <FormControlLabel
                                                                key={item.name}
                                                                control={
                                                                    <Checkbox
                                                                        checked={item.value}
                                                                        onChange={item.action}
                                                                        defaultChecked={item.value}
                                                                        inputProps={{ 'aria-label': 'controlled' }}
                                                                    />
                                                                }
                                                                label={item.name}
                                                            />

                                                        </>
                                                    ))
                                                }
                                            </FormGroup>
                                        </AccordionDetails>
                                    </Accordion>
                                    {
                                        index !== items.length - 1 &&
                                        <div style={{
                                            width: "100%",
                                            height: "1px",
                                            backgroundColor: "#B3AEB6",
                                        }} />
                                    }
                                </>
                                :
                                <>
                                    <FormControlLabel
                                        key={item.name}
                                        control={
                                            <Checkbox
                                                checked={(item as FilterCheckBox).value}
                                                onChange={(item as FilterCheckBox).action}
                                                defaultChecked={(item as FilterCheckBox).value}
                                                inputProps={{ 'aria-label': 'controlled' }}
                                            />
                                        }
                                        label={(item as FilterCheckBox).name}
                                    />
                                    {
                                        index !== items.length - 1 &&
                                        <div style={{
                                            width: "100%",
                                            height: "1px",
                                            backgroundColor: "#B3AEB6",
                                        }} />
                                    }
                                </>
                        ))
                    }
                </FormGroup>
            </AccordionDetails>
        </Accordion>
    )
}

export default ToggleLayers