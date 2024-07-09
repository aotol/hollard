<script type="text/javascript">
//<![CDATA[

if (window.addEventListener) {
  window.addEventListener('message', function (e) {
  njsPopulateData(JSON.parse(e.data));
    //e.source.postMessage('Hello ' + e.origin);
  }); 
} 
else { // IE8 or earlier 
  window.attachEvent('onmessage', function (e) { 
  njsPopulateData(JSON.parse(e.data));
    //alert(e.data);
  });
}

/*
'{
"formName" : {
"input1" : "value1"
}
"buttonOrLinkName" : "clickMe"
}'
*/

if (!Object.keys) {
  Object.keys = function(obj) {
    var keys = [];

    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        keys.push(i);
      }
    }

    return keys;
  };
}

function njsPopulateData(data){
try { 

var attributes = Object.keys(data);

if(attributes != null && attributes.length > 1)
{

var formName = attributes[0];
var clickable = attributes[1];

var formJSON = data[formName];
var formAttributes = Object.keys(formJSON);

var form = document.getElementsByName(formName)[0];

if(form !== 'undefined')
{
if(formAttributes.length > 0){
for(var i in formAttributes)
{
if(form.elements.length > 0){
var input = form.elements[formAttributes[i]];
if(typeof input !== 'function' && input != null && input !== 'undefined'){
igFillControl(formAttributes[i], formJSON[formAttributes[i]]);
}
}
}
}
//form.submit();
}
}

var found = findAndClick(clickable, data[clickable]);

if(clickable == 'reloadIFrame'){
	self.location.href = self.location.href;
	return;
}

if(clickable == 'Clear all' && !found){
	return;
}

if(clickable == 'Exit policy' && !found){
	return;
}


if(clickable == 'Apply' && !found){
	return;
//found = findAndClick('Personal inbox', 'a');
}

if(!found){
	alert('Unfortunately we have run into an error. The Policy may be locked or you may not have access to view this section of Insurer. Please try again');
}

} catch(e){
console.log(e);
//debugger;
  }
}

function findAndClick(clickable, type){

var found = false;

if(type == 'buttonId'){
var button = document.getElementById(clickable);
if(button != null){
button.click();
found = true;
}
}

var elements = new Array();

if(type == 'button')
elements = document.getElementsByClassName('iginputbutton');

if (type == 'a')
elements = document.getElementsByTagName('a');

if(elements.length > 0){
for(var i in elements){
var tmp = elements[i];
if(	typeof tmp !== 'function' && tmp.innerText != null && tmp.innerText !== 'undefined' &&
tmp.innerText.toLowerCase().trim() == clickable.toLowerCase()){
tmp.click();
found = true;
}
}
}

return found;

if(clickable == 'Clear all' && !buttonFound){
return;
}

if(clickable == 'Apply' && !buttonFound){
clickable = 'Personal inbox';
elements = document.getElementsByTagName('a');
}

if(elements.length > 0){
for(var i in elements){
var tmp = elements[i];
if(	typeof tmp !== 'function' && tmp.innerText != null && tmp.innerText !== 'undefined' &&
tmp.innerText.toLowerCase().trim() == clickable.toLowerCase()){
tmp.click();
found = true;
}
}
}

}

//]]></script>