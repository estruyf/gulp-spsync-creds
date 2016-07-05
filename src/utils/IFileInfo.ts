export interface IFileInfo {
    library: string,
    filename: string
}

export interface IFileDownload {
    name: string,
    path: string,
    contentUrl: string,
    content: Buffer,
    associated: boolean
}