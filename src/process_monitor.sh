#! /bin/bash

while true 
do
	monitor=`ps -ef | grep node | grep -v "auto" | wc -l ` 
	if [ $monitor -eq 1 ]
	then
		echo "Manipulator program is not running, restart Manipulator"
		nohup node ./src/server.js > node.out &
	fi
	sleep 5
done

