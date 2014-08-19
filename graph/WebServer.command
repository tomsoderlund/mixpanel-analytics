#!/usr/bin/env bash

# This script launches a web server in current folder on Mac OS X.

# Go to starting folder
currentdir="`dirname \"$0\"`"
cd "$currentdir" || exit 1

# Open browser
open "http://localhost:8000/"

# Start server
python -m SimpleHTTPServer
