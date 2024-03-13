
export const getImgsWithData = () => {
    const inkdropDataLinks = document.querySelectorAll('a[href$="-inkdrop-ci-data.json"]');

    const imgLinks = Array.from(document.querySelectorAll('a[href$=".svg?raw=true"]'))
    const imgMap = imgLinks
        .map((imgLink) => {
            const imgComment = imgLink.closest(".js-timeline-item")
            const parent = imgComment?.parentElement
            const imgIndex = Array.from(parent?.children || []).indexOf(imgComment as Element)
            let closest = inkdropDataLinks[inkdropDataLinks.length - 1]
            Array.from(inkdropDataLinks).reverse().forEach((l) => {
                const inkdropDataComment = l.closest(".js-timeline-item")
                const index = Array.from(parent?.children || []).indexOf(inkdropDataComment as Element)
                if (index > imgIndex && index < Array.from(parent?.children || []).indexOf(closest as Element)) {
                    closest = l
                }
            })
            closest.closest(".js-timeline-item")!.setAttribute("style", "display: none")
            return {
                imgLink,
                inkdropDataLink: closest.getAttribute('href')
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
                const isNewComment = element.classList.contains("js-timeline-item")
                const isNewDiscussion = element.classList.contains("new-discussion-timeline")
                const isNewPRContainer = Array.from(element.children).some((c) => c.classList.contains("application-main"))
                // Refresh the image data if a new image is found
                if (isNewComment || isNewDiscussion || isNewPRContainer) {
                    newImgsWithData = getImgsWithData();
                }
            }
        });
    });
});

document.addEventListener('click', handleClick);

observer.observe(document, { childList: true, subtree: true });