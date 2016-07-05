import File = require('vinyl');
import * as moment from 'moment';

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
    content: Buffer,
    associatedHtml: boolean
}

export interface IDigest {
    digest: string,
    retrieved: moment.Moment
}