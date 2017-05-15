var mongoose = require("mongoose");

var arTemplateSchema = mongoose.Schema({
	templateDesc : String,
	sendgridId: String,
	isDefault: { type: Boolean, default: true },
	autosend: { type: Boolean, default: false },
	autoresolve: { type: Boolean, default: false },
	archive: { type: Boolean, default: false },
	html: String
});

module.exports = mongoose.model("arTemplate", arTemplateSchema);
