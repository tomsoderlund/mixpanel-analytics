'use strict';

var async = require('async');
var mixpanel = require('./mixpanel');
var helpers = require('./helpers');
var config = require('./config');


module.exports = {

	// Structure data in a node/links list
	createNodeLinksList: function (data) {

		var generateNodeID = function (name, parentNode, level) {
			var id = name.replace(/ /g, '-').replace(/\./, '-').toLowerCase() + (level === 0 ? '' : level);
			return id;
		};

		var findNodeIndex = function (results, node) {
			for (var index in results.nodes) {
				if (results.nodes[index].id === node.id)
					return index;
			}
			return -1;
		};

		var findOrCreateNode = function (results, name, parentNode, level) {
			var node = { name: name, id: generateNodeID(name, parentNode, level) };
			// Only create node if it doesn't exist already
			if (findNodeIndex(results, node) === -1) {
				results.nodes.push(node);
			}
			return findNodeIndex(results, node);
		};

		var findLink = function (results, sourceIndex, targetIndex) {
			for (var index in results.links) {
				if (results.links[index].source === parseInt(sourceIndex) && results.links[index].target === parseInt(targetIndex))
					return results.links[index];
			}
			return null;
		};

		var createOrIncreaseLink = function (results, sourceIndex, targetIndex) {
			//console.log('createOrIncreaseLink', sourceIndex, targetIndex);
			var link = findLink(results, sourceIndex, targetIndex);
			if (!link) {
				link = { source: parseInt(sourceIndex), target: parseInt(targetIndex), value: 0 };
				results.links.push(link);
			}
			link.value += 1;
		};

		/*
		var scanBranch = function (results, branchObj, parentNode, level) {
			level = level || 0;
			for (var child in branchObj) {
				// Create/find node
				//console.log('Node:', child, level);
				var nodeIndex = findOrCreateNode(results, child, parentNode, level);
				// Create links
				if (parentNode) {
					var sourceIndex = findNodeIndex(results, parentNode);
					var targetIndex = findNodeIndex(results, results.nodes[nodeIndex]);
					createOrIncreaseLink(results, sourceIndex, targetIndex);
				}
				// Recursive call, if has children
				if (branchObj[child].children !== {}) {
					scanBranch(results, branchObj[child].children, results.nodes[nodeIndex], level + 1);
				}
			};
		};
		*/

		var scanUserEvents = function (results, users) {
			var result = "";
			// List for each user:
			for (var userId in users) {
				//result += 'User: ' + userId + '\n';
				var lastNode = null;
				var level = 0;
				var lastTime = users[userId].events[0].time;
				// For each event
				for (var evt in users[userId].events) {
					var timeElapsed = users[userId].events[evt].time - lastTime;
					//result += '  ' + users[userId].events[evt].name + ', ' + helpers.formatDate(new Date(users[userId].events[evt].time*1000)) + ', ' + Math.round(timeElapsed/60.0*10)/10 + ' min' + '\n';

					// Create/find node
					var eventName = users[userId].events[evt].name;
					//console.log('Node:', eventName);
					var nodeIndex = findOrCreateNode(results, eventName, lastNode, level);
					// Create links between last node and this node
					if (lastNode) {
						var sourceIndex = findNodeIndex(results, lastNode);
						var targetIndex = findNodeIndex(results, results.nodes[nodeIndex]);
						createOrIncreaseLink(results, sourceIndex, targetIndex);
					}

					lastNode = results.nodes[nodeIndex];
					level++;
					lastTime = users[userId].events[evt].time;
				}
			};
			return result;
		};

		var results = { nodes:[], links:[] };
		//scanBranch(results, data, null, 0);
		scanUserEvents(results, data);

		return results;
	},

	// Structure data grouped by User, then Events
	createUserEventList: function (data) {
		var users = {};
		// { event: 'Open project', properties: { time: 1394053455, distinct_id: 'h9AeW1X3S1WZYADWuViCyw', '$lib_version': '3.0.0', 'Project ID': 'NwFiYxM2TeKszHOOHzFe1A', mp_lib: 'python' } },
		for (var row in data) {
			//console.log(row, data[row].event, data[row].properties.time, data[row].properties[config.user_alias_field], data[row].properties.distinct_id);
			var userId = data[row].properties[config.user_alias_field] || data[row].properties.distinct_id;
			users[userId] = users[userId] || {};
			users[userId].events = users[userId].events || [];
			users[userId].events.push( { name: data[row].event, time: data[row].properties.time } )
		};
		return users;
	},

	// Structure data grouped by User, then Events
	createLastUserEvents: function (users, nrOfEvents) {
		var usersLast = {};
		for (var userId in users) {
			usersLast[userId] = {};
			usersLast[userId].events = [];
			var totalEvents = helpers.objectSize(users[userId].events);
			for (var e = totalEvents - nrOfEvents; e < totalEvents; e++) {
				if (users[userId].events[e]) {
					usersLast[userId].events.push(users[userId].events[e]);
				}
			}
		};
		return usersLast;
	},

	// Count events
	createEventCount: function (data) {
		var events = {};
		// { event: 'Open project', properties: { time: 1394053455, distinct_id: 'h9AeW1X3S1WZYADWuViCyw', '$lib_version': '3.0.0', 'Project ID': 'NwFiYxM2TeKszHOOHzFe1A', mp_lib: 'python' } },
		for (var row in data) {
			//console.log(row, data[row].event, data[row].properties.time);
			var eventName = data[row].event;
			events[eventName] = events[eventName] || 0;
			events[eventName]++;
		};
		events = helpers.sortObjectByValue(events);
		return events;
	},

	// Count events for each user
	createUserCount: function (data) {
		var events = {};
		// { event: 'Open project', properties: { time: 1394053455, distinct_id: 'h9AeW1X3S1WZYADWuViCyw', '$lib_version': '3.0.0', 'Project ID': 'NwFiYxM2TeKszHOOHzFe1A', mp_lib: 'python' } },
		for (var row in data) {
			//console.log(row, data[row].event, data[row].properties.time);
			var userName = data[row].properties[config.user_alias_field] || data[row].properties.distinct_id;
			events[userName] = events[userName] || 0;
			events[userName]++;
		};
		events = helpers.sortObjectByValue(events);
		return events;
	},

	// Timeline: nr of events/day
	createTimeLine: function (data) {
		var dates = {};
		// { event: 'Open project', properties: { time: 1394053455, distinct_id: 'h9AeW1X3S1WZYADWuViCyw', '$lib_version': '3.0.0', 'Project ID': 'NwFiYxM2TeKszHOOHzFe1A', mp_lib: 'python' } },
		for (var row in data) {
			//console.log(row, data[row].event, data[row].properties.time);
			var dateId = helpers.formatDate(new Date(data[row].properties.time*1000));
			dates[dateId] = dates[dateId] || 0;
			dates[dateId]++;
		};
		return dates;
	},

	// User Timeline: nr of active users/day
	createUserTimeLine: function (data) {
		var dateUsers = {};
		// { event: 'Open project', properties: { time: 1394053455, distinct_id: 'h9AeW1X3S1WZYADWuViCyw', '$lib_version': '3.0.0', 'Project ID': 'NwFiYxM2TeKszHOOHzFe1A', mp_lib: 'python' } },
		for (var row in data) {
			//console.log(row, data[row].event, data[row].properties.time);
			var dateId = helpers.formatDate(new Date(data[row].properties.time*1000));
			var userId = data[row].properties.distinct_id;
			dateUsers[dateId] = dateUsers[dateId] || {};
			dateUsers[dateId][userId] = dateUsers[dateId][userId] || 0;
			dateUsers[dateId][userId]++;
		};
		// Loop again and just count the number of userId's per date
		var dates = {};
		for (var date in dateUsers) {
			dates[date] = helpers.objectSize(dateUsers[date]);
		}
		return dates;
	},

	// Structure data in a branched event tree: Event.children={ SubEvent ... }
	createEventTree: function (data) {
		var users = module.exports.createUserEventList(data);
		var eventTree = {};
		for (var userId in users) {
			var eventCursor = eventTree;
			var eventIndex = 0;
			for (var evt in users[userId].events) {
				var eventName = users[userId].events[evt].name;
				eventCursor[eventName] = eventCursor[eventName] || {};
				eventCursor[eventName].name = eventName;
				eventCursor[eventName].count = eventCursor[eventName].count + 1 || 1;
				eventCursor[eventName].children = eventCursor[eventName].children || {};
				// Move cursor
				eventCursor = eventCursor[eventName].children;
				eventIndex++
			}
		};
		return eventTree;
	},

	// Lookup people
	/*
	Results: an array of:
		'jane@doe.com': {
			'$campaigns': [ 90759, 132825 ],
			'$deliveries': [ 74121545, 81012085 ],
			'$distinct_id': 'jane@doe.com'
			'$email': 'jane@doe.com',
			'$last_seen': '2014-02-26T17:16:15',
			'$name': 'alireza89',
			dateCreated: '2014-02-14T16:01:57',
			dateLastLogin: '2014-02-26T17:18:33',
			dateLastVisitedPlace: '2001-01-01T00:00:00',
			numberProjects: 0,
			userId: 'cMVQvVI_QJaaVXwWKxr5kw',
			userName: 'alireza89',
		}
	*/
	populateUsers: function (userAliasArray, useAlias, callback) {
		async.map(
			userAliasArray,
			// Do this for each userRef (e.g. email address):
			function (userRef, next) {
				if (useAlias) {
					// Use alias e.g. email
					var whereObj = {};
					whereObj[config.user_alias_field] = userRef;
					mixpanel.people(null, whereObj, function (data) {
						next(null, data);
					});
				}
				else {
					// Use distinct_id
					mixpanel.people(userRef, null, function (data) {
						next(null, data);
					});
				}
			},
			// Process results
			function (err, results) {
				// results is now multiple arrays, let's reorganize
				var personArray = [];
				for (var i in results) {
					for (var e in results[i]) {
						var userObj = results[i][e]['$properties'];
						userObj['$distinct_id'] = results[i][e]['$distinct_id'];
						personArray.push(userObj);
					};
				};
				// Data is ready, now produce output
				callback(personArray);
			}
		);

	}

}