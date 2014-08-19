#!/usr/bin/env bash

echo
echo 'REGISTERED USERS'
echo

if [[ -z "$1" ]]; then
	echo "Syntax:"
	echo ". registered.sh [RegisterStartDate] [RegisterEndDate - optional]"
	echo "Example:"
	echo ". registered.sh 2014-02-14"
else
	STARTDATE=$1
	if [[ -z "$2" ]]; then
		ENDDATE=$1
	else
		ENDDATE=$2
	fi
	echo "Registration period: $STARTDATE - $ENDDATE"

	REPORTPATH="reports/registered/$STARTDATE"
	echo "Initializing folder: $REPORTPATH..."
	mkdir -p "$REPORTPATH"

	echo
	echo "Finding users that registered in the period $STARTDATE - $ENDDATE..."
	node mixpanel-analytics type:userlist from:$STARTDATE to:$ENDDATE events:"Register" > $REPORTPATH/tempReg.txt
	grep -v '^$' $REPORTPATH/tempReg.txt > $REPORTPATH/users-registered.txt
	sort $REPORTPATH/users-registered.txt -o $REPORTPATH/users-registered.txt

	echo
	echo "Cleaning up..."
	rm $REPORTPATH/temp*.txt
fi