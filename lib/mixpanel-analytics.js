#! /usr/bin/env node

/*
 * mixpanel-analytics
 * https://github.com/tomsoderlund/mixpanel-analytics
 *
 * Copyright (c) 2014 Tom Söderlund
 * Licensed under the MIT license.
 */

'use strict';

var async = require('async');
var mixpanel = require('./mixpanel');
var analytics = require('./analytics');
var helpers = require('./helpers');
var config = require('./config');

var cmdLineArgs;


// Process arguments in the form name:value, return an object
var processCommandLineArguments = function () {
	var argObj = {};
	for (var i = 1; i < process.argv.length; i++) {
		if (process.argv[i].indexOf(':') > -1) {
			var comps = process.argv[i].split(':');
			argObj[comps[0]] = comps[1];
		}
	}
	// Default values
	var todaysDateString =  helpers.formatDate(new Date());
	argObj.from = argObj.from || todaysDateString;
	argObj.to = argObj.to || argObj.from;
	argObj.type = argObj.type || null;
	argObj.format = argObj.format || "yes";
	if (argObj.users) {
		argObj.users = argObj.users.split(',');
	}
	if (argObj.events) {
		if (argObj.events.toLowerCase() === 'all')
			argObj.events = null;
		else
			argObj.events = argObj.events.split(',');
	}
	else {
		argObj.events = config.default_events;
	}
	return argObj;
};

// Preprocess the Event data before printing
var preprocessEventData = function (data) {
	var results;
	switch (cmdLineArgs.type) {
		case 'count':
			results = analytics.createEventCount(data);
			break;
		case 'usercount':
		case 'userlist':
			results = analytics.createUserCount(data);
			break;
		case 'userevents':
			results = analytics.createUserEventList(data);
			break;
		case 'last':
			results = analytics.createUserEventList(data);
			results = analytics.createLastUserEvents(results, 3);
			break;
		case 'timeline':
			results = analytics.createTimeLine(data);
			break;
		case 'usertimeline':
			results = analytics.createUserTimeLine(data);
			break;
		case 'tree':
			results = analytics.createEventTree(data);
			break;
		case 'graph':
			var userEvents = analytics.createUserEventList(data);
			results = analytics.createNodeLinksList(userEvents);
			break;
		default:
			results = data;
			break;
	};
	// Print via printOutput
	printOutput(results);
};

// Print a JSON object to console in various formats
var printOutput = function (jsonObject) {
	if (cmdLineArgs.format === 'yes') {
		switch (cmdLineArgs.type) {
			case 'list':
				console.log(helpers.formatEventList(jsonObject));
				break;
			case 'count':
			case 'usercount':
				console.log(helpers.formatCount(jsonObject));
				break;
			case 'userlist':
				console.log(helpers.formatSimpleList(jsonObject));
				break;
			case 'userevents':
			case 'last':
				console.log(helpers.formatUserEventList(jsonObject));
				break;
			case 'timeline':
			case 'usertimeline':
				console.log(helpers.formatTimeLine(jsonObject, cmdLineArgs.from, cmdLineArgs.to));
				break;
			case 'tree':
				console.log(helpers.formatRecursiveTree(jsonObject));
				break;
			default:
				// Just print JSON object
				console.log(helpers.JSONtoString(jsonObject));
				break;
		}
	}
	else {
		// Just print JSON object
		console.log(helpers.JSONtoString(jsonObject));
	}
};

// ----------------------

cmdLineArgs = processCommandLineArguments();
// console.log('Parameters:', cmdLineArgs);

switch (cmdLineArgs.type) {
	case null:
		// Type is not set
		console.log('\nError: must choose which data type with type:[TYPE] parameter.');
		console.log('       TYPE can be: ' + 'list, count, usercount, userlist, userevents, last, timeline, usertimeline, tree, graph');
		console.log('       (no other parameters are mandatory)');
		console.log('Usage: node mixpanel-analytics from:2014-02-01 to:2014-02-01 type:list format:yes users:[COMMA LIST] events:"[COMMA LIST]"\n');
		break;
	case 'people':
		var users = analytics.populateUsers((cmdLineArgs.users || cmdLineArgs.id), (cmdLineArgs.users ? true : false), function (userArray) {
			console.log(userArray);
		}); 
		// var users = mixpanel.people(cmdLineArgs.id, cmdLineArgs.users, function (userArray) {
		// 	console.log(userArray);
		// }); 
		break;
	case 'activeusers':
		var users = mixpanel.activeUsersToday(preprocessEventData); 
		break;
	default:
		// Type is set and will be handled in preprocessEventData by looking at cmdLineArgs.type
		if (cmdLineArgs.users) {
			// Populate users and get $distinct_id from alias (e.g. email address)
			analytics.populateUsers(cmdLineArgs.users, true, function (userArray) {
				async.map(
					userArray,
					// Do this for each userObj:
					function (userObj, next) {
						mixpanel.eventStream(cmdLineArgs.from, cmdLineArgs.to, [userObj['$distinct_id']], function(data) {
							next(null, data);
						});
					},
					// Process results
					function (err, results) {
						// results is now multiple arrays, let's reorganize
						var eventArray = [];
						for (var i in results) {
							for (var e in results[i]) {
								eventArray.push(results[i][e]);
							};
						};
						// Data is ready, now produce output
						eventArray = helpers.filterEvents(eventArray, cmdLineArgs.events);
						helpers.addUserAliasFromDistinctID(eventArray, userArray);
						preprocessEventData(eventArray);
					}
				);
			});

		}
		else {
			mixpanel.exportEvents(cmdLineArgs.from, cmdLineArgs.to, cmdLineArgs.events, null, function(eventArray) {
				var distinctIdArray = helpers.convertObjectToArray(analytics.createUserEventList(eventArray), false);
				analytics.populateUsers(distinctIdArray, false, function (userArray) {
					helpers.addUserAliasFromDistinctID(eventArray, userArray);
					preprocessEventData(eventArray);
				});
			});
		}
		break;
}
