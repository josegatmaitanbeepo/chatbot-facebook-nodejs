var mongoose = require("mongoose");

var mergeFieldsSchema = mongoose.Schema({
	mergeField : String,
	dataDesc: String,
	dataField: String,
	exampleData: String
});

module.exports = mongoose.model("mergeFields", mergeFieldsSchema);
