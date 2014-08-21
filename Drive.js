/**
 * Loads files from Google Drive with ease
 *
 * @author hermanbergwerf
 */

function getDriveFile(fileId, callback)//read file metadata from Google Drive
{
    var request = gapi.client.drive.files.get({
        'fileId': fileId
    });
    request.execute(callback);
};

function findDriveFile(fileTitle, callback, notfoundcb)//find file on Google Drive
{
    var request = gapi.client.drive.files.list({
        'maxResults': 1,
        'q': 'title="' + fileTitle + '"'
    });
    request.execute(function(result)
    {
        if(!result.items) notfoundcb();
        else if(result.items[0].id) getDriveFile(result.items[0].id, callback);
    });
};

function readDriveFile(file, callback, progress)//download data from Google Drive
{
    if(file.downloadUrl)
    {
        var accessToken = gapi.auth.getToken().access_token;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', file.downloadUrl);
        xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        xhr.onload = function()
        {
            callback(xhr.responseText);
        };
        xhr.onprogress = function(e)
        {
            progress(e);
        };
        xhr.onerror = null;
        xhr.send();
    }
};

function findDriveFileContent(fileTitle, callback, notfoundcb)//combines findDriveFile and readDriveFile
{
    console.log('findDriveFileContent: ' + fileTitle);
    findDriveFile(fileTitle, function(file)
    {
        readDriveFile(file, callback);
    }, notfoundcb);
};