export const unique = (array: string[]) => {
    return array.filter(function (item, i, ar) { return ar.indexOf(item) === i; });
}