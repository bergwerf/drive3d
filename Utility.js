String.prototype.startsWith = function(str)
{
    return this.indexOf(str) === 0;
};

String.prototype.endsWith = function(str)
{
    return this.indexOf(str, this.length - str.length) !== -1;
};

function getParameterByName(name)//read query
{
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null) return "";
    else return decodeURIComponent(results[1].replace(/\+/g, " "));
};

function getFileExtension(file)
{
    return file.substr(file.lastIndexOf('.') + 1).toUpperCase();
}