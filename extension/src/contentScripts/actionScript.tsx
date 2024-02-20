import React from "react";
import { createRoot } from "react-dom/client";
import InkdropDataReader from "./data-reader/InkdropDataReader";

const app = document.createElement("div");

app.id = "inkdrop-root";

const renderBody = () => {
    const body = document.body;
    if (body) {

        body.append(app);

        const container = document.getElementById("inkdrop-root") as HTMLElement;
        const root = createRoot(container!);

        root.render(
            <React.StrictMode>
                <InkdropDataReader />
            </React.StrictMode>
        );
    }
};

renderBody()