#!/usr/bin/env bash

echo
echo 'ACTIVE/INACTIVE USERS FOR SPECIFIC EVENT'
echo

if [[ -z "$5" ]]; then
	echo "Syntax:"
	echo ". active-inactive.sh [StartDate] [DidThisEventEarlyDate] [InactiveBreakoffDate] [EndDate] \"Event name\""
	echo "Example:"
	echo ". active-inactive.sh 2014-02-14 2014-02-28 2014-03-07 2014-03-14 \"Open project\""
else
	REPORTPATH="reports/active-inactive"
	echo "Initializing folder: $REPORTPATH..."
	mkdir -p $REPORTPATH

	echo
	echo "Finding users that registered in the initial period $1 - $2..."
	node mixpanel-analytics type:userlist from:$1 to:$2 events:"Register" > $REPORTPATH/tempReg.txt
	grep -v '^$' $REPORTPATH/tempReg.txt > $REPORTPATH/users-registered.txt
	sort $REPORTPATH/users-registered.txt -o $REPORTPATH/users-registered.txt
	sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/,/g' $REPORTPATH/users-registered.txt > $REPORTPATH/tempRegComma.txt
	REGISTEREDUSERS=`cat $REPORTPATH/tempRegComma.txt`

	# echo "Exporting users active in the full period $1 - $4..."
	# node mixpanel-analytics type:userlist from:$1 to:$4 users:$REGISTEREDUSERS > $REPORTPATH/tempAll.txt
	# grep -v '^$' $REPORTPATH/tempAll.txt > $REPORTPATH/users-all.txt
	# sort $REPORTPATH/users-all.txt -o $REPORTPATH/users-all.txt
	# sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/,/g' $REPORTPATH/users-all.txt > $REPORTPATH/tempAllComma.txt
	# ALLUSERS=`cat $REPORTPATH/tempAllComma.txt`
	cp $REPORTPATH/users-registered.txt $REPORTPATH/users-all.txt

	echo "Exporting users that did are still active in the ending period $3 - $4..."
	node mixpanel-analytics type:userlist from:$3 to:$4 users:$REGISTEREDUSERS > $REPORTPATH/tempAct.txt
	grep -v '^$' $REPORTPATH/tempAct.txt > $REPORTPATH/users-active.txt
	sort $REPORTPATH/users-active.txt -o $REPORTPATH/users-active.txt
	sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/,/g' $REPORTPATH/users-active.txt > $REPORTPATH/tempActComma.txt
	ACTIVEUSERS=`cat $REPORTPATH/tempActComma.txt`
	
	echo "Extracting the users that were NOT active in the ending period $3 - $4..."
	comm -23 "$REPORTPATH/users-all.txt" "$REPORTPATH/users-active.txt" > "$REPORTPATH/users-inactive.txt"
	sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/,/g' $REPORTPATH/users-inactive.txt > $REPORTPATH/tempInactComma.txt
	INACTIVEUSERS=`cat $REPORTPATH/tempInactComma.txt`

	echo
	echo "Exporting '$5' timeline for still active users..."
	node mixpanel-analytics from:$1 to:$4 type:usertimeline events:"$5" users:$ACTIVEUSERS > $REPORTPATH/timeline-active.txt
	echo "Exporting '$5' timeline for now inactive users..."
	node mixpanel-analytics from:$1 to:$4 type:usertimeline events:"$5" users:$INACTIVEUSERS > $REPORTPATH/timeline-inactive.txt

	echo
	echo "Cleaning up..."
	rm $REPORTPATH/temp*.txt
fi