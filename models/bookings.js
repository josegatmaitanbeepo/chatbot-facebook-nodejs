var mongoose = require("mongoose");

var bookingSchema = mongoose.Schema({
	firstName : String,
	lastName : String,
	email: String,
	phone: String,
	bookingType: String,
	dateFm: String,
	dateTo: String,
	property: {
		type: mongoose.Schema.Types.ObjectId,
		default: null,
		ref: "Property"
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		default: null,
		ref: "User"
	},
	conversation: {
		type: mongoose.Schema.Types.ObjectId,
		default: null,
		ref: "Conversation"
	},
	contact: {
		type: mongoose.Schema.Types.ObjectId,
		default: null,
		ref: "Contact"
	}
});

module.exports = mongoose.model("Bookings", bookingSchema);
