#!/bin/bash

# Count number of TypeScript files in the project using cloc
cloc --include-lang=TypeScript --exclude-dir=node_modules . | awk '/TypeScript/ {print "TypeScript files:", $5}'
