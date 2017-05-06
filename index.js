/**
 * Created by mikael on 2017-05-06.
 */

/**
 * Create a swagger.json file based on a JSON file that defines the data that is served.
 * Assumes that json-server will serve the data.
 */


console.log("Starting");

let fs = require('fs');

fs.readFile('posts.json', function (e, data) {

  try {
    let jsonData = JSON.parse(data.toString());
    // console.log("Json:", jsonData);


    // Create the data
    let swaggerData = createSwaggerBase();
    for (let restRoot in jsonData) {
      if (jsonData.hasOwnProperty(restRoot)) {
        createSwaggerRoot(swaggerData, restRoot, jsonData[restRoot]);
      }
    }


    // Write out the result
    let stream = fs.createWriteStream('output.json');
    stream.once('open', function (/* fd */) {

      let resultString = JSON.stringify(swaggerData, null, '  ');
      stream.write(resultString);
      stream.end();

    });

  } catch (error) {
    console.error("Error when using file:", error);
  }

});

// --------------------------------------------------------------------
// Helper functions
// --------------------------------------------------------------------

/**
 * Create basic data for the swagger spec.
 * A lot of stuff hardcoded for now.
 * @returns {{swagger: string, info: {title: string, version: string}, consumes: string, produces: string, host: string, schemes: [string,string], paths: {}, definitions: {}}}
 */
function createSwaggerBase() {

  let info = {
    title: "json-server api",
    version: "1.0.0"
  };
  let swagger = {
    "swagger": "2.0",
    "info": info,
    consumes: ["application/json"],
    produces: ["application/json"],
    host: "localhost:3000",
    schemes: ["http", "https"],
    paths: {},
    definitions: {}
  };

  return swagger;
}

//
//
//

/**
 * Create the root path spec and the typedefs for a root with its data
 * @param swaggerData The swagger specification that we are building
 * @param restRootName Root path given
 * @param restRootData The data defined for this path
 */
function createSwaggerRoot(swaggerData, restRootName, restRootData) {
  console.log("Adding :" + restRootName);
  let typeName = restRootName;
  // Simple attempt to move plural namning to singular and to have uppercase typenames
  if (typeName.endsWith('s')) {
    typeName = typeName.substr(0, typeName.length - 1);
  }
  typeName = typeName[0].toUpperCase() + typeName.substr(1, typeName.length - 1);

  let isArray = Array.isArray(restRootData);
  let dataExemplar = isArray ? restRootData[0] : restRootData;
  console.log(typeName + " is array? " + isArray);

  console.log("Typename ", typeName);

  swaggerData.paths["/" + restRootName] = createBasicSpec(isArray, typeName);
  swaggerData.definitions[typeName] = createTypeDef(dataExemplar);

}

// Create basic swagger specification for a given
// data objecct

/**
 * Create the basic specifications for a path where
 * get returns all info and post adds a new element
 * @param isArray
 * @param typeName
 * @returns {{get: {}}}
 */
function createBasicSpec(isArray, typeName) {

  let getSpec = {};
  getSpec.summary = isArray ? `Get all ${typeName}` : `Get the ${typeName}`;
  getSpec.description = isArray
    ? `Get the instances of ${typeName} that matches the search conditions`
    : `Get the one ${typeName}`;
  getSpec.operationId = isArray
    ? 'getall' + typeName
    : 'get' + typeName;

  let respSchema = {};
  if (isArray) {
    respSchema.type = "array";
    respSchema.items = {
      "$ref": `#/definitions/${typeName}`
    }
  } else {
    respSchema["$ref"] = `#/definitions/${typeName}`;
  }

  let responses = {
    "200": {
      "description": isArray
        ? `A list of ${typeName}`
        : `A ${typeName}`,
      "schema": respSchema
    }
  };

  getSpec.responses = responses;
  return {"get": getSpec};

}


// Create a type specification for returning the data
function createTypeDef(typeExemplar) {
  let typeDef = {
    "type": "object",
    properties: {}
  };

  for (let propertyExpemplar in typeExemplar) {
    let dataExemplar = typeExemplar[propertyExpemplar];
    console.log(propertyExpemplar + " ---> " + dataExemplar + ":" + typeof(dataExemplar))
  }
  return typeDef;
}

