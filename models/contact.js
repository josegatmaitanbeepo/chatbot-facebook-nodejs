var mongoose = require("mongoose");

var contactSchema = mongoose.Schema({
	firstName : String,
	lastName : String,
	email: String,
	phone: String,
	account: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Account"
	}],
	user: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}]
});

module.exports = mongoose.model("Contact", contactSchema);
