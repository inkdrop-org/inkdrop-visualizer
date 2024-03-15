export default function background() {
}

let data: string


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "openNewTab") {
        chrome.tabs.create({ url: request.url, active: false }, (newTab) => {

            chrome.scripting.executeScript({
                target: { tabId: newTab.id! },
                files: ['js/inkdropCiDataReader.js']
            });
        });
    }

    if (request.action === "fileData") {
        chrome.tabs.remove(sender.tab!.id!);

        data = request.value;

        chrome.tabs.create({ url: chrome.runtime.getURL("tldraw-renderer/index.html") });
        sendResponse({ message: "OK" });

        return true;
    }

    if (request.action === "getRenderInput") {
        sendResponse({ data: JSON.parse(data) });
        return true;
    }

    return false;
});


background()