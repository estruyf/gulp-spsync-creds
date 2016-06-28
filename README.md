# gulp-spsync-creds
> Gulp plugin for synchronizing local files with a SharePoint library

[![NPM](https://nodei.co/npm/gulp-spsync-creds.png?compact=true)](https://nodei.co/npm/gulp-spsync-creds/)

This Gulp plugin is based on [gulp-spsync](https://github.com/wictorwilen/gulp-spsync) which has been created by Wictor Wilen. The difference with gulp-spsync is that this plugin makes use for client credentials (username and password) in order to upload or download files. This makes the plugin usable for both SharePoint Online and on-premises.

## Installation
Run the following command to install the gulp-spsync-creds plugin:

```
$ npm install gulp-spsync-creds
```

## Usage
### Uploading files
For uploading files, you can add the following code to your `gulpfile.js`:

```javascript
var gulp = require('gulp');
var spsync = require('gulp-spsync-creds').sync;

gulp.src('./src/**/*')
.pipe(spsync({
    "username": "<username>",
    "password": "<password>",
    "site": "<site-url>",
}));
```

### Downloading files
For downloading files, you can add the following code to your `gulpfile.js`:

```javascript
var gulp = require('gulp');
var spdwn = require('gulp-spsync-creds').download;

spdwn({
    "site": "<username>",
    "username": "<password>",
    "password": "<site-url>",
    "startFolder": "<relative-folder-location>"
}).pipe(gulp.dest("src"));
```

*Information: it currently retrieves all files of the given path and the ones of three folders deep.*

## Options
The plugin has the following options that can be configured:

### username
Type: `String`
Default: `null`

Sets the username to be used for the sync action.

### password
Type: `String`
Default: `null`

Sets the password to be used for the sync action.

### site
Type: `String`
Default: `""`

Sets the site URL to where the files should be uploaded.

### startFolder
Type: `String`
Default: `""`

Choose the name of the folder location it has to starts from. This is useful when you have a nested folder structure. Example: 
if your folder structure is like this `src/template1/_sp/_catalogs`, and you set the *startFolder* option to `_sp`, it will strip out all the folder names before including `_sp`. You end up with `_catalogs`.

**Important**: this property can also be used to specify the location from where you want to download files.

### update_metadata
Type: `Boolean`
Default: `false`

Specify if you want to update the metadata of files you are uploading. If this is set to `true`, you will have to pass the file metadata via the `files_metadata` option.

### files_metadata
Type: `Object`
Default: `[]`

With the files_metadata option you can specify the metadata of all the files you wish to upload. Example:

```json
"fileMetadata": [
    {
        "name": "Item_Minimal.js",
        "metadata": {
        "__metadata": {
            "type": "SP.Data.OData__x005f_catalogs_x002f_masterpageItem"
        },
        "Title": "Item Minimal Template (via GULP)",
        "MasterPageDescription": "This is a display template added via gulp.",
        "ManagedPropertyMapping": "'Path','Title':'Title'",
        "ContentTypeId": "0x0101002039C03B61C64EC4A04F5361F38510660500A0383064C59087438E649B7323C95AF6",
        "DisplayTemplateLevel": "Item",
        "TargetControlType": {
            "__metadata": {
            "type": "Collection(Edm.String)"
            },
            "results": [
            "SearchResults",
            "Content Web Parts"
            ]
        }
        }
    },
    {
        "name": "Control_Minimal.js",
        "metadata": {
        "__metadata": {
            "type": "SP.Data.OData__x005f_catalogs_x002f_masterpageItem"
        },
        "Title": "Control Minimal Template (via GULP)",
        "MasterPageDescription": "This is a display template added via gulp.",
        "ContentTypeId": "0x0101002039C03B61C64EC4A04F5361F38510660500A0383064C59087438E649B7323C95AF6",
        "DisplayTemplateLevel": "Control",
        "TargetControlType": {
            "__metadata": {
            "type": "Collection(Edm.String)"
            },
            "results": [
            "SearchResults",
            "Content Web Parts"
            ]
        }
        }
    }
]
```

### Publish
Type: `Boolean`
Default: `false`

With this option you can specify if you want to publish files after they are uploaded.

### Cache
Type: `Boolean`
Default: `false`

If set to true the plugin caches library locations that already have been processed. Makes the watch tasks quicker.

### Verbose
Type: `Boolean`
Default: `false`

If you wish to see all the plugin logging you can set this to true.