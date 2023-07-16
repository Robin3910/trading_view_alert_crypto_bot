#! /bin/bash

while true 
do
	monitor=`ps -ef | grep node | grep -v "auto" | wc -l ` 
	if [ $monitor -eq 0 ] 
	then
		echo "Manipulator program is not running, restart Manipulator"
		nohup node main.js > node.out &
	else
		echo "Manipulator program is running"
	fi
	sleep 5
done

