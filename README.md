# gulp-spsync-creds
Gulp plugin for synchronizing local files with a SharePoint library by using client credentials. This Gulp plugin is based on [gulp-spsync](gulp-spsync https://github.com/wictorwilen/gulp-spsync) which has been created by Wictor Wilen.

The gulp-spsync makes use of the SharePoint add-in model to upload the files to the library and only works for SharePoint Online. In this plugin all the calls are made via the client credentials (username and password). This approach works on both on-premises and online environments.