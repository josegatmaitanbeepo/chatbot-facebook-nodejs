var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({

	oauthID: Number,
	username: String,
	firstName: String,
	lastName: String,
	email: String,
	phone: String,
	profileImageURL: String,
	emailFooter: String,
	emailNotifs: {
		type: Boolean,
		default: true
	},
	notifications: [{
		isRead: {
			type: Boolean,
			default: false
		},
		isReadDate: Date,
		dateCreated: {
			type: Date,
			default: Date.now
		},
		notifType: String,
		notifTypeReference: mongoose.Schema.Types.ObjectId,
		notifBriefDetails: mongoose.Schema.Types.Mixed
	}],
	isAdmin: {
		type: Boolean,
		default: false
	},
	isSupportAdmin: {
		type: Boolean,
		default: false
	},
	account: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Account"
	},
	created: {
		type: Date,
		default: Date.now
	},
	aiMode: {
		type: Number,
		default: 1
	},
	intentARTemplates: [{
		intent:{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Intent"
		},
		arTemplate: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "userTemplate"
		}
	}],
	appointmentSettings: {
		minTime: {
			type: Number,
			default: 30
		},
		appointmentDuration: {
			type: Number,
			default: 30
		},
		appointmentInterval: {
			type: Number,
			default: 30
		},
		googleCalendar: Boolean,
		googleAccessTokens: {
			type: mongoose.Schema.Types.Mixed,
			default: {}
		},
		appointmentDays: [{
			aptST: Number,
			aptType: String,
			aptDay: String,
			aptTimeStart: String,
			aptTimeEnd: String,
			aptBreaks: [{
				bfm: {
					type: String
				},
				bto: {
					type: String
				}
			}]
		}]
	},
	socket: String,
	lastLogin: Date
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
