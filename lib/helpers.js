'use strict';

var config = require('./config');

module.exports = {

	formatDate: function (dateObj) {
		return (dateObj.getFullYear() + "-" + ('0'+(dateObj.getMonth()+1)).slice(-2) + "-" + ('0'+dateObj.getDate()).slice(-2) );
	},

	formatDateAndTime: function (dateObj) {
		return module.exports.formatDate(dateObj) + " " + ('0'+(dateObj.getHours()+1)).slice(-2) + ":" + ('0'+(dateObj.getMinutes()+1)).slice(-2);
	},

	addDaysToDate: function (theDate, days) {
		return new Date(theDate.getTime() + days*24*60*60*1000);
	},

	formatTimeDiff: function (timeDiff) {
		return Math.round(timeDiff/60.0*10)/10 + ' min';
	},

	JSONtoString: function (obj) {
		return JSON.stringify(obj, null, 2);
	},

	objectSize: function (obj) {
		var size = 0, key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) size++;
		}
		return size;
	},

	convertObjectToArray: function (obj, useValues) {
		var array = [];
		for (var key in obj) {
			if (useValues)
				array.push(obj[key]);
			else
				array.push(key);
		}
		return array;
	},

	sortObjectByValue: function (obj) {
		// Convert to array, sort, and back again: http://stackoverflow.com/questions/1069666/sorting-javascript-object-by-property-value
		var sortArray = [];
		for (var i in obj) {
			sortArray.push([ i, obj[i] ])
		}
		sortArray.sort(function (a, b) {return b[1] - a[1]});
		var newObj = {};
		for (var i in sortArray) {
			newObj[sortArray[i][0]] = sortArray[i][1];
		}
		return newObj;
	},

	mergeEventLists: function (bigList, newList) {
		//console.log('mergeEventLists:', isDone, bigList.length + '+' + newList.length);
		for (var row in newList) {
			//console.log(row, data[row].event, data[row].properties.time);
			bigList.push(newList[row]);
		};
	},

	/*
	Assumes treeObj has format:
		{
			obj: { children: { ... }, count: n },
			obj: { children: { ... }, count: n }
		}
	*/
	formatRecursiveTree: function (treeObj, level) {
		var results = "";
		level = level || 0;
		var spacing = "                                              ";
		for (var child in treeObj) {
			results += spacing.substr(0, level*2) + (level > 0 ? '|-' : '') + child + ' (' + treeObj[child].count + ')\n';
			// Recursive call, if has children
			if (treeObj[child].children !== {}) {
				results += this.formatRecursiveTree(treeObj[child].children, level + 1);
			}
		};
		return results;
	},

	formatUserEventList: function (users) {
		var result = "";
		// List for each user:
		for (var userId in users) {
			result += 'User: ' + userId + '\n';
			var lastTime = users[userId].events[0].time;
			for (var evt in users[userId].events) {
				var timeElapsed = users[userId].events[evt].time - lastTime;
				result += '  ' + users[userId].events[evt].name + ', ' + module.exports.formatDateAndTime(new Date(users[userId].events[evt].time*1000)) + ', ' + module.exports.formatTimeDiff(timeElapsed) + '\n';
				lastTime = users[userId].events[evt].time;
			}
		};
		return result;
	},

	formatEventList: function (events) {
		var result = "";
		// { event: 'Open project', properties: { time: 1394053455, distinct_id: 'h9AeW1X3S1WZYADWuViCyw', '$lib_version': '3.0.0', 'Project ID': 'NwFiYxM2TeKszHOOHzFe1A', mp_lib: 'python' } },
		// List for each event:
		var lastTime = null;
		var userName = null;
		for (var evt in events) {
			if (events[evt].properties[config.user_alias_field] !== userName && events[evt].properties.distinct_id !== userName) {
				userName = events[evt].properties[config.user_alias_field] || events[evt].properties.distinct_id;
				lastTime = events[evt].properties.time;
			}
			var timeElapsed = events[evt].properties.time - lastTime;
			result += userName + ', ' + events[evt].event + ', ' + module.exports.formatDateAndTime(new Date(events[evt].properties.time*1000)) + ', ' + module.exports.formatTimeDiff(timeElapsed) + '\n';
			lastTime = events[evt].properties.time;
		}
		return result;
	},

	formatTimeLine: function (dates, from, to) {
		var fromDate = new Date(from);
		var toDate = new Date(to);
		var dayInMillis = (1000 * 60 * 60 * 24);
		var nrOfDays = 1 + (toDate - fromDate) / dayInMillis;
		var result = "";
		//console.log(fromDate, toDate, nrOfDays);
		result += 'Timeline: ' + module.exports.formatDate(fromDate) + ' - ' + module.exports.formatDate(toDate) + ' (' + nrOfDays + ' days)\n';
		for (var d = 0; d < nrOfDays; d++) {
			var currentDate = module.exports.addDaysToDate(fromDate, d);
			var currentDateStr = module.exports.formatDate(currentDate);
			result += (dates[currentDateStr] || 0 );
			// Comma or newline
			result += (d < nrOfDays-1 ? ',' : '\n');
		};
		return result;
	},

	formatSimpleList: function (events) {
		var result = "";
		for (var evt in events) {
			result += evt + '\n';
		}
		return result;
	},

	formatCount: function (events) {
		var result = "";
		for (var evt in events) {
			result += evt + ': ' + events[evt] + '\n';
		}
		return result;
	},

	filterEvents: function (eventArray, eventNameList) {

		// All if null
		if (!eventNameList)
			return eventArray;
		
		var isEventNameValid = function (eventName) {
			for (var n in eventNameList) {
				if (eventNameList[n] === eventName) {
					return true;
				}
			}
			return false;
		};

		var newEventArray = [];
		for (var e in eventArray) {
			if (isEventNameValid(eventArray[e].event)) {
				newEventArray.push(eventArray[e]);
			}
		}
		return newEventArray;
	},

	// Add UserAlias (e.g. email) to eventArray, from the userArray normally returned from analytics.populateUsers()
	addUserAliasFromDistinctID: function (eventArray, userArray) {

		var getAliasFromDistinctID = function (distinctID) {
			for (var u in userArray) {
				if (userArray[u]['$distinct_id'] === distinctID) {
					return userArray[u][config.user_alias_field];
				}
			}
			return null;
		};

		for (var e in eventArray) {
			eventArray[e].properties[config.user_alias_field] = getAliasFromDistinctID(eventArray[e].properties['distinct_id']);
			//console.log('addUserAliasFromDistinctID:', eventArray[e].properties['distinct_id'] + ' --> ' + eventArray[e].properties[config.user_alias_field]);
		}
	}

};