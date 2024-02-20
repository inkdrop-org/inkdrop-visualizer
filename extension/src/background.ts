export default function background() {
}

let data: string

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "imgClicked") {

        data = request.inkdropData

        chrome.tabs.create({ url: chrome.runtime.getURL("tldraw-renderer/index.html") });
        sendResponse({ message: "OK" });

        return true;
    }

    if (request.action === "getData") {
        sendResponse({ data: JSON.parse(data) });
        return true;
    }

    return false;
});


background()