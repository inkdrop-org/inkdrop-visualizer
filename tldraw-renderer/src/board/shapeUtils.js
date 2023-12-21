"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateText = void 0;
const truncateText = (textElement, maxWidth) => {
    const xmlns = 'http://www.w3.org/2000/svg';
    // Add temporary SVG to measure text width
    const svg = document.createElementNS(xmlns, 'svg');
    document.body.appendChild(svg);
    svg.appendChild(textElement);
    // Retrieve text width
    let textLength = textElement.getComputedTextLength();
    // Check if the text width is wider than the allowed maximum
    while (textLength > maxWidth && textElement.textContent.length > 0) {
        // Remove the last character and add an ellipsis
        textElement.textContent = textElement.textContent.slice(0, -4) + '...';
        // Recalculate the text width
        textLength = textElement.getComputedTextLength();
    }
    // Clean up: remove the temporary SVG
    document.body.removeChild(svg);
    return textElement;
};
exports.truncateText = truncateText;
