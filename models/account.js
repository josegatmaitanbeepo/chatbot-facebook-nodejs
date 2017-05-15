var mongoose = require("mongoose");

var accountSchema = new mongoose.Schema({
	accountName: String,
	companyName: String,
	companyLogo: {
		_id: mongoose.Schema.Types.ObjectId,
		fileName: String,
		fileLink: String,
		fileType: String,
		dateUploaded: {
			type: Date,
			default: Date.now
		}
	},
	streetAddress: String,
	citySuburb: String,
	state: String,
	postcode: String,
	email: String,
	user: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
	],
	arTemplates: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "arTemplate"
		}
	],	
	initialRespTarget: { type: Number, default: 60 },
	resolutionTarget: { type: Number, default: 1440 },
	idleTarget: { type: Number, default: 1440 },
	slaAutoResponse: { type: Boolean, default: false },
	mydesktopAPIKey: String,
	ireURL: String,
	ireId: String,
	active: { type: Boolean, default: true},
	created: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Account", accountSchema);
