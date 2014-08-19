'use strict';

var http = require('http');
var https = require('https');
var md5 = require('./md5');
var helpers = require('./helpers');
var config = require('./config');

/*

https://data.mixpanel.com/api/2.0/export/?from_date=2012-02-14&expire=1329760783&sig=bbe4be1e144d6d6376ef5484745aac45
&to_date=2012-02-14&api_key=f0aa346688cee071cd85d857285a3464&
where=properties%5B%22%24os%22%5D+%3D%3D+%22Linux%22&event=%5B%22Viewed+report%22%5D

-->

https://data.mixpanel.com/api/2.0/export/?
from_date=2012-02-14
&expire=1329760783
&sig=bbe4be1e144d6d6376ef5484745aac45
&to_date=2012-02-14
&api_key=f0aa346688cee071cd85d857285a3464
&where=properties["$os"] == "Linux"
&event=["Viewed report"]

*/

var initializeArguments = function () {
	var args = [];
	args.push('expire=' + (Math.round(new Date().getTime() / 1000) + 60) ); // expire in 60 seconds
	args.push('api_key=' + config.api_key);
	return args;
};

var signArguments = function (args) {
	var args_sorted = args.sort();
	var args_concat = args_sorted.join('');
	//console.log('args_concat:', args_concat );
	var sig = md5.calculateMD5(args_concat + config.api_secret);
	args_sorted.push('sig=' + sig);
	return args_sorted;
};

var convertMixpanelToJSON = function (mixpanelString) {
	var resultArray = [];
	var rawArray = mixpanelString.split('\n');
	for (var r in rawArray) {
		if (rawArray[r].length > 0) {
			resultArray.push(JSON.parse(rawArray[r]));			
		}
	}
	return resultArray;
};

var buildMixpanelURL = function (base_url, args) {
	var args_sorted = signArguments(args);
	var full_url = base_url + args_sorted.join('&');
	//console.log('buildMixpanelURL', full_url);
	return full_url;
}

var buildWhereString = function (params) {
	var results = "";
	for (var key in params) {
		results += 'properties["' + key + '"]=="' + params[key] + '"'
	};
	return results;
}

var requestHTTPS = function (url, callback, doConvert) {
	//console.log('GET: ' + url);
	var request = https.get(url, function (response) {
		var pageData = "";
		response.setEncoding('utf8');

		response.on('data', function (chunk) {
			pageData += chunk;
		});

		response.on('end', function () {
			if (doConvert) {
				callback( convertMixpanelToJSON(pageData) );
			}
			else {
				callback( JSON.parse(pageData) ); // JSON.parse()
			}
		});

		response.on('error', function (e) {
			console.log("Error: " + e.message);
		});		
	});
};

// ----- Public API -----

exports.exportEvents = function (from_date, to_date, eventNamesArray, whereStr, callback) {
	var args = initializeArguments();
	args.push('from_date=' + from_date);
	args.push('to_date='   + to_date);
	if (eventNamesArray)
		args.push('event=["' + eventNamesArray.join('","') + '"]');
	if (whereStr)
		args.push('where=' + whereStr);
	requestHTTPS(
		buildMixpanelURL('https://data.mixpanel.com/api/2.0/export/?', args),
		callback,
		true
	);
};

exports.eventStream = function (from_date, to_date, userIdsArray, callback) {
	var args = initializeArguments();
	args.push('from_date=' + from_date);
	args.push('to_date='   + to_date);
	if (userIdsArray)
		args.push('distinct_ids=["' + userIdsArray.join('","') + '"]');
	requestHTTPS(
		buildMixpanelURL('https://mixpanel.com/api/2.0/stream/query?', args),
		function (data) {
			//console.log(helpers.JSONtoString(data));
			callback(data.results.events)
		},
		false
	);
};

// https://mixpanel.com/api/2.0/engage?distinct_id=DISTINCT_ID&api_key=API_KEY&expire=1395422790&sig=SIG
exports.people = function (distinctId, whereParamList, callback) {
	var args = initializeArguments();
	if (distinctId)
		args.push('distinct_id=' + distinctId);
	if (whereParamList)
		args.push('where=' + buildWhereString(whereParamList));
	requestHTTPS(
		buildMixpanelURL('https://mixpanel.com/api/2.0/engage/?', args),
		function (data) {
			//console.log(helpers.JSONtoString(data));
			callback(data.results)
		},
		false
	);
};

exports.activeUsersToday = function (callback) {
	var args = initializeArguments();
	var todayStr = '2014-01-09'; //helpers.formatDate(new Date());
	args.push('where=' + '"' + todayStr + '"' + ' in ' + 'properties["' + '$last_seen' + '"]');
	requestHTTPS(
		buildMixpanelURL('https://mixpanel.com/api/2.0/engage/?', args),
		function (data) {
			//console.log(helpers.JSONtoString(data));
			callback(data.results)
		},
		false
	);
};