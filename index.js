/**
 * Created by mikael on 2017-05-06.
 */

/**
 * Create a swagger.json file based on a JSON file that defines the data that is served.
 * Assumes that json-server will serve the data.
 */



const fs = require('fs');
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
  {name: "host", type: String, defaultValue: "localhost:3000"},
  {name: "input", alias: "i", type: String, defaultValue: "db.json"},
  {name: "output", alias: "o", type: String, defaultValue: "swagger.json"}
];

let options = {
  host: "",
  input: "",
  output: ""
};
options = commandLineArgs(optionDefinitions);

console.log("Generating swagger file " + options.output + " from data in " + options.input);


fs.readFile(options.input, function (e, data) {

  try {
    let jsonData = JSON.parse(data.toString());
    // console.log("Json:", jsonData);


    // Create the data
    let swaggerData = createSwaggerBase();
    createTypeDef(swaggerData, "ErrorResponse", {});
    for (let restRoot in jsonData) {
      if (jsonData.hasOwnProperty(restRoot)) {
        createSwaggerForType(swaggerData, restRoot, jsonData[restRoot]);
      }
    }


    // Write out the result
    let stream = fs.createWriteStream(options.output);
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
 * @returns {{swagger: string,
 *    info: {title: string, version: string},
 *    consumes: [string], produces: [string], host: string, schemes: [string,string], paths: {}, definitions: {}}}
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
    host: options.host,
    schemes: ["http"],
    paths: {},
    definitions: {}
  };

  return swagger;
}


/**
 * Create the root path spec and the typedefs for a root with its data
 * @param swaggerData The swagger specification that we are building
 * @param restRootName Root path given
 * @param restRootData The data defined for this path
 */
function createSwaggerForType(swaggerData, restRootName, restRootData) {
  let typeName = restRootName;
  // Simple attempt to move plural naming to singular and to have uppercase type names
  if (typeName.endsWith('s')) {
    typeName = typeName.substr(0, typeName.length - 1);
  }
  typeName = typeName[0].toUpperCase() + typeName.substr(1, typeName.length - 1);

  let isArray = Array.isArray(restRootData);
  let dataExemplar = isArray ? restRootData[0] : restRootData;

  swaggerData.paths["/" + restRootName] = createBasicSpec(isArray, typeName);
  if (isArray) {
    swaggerData.paths["/" + restRootName + "/{id}"] = createIndividualSpec(typeName, dataExemplar);
  }
  // swaggerData.definitions[typeName] = createTypeDef(swaggerData, typeName, dataExemplar);
  createTypeDef(swaggerData, typeName, dataExemplar);
}

/**
 * Define the responses for an individual operation (GET,PUT,PATCH)
 * @param typeName Name of the type that is given in the response
 * @returns {{}} An object usable as a "responses" part in the operation spec
 */
function getResponseForIndividualOp(typeName) {
  let responses = {};
  responses["200"] = {
    description: typeName + " response",
    schema: {
      "$ref": `#/definitions/${typeName}`

    }
  };
  responses["404"] = {
    description: "Not found",
    schema: {
      "$ref": "#/definitions/ErrorResponse"
    }
  };
  return responses;
}

/**
 * Create the 'GET' specification for and individual.
 * The individual will be indexed with 'id' as part of the path
 * @param typeName Name type that is delivered
 * @returns {{}} An object usable as a 'GET' operation within a typeName/{id}
 */
function createIndividualGetSpec(typeName) {
  let result = {};
  result.summary = "Return an individual " + typeName + " with given id";
  result.description = "Return an individual " + typeName + " with given id";
  result.operationId = "get" + typeName + "Individual";
  result.responses = getResponseForIndividualOp(typeName);

  return result;

}

// Put and Patch looks the same, and since json-server don't enforce
// fields on put, don't do it here.
function createIndividualPutOrPatchSpec(kind, typeName) {
  let result = {};
  let baseOp = kind[0] + kind.substr(1, kind.length - 1).toLowerCase();
  let baseId = kind.toLowerCase();
  result.summary = baseOp + " an " + typeName + " with given id";
  result.description = baseOp + " an " + typeName + " with given id";
  result.operationId = baseId + typeName + "Individual";
  result.responses = getResponseForIndividualOp(typeName);

  let dataObject = {};
  dataObject.in = "body";
  dataObject.name = "bodyAdd" + typeName;
  dataObject.description = typeName + " object to be added";
  dataObject.required = true;
  dataObject.schema = {"$ref": "#/definitions/" + typeName};

  result.parameters = [dataObject];
  return result;

}

// TODO: Individual PUT - Take whole object
// TODO: Individual PATCH - Take part, but look the same
// TODO: Individual DELETE

/**
 * Create the specification needed for an individual of the typename.
 * TODO: Don't assume that the id attribute is named 'id'
 * @param typeName
 */
function createIndividualSpec(typeName) {

  let get = createIndividualGetSpec(typeName);
  let patch = createIndividualPutOrPatchSpec("PATCH", typeName);
  let put = createIndividualPutOrPatchSpec("PUT", typeName);

  let idParameter =
    {
      name: "id",
      in: "path",
      description: "Id for " + typeName,
      required: true,
      type: "integer",
      format: "int64"
    };
  let parameters = [idParameter];
  return {
    get,
    patch,
    put,
    parameters
  }


}

// Create basic swagger specification for a given
// data object

function createRootGetSpecification(isArray, typeName) {
  let getSpec = {};
  let respSchema = {};

  getSpec.summary = isArray ? `Get all ${typeName}s` : `Get the ${typeName}`;
  getSpec.description = isArray
    ? `Get the instances of ${typeName} that matches the search conditions`
    : `Get the one ${typeName}`;
  getSpec.operationId = isArray
    ? 'getall' + typeName
    : 'get' + typeName;


  if (isArray) {
    respSchema.type = "array";
    respSchema.items = {
      "$ref": `#/definitions/${typeName}`
    }
  }
  else {
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
  return getSpec;
}


function createRootPostSpecification(typeName) {
  let postSpec = {};
  let respSchema = {};
  let postObject = {};
  postSpec.summary = `Post a new ${typeName}`;
  postSpec.description = `Add a new ${typeName}`;
  postSpec.operationId = "post" + typeName;

  postObject.in = "body";
  postObject.name = "bodyAdd" + typeName;
  postObject.description = typeName + " object to be added";
  postObject.required = true;
  postObject.schema = {"$ref": "#/definitions/" + typeName};

  respSchema["$ref"] = `#/definitions/${typeName}`;
  let responses = {
    "200": {
      "description": "The added pet",
      "schema": respSchema
    }
  };
  postSpec.parameters = [postObject];
  postSpec.responses = responses;
  return postSpec;

}


/**
 * Create the basic specifications for a path where
 * get returns all info and post adds a new element
 * @param isArray
 * @param typeName
 * @returns {{get: {}}}
 */
function createBasicSpec(isArray, typeName) {
  let getSpec = createRootGetSpecification(isArray, typeName);
  let postSpec = createRootPostSpecification(typeName);
  return {
    "get": getSpec,
    "post": postSpec
  };

}


function createPropertiesForType(swaggerData, typeName, typeExemplar, includeId) {
  let properties = {};

  for (let propertyExemplar in typeExemplar) {
    if (propertyExemplar === "id" && !includeId) continue;
    let dataExemplar = typeExemplar[propertyExemplar];
    let dataType = typeof(dataExemplar);
    // let swaggerType = dataType;
    if (dataType === "object") {
      let localType = propertyExemplar[0].toUpperCase() + propertyExemplar.substr(1, propertyExemplar.length - 1);
      let newTypeName = typeName + localType;
      console.info("Generating nested typedef for " + newTypeName, dataExemplar);
      createTypeDef(swaggerData, newTypeName, dataExemplar);
      properties[propertyExemplar] = {
        "$ref": "#/definitions/" + newTypeName
      }
    }
    else if (dataType === "number") {
      if (Number.isInteger(dataExemplar)) {
        properties[propertyExemplar] = {
          "type": "integer",
          "format": "int64"
        };
        // swaggerType = "integer";
      }
      else {
        properties[propertyExemplar] = {
          "type": "number",
          "format": "double"
        }
      }
    }
    else if (dataType === "string") {
      properties[propertyExemplar] = {
        "type": "string"
      };
    }
    else {
      console.warn("Unhandled type for " + propertyExemplar + " " + typeof(propertyExemplar));
    }
  }
  return properties;


}


// Create a type specification for returning the data
function createTypeDef(swaggerData, typeName, typeExemplar) {
  let typeDef = {
    "type": "object",
    properties: createPropertiesForType(swaggerData, typeName, typeExemplar, true)
  };

  swaggerData.definitions[typeName] = typeDef;

  return typeDef;
}

