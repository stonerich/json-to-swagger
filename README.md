# json-to-swagger
Generates a swagger 2.0 (open-api) specification from a json file with exemplar data.
This is done with javascript meant to be run on node.

The swagger definition is meant to be usable when using the json-server, 
https://github.com/typicode/json-server, but might also be usable as a starting point for swagger specifications for other servers.

Current status = Alpha. Only generate 'get' and 'post' for the root paths in the examplar data.

The json exemplar file is per default assumed to be in "db.json" and output is created in "swagger.json".
The swagger file has a default host of "localhost:3000". All of those can be set with the --input, --output and --host command line parameters respectively.

All code is for the moment in the index.js file. It uses the 'command-line-args' node module to parse the command line.




