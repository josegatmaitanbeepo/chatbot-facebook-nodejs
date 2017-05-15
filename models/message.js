var mongoose = require("mongoose");

var messageSchema = mongoose.Schema({
	attachments: [{
		fileName: String,
		fileType: String,
		dateUploaded: {
			type: Date,
			default: Date.now
		}
	}],
	text: String,
	from: String,
	html: String,
	draft: {
		type: Boolean,
		default: false
	},
	sg_message_id: String,
	isAiResponse: {
		type: Boolean,
		default: false
	},
	msg_type: String,
	isReply: {
		type: Boolean,
		default: false
	},
	msg_events: [],
	dialog_node: {},
	date: {
		type: Date,
		default: Date.now
	},
	user: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}], 
	aiResponse: {}
});

module.exports = mongoose.model("Message", messageSchema);
