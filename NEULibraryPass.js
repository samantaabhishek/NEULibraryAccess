var ezproxyWebpage = "http://ezproxy.neu.edu/menu"; // Webpage to determine set of ezproxy supported webpages
var iplookup = "http://ip-lookup.net/"; // website used to determine type of network
var optionKey = "ezproxy.neu.edu"; // key used to save options in local storage
var proxy = "ezproxy.neu.edu"; // extension appended at the end of url to get it redirected through ezproxy
var placeHolder = "ezproxy"; // value used to save the webpages supported in local storage
var freqDBupdate = (5*24*60*60*1000); // Frequency of update set of supported webpages
var retryDBupdate = 24*60*60*1000; // Frequency of update set of supported webpages after initial failing
var freqNetCheck = (5*60*1000); // Frequency to check network host
var retryNetCheck = 2*60*1000; // Frequency to check network host if an error happen during intial check

chrome.pageAction.onClicked.addListener(function(tab){updateTab(tab)});

//Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	if (changeInfo.status == "loading") {
		takeAction(tab)}});

/**
 * changeURL: Tab -> 
 * Creates a new link in at ezproxy supported webpages to login with
 *  NEU credentials
 */
function updateTab (tab){
	var tabURL = tab.url;
	var wordsURL = tabURL.split('/');
	var hostname = wordsURL[2];
	var newURL = modifyURL(tabURL);
	chrome.storage.local.get(hostname, function(result) {
		if (result[hostname] == placeHolder) {
			chrome.tabs.update(tab.id, {url: newURL});  
		}});          
}
/**
 * modifyURL : string -> string
 * Given a URL changes the URL to get it redirected through ezproxy
 */
function modifyURL(url) {
	var wordsURL = url.split('/');
	var protocol = wordsURL[0];
	var hostname = wordsURL[2];
	var newURL = protocol + "//" + hostname + "." + proxy;
	for (var i = 3; i < wordsURL.length; i++) {
		newURL += "/" + wordsURL[i];
	}
	return newURL;
}

/**
 * takeAction: Tab ->
 * Checks for different options saved in the local storage. The options are
 *  saved in "semicolon" format. Let us consider option = p1;p2;p3;p4;p5. Action
 *  is taken following below mentioned rules,
 *   - p1 = 1; interp: the new urls open through ezproxy directly if possible
 *        = 2; interp: show tab option icon if the url is possible to be opened
 *                      through ezproxy
 *   - p2 = in;  interp: use ezproxy only when computer is on non-NEU network
 *        = out; interp: use ezproxy irrespective of the network
 *   - p3 = Date; interp; next time when network type is checked
 *   - p4 = "t"; interp; This computer was connected to NEU network when checked
 *                        last time
 *        = "f"; interp: This computer was not connected to a NEU network when
 *                        checked last time
 *   - p5 = Date; interp: Next time when the set of webpages supported by
 *                         ezproxy is updated  
 */
function takeAction(tab){
	chrome.storage.local.get(optionKey, function (result) {
		var d = new Date();
		var optionArr = {};
		var option = result[optionKey];
		if (typeof option === 'undefined') { // new installation
			optionArr[0] = "2";
			optionArr[1] = "out";
			optionArr[2] = 0;
			optionArr[3] = "f";
			optionArr[4] = 0;
		}
		else {
			var options = option.toString().split(";");
			if (options.length <= 1) { // Backward compatibility
				optionArr[0] = "2";
				optionArr[1] = "out";
				optionArr[2] = 0;
				optionArr[3] = "f";
				optionArr[4] = 0;
			}
			else {
				optionArr[0] = options[0];
				optionArr[1] = options[1];
				optionArr[2] = parseInt(options[2]);
				optionArr[3] = options[3];
				optionArr[4] = parseInt(options[4]);
			}
		}
		if (optionArr[4] >= d.getTime()) {
			controller(tab, optionArr);			
		}
		else {
			pollDB(tab, optionArr);
		}
	});	
}
/**
 * pollDB: Tab Array ->
 *  Polls DB at "http://ezproxy.neu.edu/menu" to get the updated set of
 *  web-sites supported by ezproxy
 */ 
