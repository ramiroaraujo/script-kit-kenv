export const assertValue = (value:any, message?:string) => {
    if (!value) {
        throw new Error(message || 'Value is undefined')
    }
    return value
}