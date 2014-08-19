#!/usr/bin/env bash

echo
echo 'COHORT ANALYSIS'
echo

if [[ -z "$1" ]]; then
	echo "Syntax:"
	echo ". cohort.sh [RegisterStartDate] [RegisterEndDate - optional]"
	echo "Example:"
	echo ". cohort.sh 2014-02-14"
else
	STARTDATE=$1
	if [[ -z "$2" ]]; then
		ENDDATE=`date -j -v +6d -f "%Y-%m-%d" "$STARTDATE" +%Y-%m-%d`
	else
		ENDDATE=$2
	fi
	echo "Registration period: $STARTDATE - $ENDDATE"

	ACTIVESTARTDATE=`date -j -v +1d -f "%Y-%m-%d" "$ENDDATE" +%Y-%m-%d`
	ACTIVEENDDATE=`date -j -v +6d -f "%Y-%m-%d" "$ACTIVESTARTDATE" +%Y-%m-%d`
	echo "Activation period: $ACTIVESTARTDATE - $ACTIVEENDDATE"

	REPORTPATH="reports/cohorts/$STARTDATE"
	echo "Initializing folder: $REPORTPATH..."
	mkdir -p "$REPORTPATH"

	echo
	echo "Finding users that registered in the period $STARTDATE - $ENDDATE..."
	node mixpanel-analytics type:userlist from:$STARTDATE to:$ENDDATE events:"Register" > $REPORTPATH/tempReg.txt
	grep -v '^$' $REPORTPATH/tempReg.txt > $REPORTPATH/users-registered.txt
	sort $REPORTPATH/users-registered.txt -o $REPORTPATH/users-registered.txt

	sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/,/g' $REPORTPATH/users-registered.txt > $REPORTPATH/tempRegComma.txt
	REGISTEREDUSERS=`cat $REPORTPATH/tempRegComma.txt`

	echo "Exporting W0 timeline for the users..."
	node mixpanel-analytics from:$STARTDATE to:$ENDDATE type:usertimeline users:$REGISTEREDUSERS events:all > $REPORTPATH/w0-timeline.txt

	echo "Exporting W0 event count for the users..."
	node mixpanel-analytics from:$STARTDATE to:$ENDDATE type:count users:$REGISTEREDUSERS events:all > $REPORTPATH/w0-eventcount.txt

	echo "Exporting W0 event list for the users..."
	node mixpanel-analytics from:$STARTDATE to:$ENDDATE type:list users:$REGISTEREDUSERS events:all > $REPORTPATH/w0-eventlist.txt

	echo "Exporting W0 event tree for the users..."
	node mixpanel-analytics from:$STARTDATE to:$ENDDATE type:tree users:$REGISTEREDUSERS events:all > $REPORTPATH/w0-eventtree.txt

	echo "Exporting W0 event graph for the users..."
	node mixpanel-analytics from:$STARTDATE to:$ENDDATE type:graph users:$REGISTEREDUSERS events:all > $REPORTPATH/w0-eventgraph.json

	echo "Exporting W1 timeline for the users..."
	node mixpanel-analytics from:$ACTIVESTARTDATE to:$ACTIVEENDDATE type:usertimeline users:$REGISTEREDUSERS events:all > $REPORTPATH/w1-timeline.txt

	echo "Exporting W1 event count for the users..."
	node mixpanel-analytics from:$ACTIVESTARTDATE to:$ACTIVEENDDATE type:count users:$REGISTEREDUSERS events:all > $REPORTPATH/w1-eventcount.txt

	echo
	echo "Cleaning up..."
	rm $REPORTPATH/temp*.txt

	say -v Alex "Report is complete"
	tput bel
fi
