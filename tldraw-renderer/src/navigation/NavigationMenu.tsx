import { List, ListItemButton, ListItemText, Menu, MenuItem } from "@mui/material";
import { useState } from "react";

interface NavigationMenuProps {
    subdirs: string[]
    selected: string
}

const NavigationMenu = ({
    subdirs,
    selected,
}: NavigationMenuProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(subdirs.indexOf(selected));

    const open = Boolean(anchorEl);

    const handleClickListItem = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (
        event: React.MouseEvent<HTMLElement>,
        index: number,
    ) => {
        setSelectedIndex(index);
        setAnchorEl(null);
        console.log(subdirs[index]);
        window.location.pathname = subdirs[index];
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <div>
            <List
                component="nav"
                aria-label="Device settings"
                sx={{
                    bgcolor: 'background.paper',
                    padding: 0,
                }}
            >
                <ListItemButton
                    id="lock-button"
                    aria-haspopup="listbox"
                    aria-controls="lock-menu"
                    aria-label="when device is locked"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClickListItem}
                    sx={{
                        borderRadius: "5px",
                        border: "1px solid black"
                    }}
                >
                    <ListItemText
                        primary={selected}
                    />
                </ListItemButton>
            </List>
            <Menu
                id="lock-menu"
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'lock-button',
                    role: 'listbox',
                }}
            >
                {subdirs.map((option, index) => (
                    <MenuItem
                        key={option}
                        selected={index === selectedIndex}
                        onClick={(event) => handleMenuItemClick(event, index)}
                    >
                        {option}
                    </MenuItem>
                ))}
            </Menu>
        </div>
    )
}

export default NavigationMenu;