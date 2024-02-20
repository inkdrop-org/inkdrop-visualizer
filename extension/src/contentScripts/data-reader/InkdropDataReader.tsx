import { useEffect, useState } from "react";

const InkdropDataReader = () => {

    const getImgsWithData = () => {
        const clipboardCopyElements = document.querySelectorAll('clipboard-copy');
        return Array.from(document.querySelectorAll('img'))
            .filter((img) => {
                const alt = img.getAttribute('alt');
                if (alt && alt === "Inkdrop Diagram SVG") {
                    return true
                }
                return false;
            })
            .map((img) => {

                const imgComment = img.closest(".js-timeline-item")
                const parent = imgComment?.parentElement
                const imgIndex = Array.from(parent?.children || []).indexOf(imgComment as Element)
                let closest = clipboardCopyElements[0]
                Array.from(clipboardCopyElements).forEach((c) => {
                    // get the closest clipboard-copy element above the img
                    const clipboardCopyComment = c.closest(".js-timeline-item")
                    const index = Array.from(parent?.children || []).indexOf(clipboardCopyComment as Element)
                    if (index < imgIndex && index > Array.from(parent?.children || []).indexOf(closest as Element)) {
                        closest = c
                    }
                })
                closest.closest(".js-timeline-item")!.setAttribute("style", "display: none")
                return {
                    img,
                    inkdropData: closest.getAttribute('value')
                }
            })
    }

    useEffect(() => {
        let newImgsWithData = getImgsWithData();

        const handleClick = (e: Event) => {
            const targetImg = newImgsWithData.find(({ img }) => img === e.target);
            if (targetImg) {
                e.stopPropagation();
                e.preventDefault();
                // Send message to background script
                chrome.runtime.sendMessage({
                    action: "imgClicked",
                    inkdropData: targetImg.inkdropData
                });
            }
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        const isInterestedImage = element.nodeName === "IMG" && element.getAttribute('alt') === "Inkdrop Diagram SVG";

                        // Refresh the image data if a new image is found
                        if (isInterestedImage) {
                            newImgsWithData = getImgsWithData();
                        }
                    }
                });
            });
        });

        document.addEventListener('click', handleClick);

        observer.observe(document.body, { childList: true, subtree: true });

        // Cleanup
        return () => {
            document.removeEventListener('click', handleClick);
            observer.disconnect();
        };
    }, []);

    return null
}

export default InkdropDataReader;