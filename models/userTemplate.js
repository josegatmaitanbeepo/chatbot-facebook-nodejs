var mongoose = require("mongoose");

var userTemplateSchema = mongoose.Schema({
	templateDesc : String,
	autosend: { type: Boolean, default: false },
	autoresolve: { type: Boolean, default: false },
	archive: { type: Boolean, default: false },
	html: String,
	account: 
	  {
		 type: mongoose.Schema.Types.ObjectId,
		 ref: "Account"
	  }
	,
	user: 
	  {
		 type: mongoose.Schema.Types.ObjectId,
		 ref: "User"
	  }
	, propertyDocs: {
		cma: { type: Boolean, default: false },
		contract: { type: Boolean, default: false },
		lease: { type: Boolean, default: false },
		application: { type: Boolean, default: false }
	}
});

module.exports = mongoose.model("userTemplate", userTemplateSchema);
