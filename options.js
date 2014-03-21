/**
 * Invoked when the html page is loaded
 */
function init() {
	chrome.storage.local.get("ezproxy.neu.edu", function (result) {
		var o = result["ezproxy.neu.edu"];
		if (typeof o === 'undefined') { // new installation
			document.getElementById("2").checked = true;
			document.getElementById("out").checked = true;
			document.getElementById("netIDrefresh").value = 0;
			document.getElementById("isInNEU").value = "f";
			document.getElementById("DBrefresh").value = 0;
		}
		else {
			var os = o.toString().split(";");
			if (os.length <= 1) {
				document.getElementById("2").checked = true;
				document.getElementById("out").checked = true;
				document.getElementById("netIDrefresh").value = 0;
				document.getElementById("isInNEU").value = "f";
				if (os.length == 1)
					document.getElementById("DBrefresh").value = os[0];
				else 
					document.getElementById("DBrefresh").value = 0; // update DB on next request

			}
			else {
				document.getElementById(os[0]).checked = true;
				document.getElementById(os[1]).checked = true;
				document.getElementById("netIDrefresh").value = os[2];
				document.getElementById("isInNEU").value = os[3];
				document.getElementById("DBrefresh").value = os[4];
			}
		}
	});	
}
/**
 * Invoked when "save" button is clicked
 */
function save() {
	var op = "";
	var radios = document.getElementsByName("click");
	for (var i = 0; i < radios.length; i++) {
		if (radios[i].checked)
			op += radios[i].id + ";";
	}
	radios = document.getElementsByName("when");
	for (var i = 0; i < radios.length; i++) {
		if (radios[i].checked)
			op += radios[i].id + ";";
	}
	op += document.getElementById("netIDrefresh").value + ";";
	op += document.getElementById("isInNEU").value + ";";
	op += document.getElementById("DBrefresh").value;
	var dataObj = {};
	dataObj["ezproxy.neu.edu"] = op;
	chrome.storage.local.set(dataObj);

	// Update status to let user know options were saved.
	var status = document.getElementById("status");
	status.innerHTML = "Options Saved.";
	setTimeout(function() {
		status.innerHTML = "";
	}, 750);
}
document.addEventListener('DOMContentLoaded', init);
document.querySelector('#save').addEventListener('click', save);
