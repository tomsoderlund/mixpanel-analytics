# mixpanel-analytics

Tools for exporting and analyzing Mixpanel data.

* The `mixpanel-analytics` command-line tool will fetch data from Mixpanel API, process it, and present it in different ways.
* Batch scripts for linking multiple operations (see `/batch` folder).
* Collection of graphs based on D3 (see `/graph` folder).


## Installation

1. Download the source code.
2. Run `npm install`
3. Edit your Mixpanel settings in `lib/config.json`


## Syntax

	node mixpanel-analytics [type] [format] [from] [to] [users] [events]

**Parameters:**

* `type` (the only mandatory parameter): what type of report:
	* `list`: raw list of events
	* `count`: count of events by event name
	* `usercount`: count of events by user
	* `userlist`: just a list of users that have done events
	* `userevents`: list of events grouped by user
	* `last`: list of last 3 events grouped by user
	* `timeline`: events for each day
	* `usertimeline`: active users for each day
	* `tree`: events that follow an event in a nested structure
	* `graph`: node and link graph data in JSON. Nodes are events, links are how events follow one another.
* `format:yes`: formats output to readable text, depending on the `type` used. If not "yes", the tool will output JSON.
* `from` and `to`: Date parameters (e.g. 2014-03-05) that default to today's date if not set. If `to` is same as `from` (or not set), then 1 day of data is reported. 
* `events`: comma-separated string with event names, please enclose in quotes: `events:"Open project,Open template project"`
* `users`: comma-separated string with user IDs: `users:john@doe.com,jane@doe.com`

See `lib/mixpanel-analytics.js` for more details.


## Examples


### "Minimum input example"

**Input:**

	node mixpanel-analytics type:list

**Output:**
 see _Event list_ below, will produce a list for all users, default events, and today's date only.


### Event list

**Input:**

	node mixpanel-analytics type:list format:yes from:2014-02-06 users:john@doe.com,jane@doe.com

**Output:**

	jane@doe.com, Login, 2014-02-06 22:06, 0.2 min
	jane@doe.com, New project, 2014-02-06 22:07, 0.2 min
	john@doe.com, Login, 2014-02-06 18:14, 0 min
	john@doe.com, Open template project, 2014-02-06 18:14, 0.4 min

Note: remove `format:yes` and get output as a JSON list.


### Event count

**Input:**

	node mixpanel-analytics type:count format:yes from:2014-02-06 users:john@doe.com,jane@doe.com

**Output:**

	Login: 5
	Open template project: 4
	New project: 2
	Open project: 4


### Event list grouped by users

**Input:**

	node mixpanel-analytics type:userevents format:yes from:2014-02-06 users:john@doe.com,jane@doe.com

**Output:**

	User: john@doe.com
	  Login, 2014-02-06, 0 min
	  Open template project, 2014-02-06, 0.4 min
	User: jane@doe.com
	  Login, 2014-02-06, 0 min
	  New project, 2014-02-06, 0.4 min


### Event count for each user ("Most active users")

**Input:**

	node mixpanel-analytics type:usercount from:2014-02-06

**Output:**

	jane@doe.com: 20
	john@doe.com: 3


### Event timeline

**Input:**

	node mixpanel-analytics from:2014-02-01 to:2014-02-05 type:timeline users:john@doe.com,jane@doe.com

**Output:**

	Timeline: 2014-02-01 - 2014-02-05 (5 days)
	0,0,14,97,62


### User timeline

**Input:**

	node mixpanel-analytics from:2014-02-01 to:2014-02-05 type:usertimeline users:john@doe.com,jane@doe.com

**Output:**

	Timeline: 2014-02-01 - 2014-02-05 (5 days)
	0,0,14,97,62


### Event tree

**Input:**

	node mixpanel-analytics type:tree from:2014-02-06 to:2014-02-20 to:2014-02-20 users:john@doe.com,jane@doe.com

**Output:**

	Register (2)
	  |-Login (2)
	    |-Open template project (1)
	      |-$campaign_delivery (1)
	        |-$campaign_open (1)
	    |-New project (1)
	      |-Open project (1)
	        |-Login begin (1)
	          |-Login begin (1)


### Event graph

**Input:**

	node mixpanel-analytics type:graph from:2014-02-06 users:john@doe.com,jane@doe.com > mixpanel-analytics/graph/data/output.json

**Output:**

	{
	  "nodes": [
	    {
	      "name": "Register",
	      "id": "register"
	    },
	    {
	      "name": "Login",
	      "id": "login1"
	    },
	    {
	      "name": "Open template project",
	      "id": "open-template-project2"
	    }
	  ],
	  "links": [
	    {
	      "source": 0,
	      "target": 1,
	      "value": 1
	    },
	    {
	      "source": 1,
	      "target": 2,
	      "value": 1
	    }
	  ]
	}

Notes:

1. Always outputs JSON, no matter what the `format` property says.
2. Update the Sankey graph JSON with `node mixpanel-analytics type:graph from:2014-02-06 users:john@doe.com,jane@doe.com > mixpanel-analytics/graph/data/output.json`


### Events of specific type

	node mixpanel-analytics from:2014-03-05 type:list events:"Open project,Open template project"


### Events from specific users

	node mixpanel-analytics from:2014-03-05 to:2014-03-05 type:list users:john@doe.com,jane@doe.com
