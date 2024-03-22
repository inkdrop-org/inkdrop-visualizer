
export const getImgsWithData = () => {
    if (document.querySelector(".js-timeline-item") !== null) {
        return []
    }
    const imgLinks = Array.from(document.querySelectorAll('a[href$=".svg?raw=true"]'))
    const imgMap = imgLinks
        .map((imgLink) => {
            const dataUrl = imgLink.nextElementSibling?.children[0]?.getAttribute("href")
            if (dataUrl) {
                imgLink.nextElementSibling!.setAttribute("style", "display: none")
            }
            return {
                imgLink,
                inkdropDataLink: dataUrl
            }
        })

    return imgMap
}

let newImgsWithData = getImgsWithData();

const handleClick = (e: Event) => {
    const targetImg = newImgsWithData.find(({ imgLink }) => imgLink.querySelector("img") === e.target);
    if (targetImg) {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({
            action: "openNewTab",
            url: targetImg.inkdropDataLink
        });
    }
};

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                const newImage = element.querySelector('a[href$=".svg?raw=true"]')
                // Refresh the image data if a new image
                if (newImage) {
                    newImgsWithData = getImgsWithData();
                }
            }
        });
    });
});

document.addEventListener('click', handleClick, true);

observer.observe(document, { childList: true, subtree: true });