import { waitForElement } from "../utils/waitForElement";

export const getValueString = async () => {
    const textArea = await waitForElement("textarea[aria-label='file content']") as HTMLTextAreaElement;
    const value = textArea.value;
    chrome.runtime.sendMessage({ action: "fileData", value: value });
}

getValueString()