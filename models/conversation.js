var mongoose = require("mongoose");

var conversationSchema = new mongoose.Schema({

	subject: String,
	from: String, 
	read: { type: Boolean, default: false },
	requiresUser: { type: Boolean, default: false },
	resolved:{ type: Boolean, default: false },
	archive:{ type: Boolean, default: false },
	date: { type: Date, default: Date.now },
	initialResponse: Date,
	sourceName: String, 
	linkedConvId: String,
	sourceAddress: String, 
	sourceMessageID: String, 
	intents: {},
	messages: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Message"
	}],
	user: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}],
	account: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Account"
	},
	properties: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Property"
	}],
	contacts: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Contact"
	}],
	email: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Email"
	}],
	events: []

});

module.exports = mongoose.model("Conversation", conversationSchema);
