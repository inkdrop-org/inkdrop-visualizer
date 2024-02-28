import { useEffect, useState } from "react";

const PullRequestReader = () => {

    const getImgsWithData = () => {
        const inkdropDataLinks = document.querySelectorAll('a[href$="-inkdrop-ci-data.json"]');

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
                let closest = inkdropDataLinks[0]
                Array.from(inkdropDataLinks).forEach((l) => {
                    // get the closest inkdrop data element above the img
                    const inkdropDataComment = l.closest(".js-timeline-item")
                    const index = Array.from(parent?.children || []).indexOf(inkdropDataComment as Element)
                    if (index < imgIndex && index > Array.from(parent?.children || []).indexOf(closest as Element)) {
                        closest = l
                    }
                })
                closest.closest(".js-timeline-item")!.setAttribute("style", "display: none")
                return {
                    img,
                    inkdropDataLink: closest.getAttribute('href')
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

                        // Refresh the image data if a new image is found
                        if (isNewComment) {
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

export default PullRequestReader;