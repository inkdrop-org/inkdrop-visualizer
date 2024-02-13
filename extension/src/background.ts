export default function background() {
    chrome.tabs.create({ url: chrome.runtime.getURL("tldraw-renderer/index.html") });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getData") {
        const data = {
            message: "Current state",
            state: "state",
        };
        sendResponse({ data })

        return true;
    }

    return false;
});


background()