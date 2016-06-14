import File = require('vinyl');

export interface ISettings {
    username: string,
    password: string,
    site: string,
    startFolder: string,
    verbose: boolean,
    update_metadata: boolean,
    cache: boolean,
    publish: boolean,
    files_metadata: any,
    file: File,
    content: Buffer
}