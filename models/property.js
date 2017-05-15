var mongoose = require("mongoose");

var propertySchema = mongoose.Schema(
	{
		sourceID : String,
		createdDate: {
				type: Date,
				default: Date.now
			},
		sourceLastModDate: Date,
		sourceObject: {},
		status: String,
		archive:{ type: Boolean, default: false },
		autoresponse:{ type: Boolean, default: true },
		isListing: { type: Boolean, default: false },
		isRental: { type: Boolean, default: false },
		listingType: String,
		saleMethod: String,
		propertytype: String,
		subNumber: String,
		streetNumber: String,
		streetName: String,
		suburb: String,
		state: String,
		postcode: String,
		country: String,
		pricetext: String,
		auctiondate: Date,
		owner: {
					type: mongoose.Schema.Types.ObjectId,
					default: null,
					ref: "Contact"
				},
		rentalData : {
			rentalStatus: String,
			lastUpdated: Date,
			rentPaidToDate: Date,
			lastRentPaymentDate: Date,
			leaseStartDate: Date,
			leaseEndDate: Date,
			availableDate: Date,
			petsAllowed: { type: Boolean, default: false },
			currentRent: Number,
			tenantPaymentRef: String,
			arrearsDays: Number,
			arrearsValue: Number,
			tenant: {
					type: mongoose.Schema.Types.ObjectId,
					default: null,
					ref: "Contact"
				},
			propertyManager: {
			   type: mongoose.Schema.Types.ObjectId,
			   default: null,
			   ref: "User"
			  },
			maintManager: {
			   type: mongoose.Schema.Types.ObjectId,
			   default: null,
			   ref: "User"
			},
			inspections: [
				{
					type: String,
					date: Date,
					user: {
						type: mongoose.Schema.Types.ObjectId,
						default: null,
						ref: "User"
					},
					docs: [{
							docType: String,
							fileName: String,
							fileType: String,
							fileURL: String,
							dateUploaded: {
								type: Date,
								default: Date.now
							}
						}]
					}
				]
		},
		upDocs: [{
			docType: String,
			fileName: String,
			fileType: String,
			fileURL: String,
			dateUploaded: {
				type: Date,
				default: Date.now
			}
		}],
		user: [{
		  _id: {
		   type: mongoose.Schema.Types.ObjectId,
		   default: null,
		   ref: "User"
		  },
		  isPrimary: {
		   type: Boolean,
		   default: false
		  }
		 }],
		agent: {
			email: String,
			firstName: String,
			lastName: String,
			agentId: Number,
			mobile: String
		},
		inspections: [
			{
				openDate: Date,
				closeDate: Date,
				appointment: Boolean,
				inspectId: Number,
				agentEmail: String,
				agentId: Number,
				contact: [{
					type: mongoose.Schema.Types.ObjectId,
					default: null,
					ref: "Contact"
				}],
				user: {
					 type: mongoose.Schema.Types.ObjectId,
					 ref: "User",
					 default: null
				  }
			}
		],
		appointmentSettings: {
			allowPrivateInspections: {
				type: Boolean(),
				default: false
			},
			minLeadTimeHrs: {
				type: Number,
				default: 36
			},
			appointmentDays: [{
				aptST: Number,
				aptType: String,
				aptDayActive: Boolean,
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
		account: 
		  {
			 type: mongoose.Schema.Types.ObjectId,
			 ref: "Account"
		  }
	}
);


module.exports = mongoose.model("Property", propertySchema);