function pollDB(tab, optionArr) {
	sendRequest(ezproxyWebpage, function (responseText) {
		var dataObj = {};
		var d = new Date();
		if (responseText == "") { // problem with http connection
			d.setTime(d.getTime() + retryDBupdate);
		}
		else {
			var tempDiv = document.createElement('div');
			tempDiv.innerHTML = responseText.replace(/<script(.|\s)*?\/script>/g, '');
			tempDiv.style.display = "none";
			document.body.appendChild(tempDiv);
			// tempDiv now has a DOM structure:
			var hostList = []; // Empty host list
			var link;
			var splittedLink, hostName;
			var links = document.getElementsByTagName("a");
			for (var i = 0; i < links.length; i++) {
				splittedLink = links[i].href.split("="); 
				if (splittedLink.length > 1) {
					hostName = splittedLink[1].split("/");
					if (hostName.length > 2) {
						hostList.push(hostName[2]);
					}
				}
			}
			for (var i = 0; i < hostList.length; i++) {
				dataObj[hostList[i]] = placeHolder;
			}
			dataObj["dl.acm.org"] = placeHolder;
			dataObj["www.apimages.com"] = placeHolder;
			tempDiv.parentNode.removeChild(tempDiv);
			d.setTime(d.getTime() + freqDBupdate);
		} 
		dataObj[optionKey] = optionArr[0] + ";" + optionArr[1] + ";" + optionArr[2] + ";" +
		optionArr[3] + ";" + d.getTime();
		chrome.storage.local.set(dataObj);
		controller(tab, optionArr);		
	}); 
}
/**
 * sendRequest: String Function ->
 * Sending HTTP request to the given url
 */
function sendRequest(url, callback) {
	var xhr = new XMLHttpRequest();//
	xhr.onreadystatechange 			= function () {
		if (xhr.readyState == 4) {
			callback(xhr.responseText);
		}
	};
	xhr.open("GET", url, true);
	xhr.send();
}

/**
 * controller: Number Tab Array ->
 * Decides on what to do depending on the given options and the network
 *  this computer is connected to 
 */
function controller(tab, optionArr) {
	if (optionArr[1] == "in") {
		var d = new Date();
		if (d.getTime() >= optionArr[2]) {
			checkNetwork(tab, optionArr);
		}
		else {
			if (optionArr[3] == "f") {
				controllerHelper(tab, optionArr[0]);
			}
		}
	}
	else {
		controllerHelper(tab, optionArr[0]);	
	}
}

/**
 * checkNetwork: Tab Array ->
 * Checks if the current network is a NEU network
 */
function checkNetwork(tab, optionArr) {
	sendRequest(iplookup, function (responseText) {
		var d = new Date();
		var dataObj = {};
		if (responseText == "") { // Problem with http connection
			d.setTime(d.getTime() + retryNetCheck); // 2mins
			dataObj[optionKey] = optionArr[0] + ";" + optionArr[1] + ";" + d.getTime() + 
			";" + optionArr[3] + ";" + optionArr[4]; 
		}
		else {
			var tempDiv = document.createElement('div');
			tempDiv.innerHTML = responseText.replace(/<script(.|\s)*?\/script>/g, '');
			tempDiv.style.display="none";
			document.body.appendChild(tempDiv);
			// tempDiv now has a DOM structure:
			var container = document.getElementById("container");
			var content;
			var children = container.childNodes;
			var attrs = {};
			for (var i = 0; i < children.length; i++) {
				if (children[i].nodeType == 1) { // Element
					if (children[i].hasAttributes()) {
						attrs = children[i].attributes;
						if (attrs.getNamedItem("class") != null) {
							if (attrs.getNamedItem("class").value == "content") {
								content = children[i];
								break;
							}
						}
					}			
				}
			}
			var table = content.getElementsByTagName("Table")[0];
			var tableBody = table.getElementsByTagName("tbody")[0];
			var tableRow = tableBody.getElementsByTagName("tr")[3];
			var tableData = tableRow.getElementsByTagName("td")[1];
			var dataLink = tableData.getElementsByTagName("a");
			var host = "";
			for (var i = 0; i < dataLink.length; i++) {
				host += dataLink[i].innerText;
			}			
			var hostParts = host.split(".");
			d.setTime(d.getTime() + freqNetCheck); // 5mins
			if (hostParts.length < 2 || 
					hostParts[hostParts.length - 2] != "neu") {  // outside NEU network      	
				dataObj[optionKey] = optionArr[0] + ";" + optionArr[1] + ";" + d.getTime() + 
				";f;" + optionArr[4];
				controllerHelper(tab, optionArr[0]);
			}
			else {
				dataObj[optionKey] = optionArr[0] + ";" + optionArr[1] + ";" + d.getTime() +
				";t;" + optionArr[4];
			}
			tempDiv.parentNode.removeChild(tempDiv); // Removing the newly added div
		}
		chrome.storage.local.set(dataObj);		
	}); 
}

/**
 * controllerHelper: Tab String ->
 * Helps controller by showing the icon or changing url
 */
function controllerHelper(tab, op1) {
	if (op1 == "1") {
		updateTab(tab);
	}
	else {
		decideToShow(tab.id, tab.url);
	}	
}

/**
 * decideToShow: Number Tab -> 
 * Decides if the page-action icon should be shown for this tab.
 */
function decideToShow(tabId, url) {
	var wordsURL = url.split('/');
	var hostname = wordsURL[2];
	chrome.storage.local.get(hostname, function(result) {
		if (result[hostname] == placeHolder) {
			chrome.pageAction.show(tabId);
		}});
}